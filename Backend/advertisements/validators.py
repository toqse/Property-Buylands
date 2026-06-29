from django.core.exceptions import ValidationError

from property_listing.video_constants import VIDEO_MAX_BYTES

AD_IMAGE_MAX_BYTES = 10 * 1024 * 1024
AD_VIDEO_MAX_BYTES = VIDEO_MAX_BYTES


def validate_ad_image_max_size(upload):
    if not upload:
        return
    if hasattr(upload, "size") and upload.size > AD_IMAGE_MAX_BYTES:
        raise ValidationError("Image file must be 10 MB or smaller.")


def validate_ad_video_max_size(upload):
    if not upload:
        return
    if hasattr(upload, "size") and upload.size > AD_VIDEO_MAX_BYTES:
        raise ValidationError("Video file must be 80 MB or smaller.")
