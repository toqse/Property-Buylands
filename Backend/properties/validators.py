from django.core.exceptions import ValidationError

from .image_utils import PROPERTY_IMAGE_MAX_BYTES

PROPERTY_VIDEO_MAX_BYTES = 100 * 1024 * 1024


def validate_property_video_file_size(upload):
    if not upload:
        return
    if upload.size > PROPERTY_VIDEO_MAX_BYTES:
        raise ValidationError("Video file must be 100 MB or smaller.")


def validate_property_image_max_size(upload):
    """Safety check after compression; stored file must be within cap."""
    if not upload:
        return
    if hasattr(upload, "size") and upload.size > PROPERTY_IMAGE_MAX_BYTES:
        raise ValidationError("Image could not be optimized to 300 KB.")
