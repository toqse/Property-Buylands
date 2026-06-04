import logging
import os
import shutil
import subprocess
import tempfile
import uuid

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


def _ensure_ffmpeg_available():
    if shutil.which("ffmpeg"):
        return
    raise ValidationError("ffmpeg not installed on server.")


def compress_ad_video(upload) -> ContentFile:
    if not upload:
        raise ValidationError("No video file provided.")

    _ensure_ffmpeg_available()

    input_suffix = os.path.splitext(getattr(upload, "name", ""))[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=input_suffix) as in_tmp:
        input_path = in_tmp.name
        for chunk in upload.chunks():
            in_tmp.write(chunk)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as out_tmp:
        output_path = out_tmp.name

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-vf",
        "scale='min(1280,iw)':-2",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "28",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        output_path,
    ]

    try:
        completed = subprocess.run(cmd, capture_output=True, check=False, text=True)
        if completed.returncode != 0:
            err = (completed.stderr or completed.stdout or "").strip()
            raise ValidationError(f"Video compression failed: {err[:500] or 'ffmpeg error'}")
        with open(output_path, "rb") as fh:
            data = fh.read()
        original_name = getattr(upload, "name", "video") or "video"
        stem = original_name.rsplit(".", 1)[0][:80] if "." in original_name else original_name[:80]
        filename = f"{stem}_{uuid.uuid4().hex[:8]}.mp4"
        return ContentFile(data, name=filename)
    finally:
        for path in (input_path, output_path):
            try:
                if path and os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass


def _materialize_video_to_temp(upload) -> tuple[str, bool]:
    """
    Return (path, should_delete) for ffmpeg input.
    Uses on-disk FieldFile.path when available; otherwise writes upload bytes to a temp file.
    """
    if not upload:
        return "", False
    try:
        path = getattr(upload, "path", None)
        if path and os.path.exists(path):
            return path, False
    except (ValueError, AttributeError):
        pass

    input_suffix = os.path.splitext(getattr(upload, "name", ""))[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=input_suffix) as in_tmp:
        input_path = in_tmp.name
        if hasattr(upload, "chunks"):
            for chunk in upload.chunks():
                in_tmp.write(chunk)
        elif hasattr(upload, "read"):
            in_tmp.write(upload.read())
    return input_path, True


def _run_ffmpeg_thumbnail(input_path: str, output_path: str, capture_at: str) -> bool:
    cmd = [
        "ffmpeg",
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


def generate_video_thumbnail(upload, *, capture_at: str = "00:00:01") -> ContentFile | None:
    """
    Extract a single JPEG frame from a video upload or stored FieldFile.
    Returns None on failure (best-effort; does not raise).
    """
    if not upload:
        return None
    if not shutil.which("ffmpeg"):
        logger.warning("ffmpeg not installed; skipping video thumbnail generation.")
        return None

    input_path, delete_input = _materialize_video_to_temp(upload)
    if not input_path:
        return None

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as out_tmp:
        output_path = out_tmp.name

    try:
        ok = _run_ffmpeg_thumbnail(input_path, output_path, capture_at)
        if not ok and capture_at != "00:00:00":
            ok = _run_ffmpeg_thumbnail(input_path, output_path, "00:00:00")
        if not ok:
            return None
        with open(output_path, "rb") as fh:
            data = fh.read()
        original_name = getattr(upload, "name", "video") or "video"
        stem = original_name.rsplit(".", 1)[0][:80] if "." in original_name else original_name[:80]
        filename = f"{stem}_thumb_{uuid.uuid4().hex[:8]}.jpg"
        return ContentFile(data, name=filename)
    except Exception:
        logger.exception("Video thumbnail generation failed")
        return None
    finally:
        for path in (input_path if delete_input else None, output_path):
            try:
                if path and os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass

