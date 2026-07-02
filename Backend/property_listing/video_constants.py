"""Shared constants for property and advertisement video processing."""

VIDEO_MAX_BYTES = 80 * 1024 * 1024
VIDEO_MAX_DURATION_SECONDS = 100

VIDEO_ALLOWED_EXTENSIONS = (
    "mp4",
    "mov",
    "avi",
    "mkv",
    "webm",
    "m4v",
    "3gp",
)

VIDEO_ALLOWED_MIME_TYPES = frozenset(
    {
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-matroska",
        "video/webm",
        "video/x-m4v",
        "video/3gpp",
    }
)

VIDEO_PROCESSING = "processing"
VIDEO_READY = "ready"
VIDEO_FAILED = "failed"

VIDEO_PROCESSING_STATUS_CHOICES = [
    (VIDEO_PROCESSING, "Processing"),
    (VIDEO_READY, "Ready"),
    (VIDEO_FAILED, "Failed"),
]

EXTENSION_TO_MIME = {
    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "avi": "video/x-msvideo",
    "mkv": "video/x-matroska",
    "webm": "video/webm",
    "m4v": "video/x-m4v",
    "3gp": "video/3gpp",
}
