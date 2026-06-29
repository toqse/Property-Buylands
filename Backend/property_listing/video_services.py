"""
Reusable video validation, compression, thumbnail, and S3 replacement services.

Used by Property and Advertisement models and Celery background workers.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from typing import TYPE_CHECKING

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from property_listing.video_constants import (
    EXTENSION_TO_MIME,
    VIDEO_ALLOWED_EXTENSIONS,
    VIDEO_ALLOWED_MIME_TYPES,
    VIDEO_MAX_BYTES,
    VIDEO_MAX_DURATION_SECONDS,
)

if TYPE_CHECKING:
    from django.db.models import Model

logger = logging.getLogger(__name__)

_FFMPEG_CANDIDATES = (
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/bin/ffmpeg",
)

_FFPROBE_CANDIDATES = (
    "/usr/bin/ffprobe",
    "/usr/local/bin/ffprobe",
    "/bin/ffprobe",
)


def resolve_ffmpeg_binary() -> str | None:
    configured = getattr(settings, "FFMPEG_BINARY", None) or os.getenv("FFMPEG_BINARY")
    if configured:
        path = configured.strip()
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
        logger.warning("Configured FFMPEG_BINARY is not executable: %s", path)

    found = shutil.which("ffmpeg")
    if found:
        return found

    for candidate in _FFMPEG_CANDIDATES:
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate

    return None


def resolve_ffprobe_binary() -> str | None:
    configured = getattr(settings, "FFPROBE_BINARY", None) or os.getenv("FFPROBE_BINARY")
    if configured:
        path = configured.strip()
        if os.path.isfile(path) and os.access(path, os.X_OK):
            return path
        logger.warning("Configured FFPROBE_BINARY is not executable: %s", path)

    found = shutil.which("ffprobe")
    if found:
        return found

    for candidate in _FFPROBE_CANDIDATES:
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate

    return None


def _ensure_ffmpeg_available() -> str:
    binary = resolve_ffmpeg_binary()
    if binary:
        return binary
    raise ValidationError("ffmpeg not installed on server.")


def _upload_extension(upload) -> str:
    name = getattr(upload, "name", "") or ""
    ext = os.path.splitext(name)[1].lstrip(".").lower()
    return ext


def _upload_mime_type(upload) -> str:
    content_type = getattr(upload, "content_type", None)
    if content_type:
        return content_type.split(";")[0].strip().lower()

    ext = _upload_extension(upload)
    if ext in EXTENSION_TO_MIME:
        return EXTENSION_TO_MIME[ext]

    return ""


def get_video_duration_seconds(input_path: str) -> float | None:
    ffprobe = resolve_ffprobe_binary()
    if not ffprobe:
        logger.warning("ffprobe not installed; skipping duration validation.")
        return None

    cmd = [
        ffprobe,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        input_path,
    ]
    completed = subprocess.run(cmd, capture_output=True, check=False, text=True)
    if completed.returncode != 0:
        err = (completed.stderr or completed.stdout or "").strip()
        raise ValidationError(f"Could not read video duration: {err[:300] or 'ffprobe error'}")

    raw = (completed.stdout or "").strip()
    try:
        return float(raw)
    except ValueError:
        raise ValidationError("Could not determine video duration.")


def _materialize_upload_to_temp(upload) -> tuple[str, bool]:
    if not upload:
        return "", False

    try:
        path = upload.path
        if path and os.path.exists(path):
            return path, False
    except (ValueError, AttributeError, NotImplementedError):
        pass

    input_suffix = os.path.splitext(getattr(upload, "name", ""))[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=input_suffix) as in_tmp:
        input_path = in_tmp.name
        if hasattr(upload, "chunks"):
            for chunk in upload.chunks():
                in_tmp.write(chunk)
        elif hasattr(upload, "read"):
            in_tmp.write(upload.read())
        elif hasattr(upload, "open"):
            src = upload.open("rb")
            try:
                shutil.copyfileobj(src, in_tmp)
            finally:
                if hasattr(upload, "seek"):
                    try:
                        upload.seek(0)
                    except (ValueError, OSError):
                        pass

    return input_path, True


def _rewind_upload(upload) -> None:
    if hasattr(upload, "seek"):
        try:
            upload.seek(0)
        except (ValueError, OSError):
            pass


def prepare_video_upload(upload):
    """
    Validate a new video upload and return a file object safe for storage.

    For large TemporaryUploadedFile uploads, ffprobe runs on the on-disk temp
    path and the original upload is rewound — no full-file memory copy.
    """
    if not upload:
        raise ValidationError("No video file provided.")

    ext = _upload_extension(upload)
    if ext not in VIDEO_ALLOWED_EXTENSIONS:
        allowed = ", ".join(VIDEO_ALLOWED_EXTENSIONS)
        raise ValidationError(f"Unsupported video format. Allowed extensions: {allowed}.")

    mime = _upload_mime_type(upload)
    if mime and mime not in VIDEO_ALLOWED_MIME_TYPES:
        raise ValidationError(f"Unsupported video MIME type: {mime}.")

    size = getattr(upload, "size", None)
    if size is not None and size > VIDEO_MAX_BYTES:
        raise ValidationError("Video file must be 80 MB or smaller.")

    input_path, delete_input = _materialize_upload_to_temp(upload)
    if not input_path:
        raise ValidationError("Could not read video file.")

    try:
        duration = get_video_duration_seconds(input_path)
        if duration is not None and duration > VIDEO_MAX_DURATION_SECONDS:
            raise ValidationError(
                f"Video must be {VIDEO_MAX_DURATION_SECONDS} seconds or shorter."
            )

        if not delete_input:
            _rewind_upload(upload)
            return upload

        original_name = getattr(upload, "name", "video.mp4") or "video.mp4"
        with open(input_path, "rb") as fh:
            return ContentFile(fh.read(), name=original_name)
    finally:
        if delete_input and input_path and os.path.exists(input_path):
            try:
                os.remove(input_path)
            except OSError:
                pass


def validate_video(upload) -> None:
    """Validate extension, MIME type, file size, and duration before accepting an upload."""
    prepare_video_upload(upload)


def compress_video(input_path: str, output_path: str) -> None:
    """Re-encode a video file on disk to H.264/AAC MP4 (720p max)."""
    ffmpeg = _ensure_ffmpeg_available()
    cmd = [
        ffmpeg,
        "-y",
        "-threads",
        "0",
        "-i",
        input_path,
        "-vf",
        "scale='min(1280,iw)':-2",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "30",
        "-c:a",
        "aac",
        "-b:a",
        "64k",
        "-movflags",
        "+faststart",
        output_path,
    ]
    completed = subprocess.run(cmd, capture_output=True, check=False, text=True)
    if completed.returncode != 0:
        err = (completed.stderr or completed.stdout or "").strip()
        raise ValidationError(f"Video compression failed: {err[:500] or 'ffmpeg error'}")


def _run_ffmpeg_thumbnail(
    ffmpeg: str, input_path: str, output_path: str, capture_at: str
) -> bool:
    cmd = [
        ffmpeg,
        "-y",
        "-ss",
        capture_at,
        "-i",
        input_path,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        "-vf",
        "scale='min(1280,iw)':-2",
        output_path,
    ]
    completed = subprocess.run(cmd, capture_output=True, check=False, text=True)
    if completed.returncode != 0:
        logger.warning(
            "ffmpeg thumbnail failed at %s: %s",
            capture_at,
            (completed.stderr or completed.stdout or "")[:300],
        )
        return False
    return os.path.exists(output_path) and os.path.getsize(output_path) > 0


def generate_video_thumbnail(
    upload_or_path,
    *,
    capture_at: str = "00:00:01",
    output_path: str | None = None,
) -> ContentFile | None:
    """
    Extract a JPEG thumbnail from a video upload, stored FieldFile, or local path.
    Returns ContentFile when output_path is None; otherwise writes to output_path and returns None.
    """
    if not upload_or_path:
        return None

    logger.info("Thumbnail generation started")
    ffmpeg = resolve_ffmpeg_binary()
    if not ffmpeg:
        logger.warning("ffmpeg not installed; skipping video thumbnail generation.")
        return None

    delete_input = False
    if isinstance(upload_or_path, str):
        input_path = upload_or_path
    else:
        input_path, delete_input = _materialize_upload_to_temp(upload_or_path)

    if not input_path:
        return None

    own_output = output_path is None
    if own_output:
        out_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
        output_path = out_tmp.name
        out_tmp.close()

    try:
        ok = _run_ffmpeg_thumbnail(ffmpeg, input_path, output_path, capture_at)
        if not ok and capture_at != "00:00:00":
            ok = _run_ffmpeg_thumbnail(ffmpeg, input_path, output_path, "00:00:00")
        if not ok:
            return None

        logger.info("Thumbnail generation completed")
        if not own_output:
            return None

        with open(output_path, "rb") as fh:
            data = fh.read()
        original_name = (
            upload_or_path
            if isinstance(upload_or_path, str)
            else (getattr(upload_or_path, "name", "video") or "video")
        )
        if isinstance(original_name, str) and os.path.sep in original_name:
            original_name = os.path.basename(original_name)
        stem = (
            original_name.rsplit(".", 1)[0][:80]
            if "." in original_name
            else original_name[:80]
        )
        filename = f"{stem}_thumb_{uuid.uuid4().hex[:8]}.jpg"
        return ContentFile(data, name=filename)
    except Exception:
        logger.exception("Video thumbnail generation failed")
        return None
    finally:
        if delete_input and input_path and os.path.exists(input_path):
            try:
                os.remove(input_path)
            except OSError:
                pass
        if own_output and output_path and os.path.exists(output_path):
            try:
                os.remove(output_path)
            except OSError:
                pass


def _compressed_video_filename(original_name: str) -> str:
    stem = original_name.rsplit(".", 1)[0][:80] if "." in original_name else original_name[:80]
    if os.path.sep in stem:
        stem = os.path.basename(stem)
    return f"{stem}_{uuid.uuid4().hex[:8]}.mp4"


def replace_s3_video(
    instance: Model,
    *,
    video_field: str,
    thumbnail_field: str,
    compressed_path: str,
    thumbnail_content: ContentFile | None,
) -> None:
    """
    Replace the stored video with the compressed file, upload thumbnail, and delete the original.
    """
    video_file = getattr(instance, video_field)
    if not video_file:
        raise ValidationError("No video file on instance.")

    original_name = video_file.name
    logger.info("S3 upload started for %s", type(instance).__name__)

    with open(compressed_path, "rb") as fh:
        compressed_data = fh.read()

    compressed_name = _compressed_video_filename(os.path.basename(original_name or "video.mp4"))
    getattr(instance, video_field).save(
        compressed_name,
        ContentFile(compressed_data, name=compressed_name),
        save=False,
    )

    if thumbnail_content is not None:
        thumb_name = thumbnail_content.name
        getattr(instance, thumbnail_field).save(
            thumb_name,
            thumbnail_content,
            save=False,
        )

    instance.save(update_fields=[video_field, thumbnail_field])

    if original_name and original_name != getattr(instance, video_field).name:
        try:
            default_storage.delete(original_name)
        except Exception:
            logger.exception("Failed to delete original video: %s", original_name)

    logger.info("S3 upload completed for %s", type(instance).__name__)


def queue_video_processing(kind: str, object_id: int) -> None:
    """Enqueue a background Celery task for property or advertisement video processing."""
    from property_listing.tasks import (
        process_advertisement_video,
        process_property_video,
    )

    try:
        if kind == "property":
            process_property_video.delay(object_id)
        elif kind == "advertisement":
            process_advertisement_video.delay(object_id)
        else:
            raise ValueError(f"Unknown video processing kind: {kind}")
    except Exception:
        logger.exception(
            "Failed to queue %s video processing for id=%s; is Redis/Celery running?",
            kind,
            object_id,
        )


def process_stored_video(
    instance: Model,
    *,
    video_field: str,
    thumbnail_field: str,
    status_field: str,
    thumbnail_compressor,
) -> None:
    """
    Full background pipeline: download → compress → thumbnail → S3 replace → update status.
    """
    from property_listing.video_constants import VIDEO_READY

    started = time.monotonic()
    video_file = getattr(instance, video_field)
    if not video_file:
        logger.warning("No video to process on %s pk=%s", type(instance).__name__, instance.pk)
        return

    input_path, delete_input = _materialize_upload_to_temp(video_file)
    if not input_path:
        raise ValidationError("Could not download video for processing.")

    compressed_path = ""
    thumb_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as out_tmp:
            compressed_path = out_tmp.name

        logger.info("Compression started for %s pk=%s", type(instance).__name__, instance.pk)
        compress_video(input_path, compressed_path)
        logger.info("Compression completed for %s pk=%s", type(instance).__name__, instance.pk)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as thumb_tmp:
            thumb_path = thumb_tmp.name

        logger.info("Thumbnail started for %s pk=%s", type(instance).__name__, instance.pk)
        generate_video_thumbnail(input_path, capture_at="00:00:01", output_path=thumb_path)
        logger.info("Thumbnail completed for %s pk=%s", type(instance).__name__, instance.pk)

        thumb_content = None
        if os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
            with open(thumb_path, "rb") as fh:
                thumb_content = thumbnail_compressor(ContentFile(fh.read(), name="thumb.jpg"))

        replace_s3_video(
            instance,
            video_field=video_field,
            thumbnail_field=thumbnail_field,
            compressed_path=compressed_path,
            thumbnail_content=thumb_content,
        )

        setattr(instance, status_field, VIDEO_READY)
        instance.save(update_fields=[status_field])

        elapsed = time.monotonic() - started
        logger.info(
            "Total processing time for %s pk=%s: %.2fs",
            type(instance).__name__,
            instance.pk,
            elapsed,
        )
    finally:
        for path in (input_path if delete_input else None, compressed_path, thumb_path):
            try:
                if path and os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass
