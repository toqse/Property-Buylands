from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator
import secrets
from django.utils import timezone
from datetime import timedelta

from .validators import validate_avatar_max_size


class OTPVerification(models.Model):
    PURPOSE_PASSWORD_RESET = "password_reset"
    PURPOSE_REGISTRATION = "registration"
    PURPOSE_LOGIN = "login"
    PURPOSE_EMAIL_CHANGE = "email_change"
    PURPOSE_CHOICES = [
        (PURPOSE_PASSWORD_RESET, "Password reset"),
        (PURPOSE_REGISTRATION, "Registration"),
        (PURPOSE_LOGIN, "Login"),
        (PURPOSE_EMAIL_CHANGE, "Email change"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="otp_verifications")
    otp = models.CharField(max_length=6)
    purpose = models.CharField(
        max_length=32,
        choices=PURPOSE_CHOICES,
        default=PURPOSE_PASSWORD_RESET,
        db_index=True,
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.otp:
            self.otp = "".join(secrets.choice("0123456789") for _ in range(6))
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)

    def is_valid(self):
        return timezone.now() <= self.expires_at

    class Meta:
        ordering = ["-created_at"]


class UserProfile(models.Model):
    ACCOUNT_PROPERTY_OWNER = "property_owner"
    ACCOUNT_TYPE_CHOICES = [
        (ACCOUNT_PROPERTY_OWNER, "Property owner"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=20, blank=True, default="")
    whatsapp_number = models.CharField(max_length=20, blank=True, default="")
    address = models.TextField(blank=True, default="")
    pending_email = models.EmailField(blank=True, default="")
    avatar = models.ImageField(
        upload_to="avatars/",
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"]),
            validate_avatar_max_size,
        ],
    )
    email_verified_at = models.DateTimeField(null=True, blank=True)
    account_type = models.CharField(
        max_length=32,
        choices=ACCOUNT_TYPE_CHOICES,
        default=ACCOUNT_PROPERTY_OWNER,
    )

    def __str__(self):
        return f"Profile({self.user_id})"


class PendingOwnerRegistration(models.Model):
    """Holds owner signup data until email OTP is verified; no User row until then."""

    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, blank=True, default="")
    whatsapp_number = models.CharField(max_length=20, blank=True, default="")
    password = models.CharField(max_length=128)
    avatar = models.ImageField(
        upload_to="pending_avatars/",
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"]),
            validate_avatar_max_size,
        ],
    )
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.otp:
            self.otp = "".join(secrets.choice("0123456789") for _ in range(6))
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)

    def is_valid(self):
        return timezone.now() <= self.expires_at

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"PendingOwner({self.email})"


class StaffProfile(models.Model):
    """Profile + permission flags for portal staff (is_staff, not necessarily superuser)."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="staff_profile")
    phone = models.CharField(max_length=20, blank=True, default="")
    role_label = models.CharField(max_length=64, blank=True, default="")
    can_manage_properties = models.BooleanField(default=True)
    can_manage_advertisements = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"StaffProfile({self.user_id})"


class StaffActivityLog(models.Model):
    ACTION_CREATE = "create"
    ACTION_UPDATE = "update"
    ACTION_DELETE = "delete"
    ACTION_LOGIN = "login"
    ACTION_CHOICES = [
        (ACTION_CREATE, "Create"),
        (ACTION_UPDATE, "Update"),
        (ACTION_DELETE, "Delete"),
        (ACTION_LOGIN, "Login"),
    ]

    RESOURCE_PROPERTY = "property"
    RESOURCE_ADVERTISEMENT = "advertisement"
    RESOURCE_STAFF = "staff"
    RESOURCE_AUTH = "auth"
    RESOURCE_CHOICES = [
        (RESOURCE_PROPERTY, "Property"),
        (RESOURCE_ADVERTISEMENT, "Advertisement"),
        (RESOURCE_STAFF, "Staff"),
        (RESOURCE_AUTH, "Auth"),
    ]

    actor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="staff_activity_logs",
    )
    action = models.CharField(max_length=16, choices=ACTION_CHOICES, db_index=True)
    resource_type = models.CharField(max_length=32, choices=RESOURCE_CHOICES, db_index=True)
    resource_id = models.CharField(max_length=64, blank=True, default="")
    summary = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"StaffActivity({self.actor_id}:{self.action}:{self.resource_type})"
