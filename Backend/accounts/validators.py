from django.core.exceptions import ValidationError

AVATAR_MAX_BYTES = 500 * 1024


def validate_avatar_max_size(value):
    if value and hasattr(value, "size") and value.size > AVATAR_MAX_BYTES:
        raise ValidationError("Profile photo must be 500 KB or smaller.")
