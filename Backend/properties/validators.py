from django.core.exceptions import ValidationError

from property_listing.video_constants import VIDEO_MAX_BYTES

from .image_utils import CATEGORY_ICON_MAX_BYTES, PROPERTY_IMAGE_MAX_BYTES

PROPERTY_VIDEO_MAX_BYTES = VIDEO_MAX_BYTES


def validate_property_video_file_size(upload):
    if not upload:
        return
    if upload.size > PROPERTY_VIDEO_MAX_BYTES:
        raise ValidationError("Video file must be 80 MB or smaller.")


def validate_property_image_max_size(upload):
    """Safety check after compression; stored file must be within cap."""
    if not upload:
        return
    if hasattr(upload, "size") and upload.size > PROPERTY_IMAGE_MAX_BYTES:
        raise ValidationError("Image could not be optimized to 300 KB.")


def validate_category_icon_max_size(upload):
    """Safety check after compression; stored icon must be within cap."""
    if not upload:
        return
    if hasattr(upload, "size") and upload.size > CATEGORY_ICON_MAX_BYTES:
        raise ValidationError("Category icon could not be optimized to 80 KB.")
