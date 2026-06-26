import logging
import os
import shutil
import subprocess
import tempfile
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

_FFMPEG_CANDIDATES = (
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/bin/ffmpeg",
)


def resolve_ffmpeg_binary() -> str | None:
    """
    Locate the ffmpeg executable.

    Gunicorn/systemd often run with a minimal PATH that omits /usr/bin, so
    shutil.which alone can fail even when ffmpeg is installed.
    """
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


def _ensure_ffmpeg_available() -> str:
    binary = resolve_ffmpeg_binary()
    if binary:
        return binary
    raise ValidationError("ffmpeg not installed on server.")


def compress_ad_video(upload) -> ContentFile:
    if not upload:
        raise ValidationError("No video file provided.")

    ffmpeg = _ensure_ffmpeg_available()
    logger.info("Video compression started")

    input_suffix = os.path.splitext(getattr(upload, "name", ""))[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=input_suffix) as in_tmp:
        input_path = in_tmp.name
        for chunk in upload.chunks():
            in_tmp.write(chunk)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as out_tmp:
        output_path = out_tmp.name

    cmd = [
        ffmpeg,
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
        logger.info("Running ffmpeg...")
        completed = subprocess.run(cmd, capture_output=True, check=False, text=True)
        logger.info("ffmpeg finished")
        if completed.returncode != 0:
            err = (completed.stderr or completed.stdout or "").strip()
            raise ValidationError(f"Video compression failed: {err[:500] or 'ffmpeg error'}")
        logger.info("Reading compressed file")
        with open(output_path, "rb") as fh:
            data = fh.read()
        original_name = getattr(upload, "name", "video") or "video"
        stem = original_name.rsplit(".", 1)[0][:80] if "." in original_name else original_name[:80]
        filename = f"{stem}_{uuid.uuid4().hex[:8]}.mp4"
        logger.info("Compression complete")
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
    Uses on-disk FieldFile.path when the storage backend supports it;
    otherwise downloads bytes to a temp file (e.g. S3).
    """
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
        if hasattr(upload, "open"):
            with upload.open("rb") as src:
                shutil.copyfileobj(src, in_tmp)
        elif hasattr(upload, "chunks"):
            for chunk in upload.chunks():
                in_tmp.write(chunk)
        elif hasattr(upload, "read"):
            in_tmp.write(upload.read())
    return input_path, True


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


def generate_video_thumbnail(upload, *, capture_at: str = "00:00:01") -> ContentFile | None:
    """
    Extract a single JPEG frame from a video upload or stored FieldFile.
    Returns None on failure (best-effort; does not raise).
    """
    if not upload:
        return None
    logger.info("Thumbnail generation started")
    ffmpeg = resolve_ffmpeg_binary()
    if not ffmpeg:
        logger.warning("ffmpeg not installed; skipping video thumbnail generation.")
        return None

    input_path, delete_input = _materialize_video_to_temp(upload)
    if not input_path:
        return None

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as out_tmp:
        output_path = out_tmp.name

    try:
        logger.info("Running thumbnail ffmpeg...")
        ok = _run_ffmpeg_thumbnail(ffmpeg, input_path, output_path, capture_at)
        logger.info("Thumbnail generated")
        if not ok and capture_at != "00:00:00":
            ok = _run_ffmpeg_thumbnail(ffmpeg, input_path, output_path, "00:00:00")
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

