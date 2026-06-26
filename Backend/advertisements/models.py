from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone

from advertisements.image_utils import compress_ad_image
from advertisements.validators import validate_ad_image_max_size, validate_ad_video_max_size
from advertisements.video_utils import compress_ad_video, generate_video_thumbnail
from properties.image_utils import is_new_image_upload

AD_IMAGE_VALIDATORS = (
    FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"]),
    validate_ad_image_max_size,
)

AD_VIDEO_VALIDATORS = (
    FileExtensionValidator(allowed_extensions=["mp4", "webm"]),
    validate_ad_video_max_size,
)


class Advertisement(models.Model):
    AD_TYPE_PROPERTY = "property"
    AD_TYPE_GENERIC = "generic"
    AD_TYPE_CHOICES = [
        (AD_TYPE_PROPERTY, "Property Ad"),
        (AD_TYPE_GENERIC, "Generic Ad"),
    ]

    MEDIA_IMAGE = "image"
    MEDIA_VIDEO = "video"
    MEDIA_TYPE_CHOICES = [
        (MEDIA_IMAGE, "Image"),
        (MEDIA_VIDEO, "Video"),
    ]

    REDIRECT_PROPERTY = "property"
    REDIRECT_EXTERNAL_URL = "external_url"
    REDIRECT_TYPE_CHOICES = [
        (REDIRECT_PROPERTY, "Property"),
        (REDIRECT_EXTERNAL_URL, "External URL"),
    ]

    PROCESSING_PENDING = "pending"
    PROCESSING_READY = "ready"
    PROCESSING_FAILED = "failed"
    PROCESSING_STATUS_CHOICES = [
        (PROCESSING_PENDING, "Pending"),
        (PROCESSING_READY, "Ready"),
        (PROCESSING_FAILED, "Failed"),
    ]

    PLACEMENT_HOMEPAGE_FEED = "homepage_feed"
    PLACEMENT_PROPERTY_LISTING_FEED = "property_listing_feed"
    PLACEMENT_SEARCH_RESULTS = "search_results"
    PLACEMENT_PROPERTY_DETAILS_PAGE = "property_details_page"
    PLACEMENT_FEATURED_SECTION = "featured_section"
    PLACEMENT_CHOICES = [
        (PLACEMENT_HOMEPAGE_FEED, "Homepage Feed"),
        (PLACEMENT_PROPERTY_LISTING_FEED, "Property Listing Feed"),
        (PLACEMENT_SEARCH_RESULTS, "Search Results"),
        (PLACEMENT_PROPERTY_DETAILS_PAGE, "Property Details Page"),
        (PLACEMENT_FEATURED_SECTION, "Featured Section"),
    ]

    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True, default="")
    ad_type = models.CharField(max_length=20, choices=AD_TYPE_CHOICES)
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    is_active = models.BooleanField(default=True, db_index=True)

    desktop_image = models.ImageField(
        upload_to="ads/images/desktop/",
        null=True,
        blank=True,
        validators=AD_IMAGE_VALIDATORS,
    )
    mobile_image = models.ImageField(
        upload_to="ads/images/mobile/",
        null=True,
        blank=True,
        validators=AD_IMAGE_VALIDATORS,
    )
    video_file = models.FileField(
        upload_to="ads/videos/",
        null=True,
        blank=True,
        validators=AD_VIDEO_VALIDATORS,
    )
    video_thumbnail = models.ImageField(
        upload_to="ads/videos/thumbs/",
        null=True,
        blank=True,
        validators=AD_IMAGE_VALIDATORS,
    )
    processing_status = models.CharField(
        max_length=12,
        choices=PROCESSING_STATUS_CHOICES,
        default=PROCESSING_READY,
        db_index=True,
    )

    redirect_type = models.CharField(max_length=20, choices=REDIRECT_TYPE_CHOICES)
    linked_property = models.ForeignKey(
        "properties.Property",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="advertisements",
    )
    external_url = models.URLField(blank=True, default="")

    country = models.CharField(max_length=80, default="India")
    state = models.ForeignKey(
        "properties.State",
        on_delete=models.PROTECT,
        related_name="advertisements",
        null=True,
        blank=True,
    )
    district = models.ForeignKey(
        "properties.District",
        on_delete=models.PROTECT,
        related_name="advertisements",
        null=True,
        blank=True,
    )
    city = models.ForeignKey(
        "properties.City",
        on_delete=models.PROTECT,
        related_name="advertisements",
        null=True,
        blank=True,
    )
    latitude = models.DecimalField(max_digits=13, decimal_places=10, null=True, blank=True)
    longitude = models.DecimalField(max_digits=13, decimal_places=10, null=True, blank=True)
    radius_km = models.PositiveIntegerField(default=25)

    placements = models.JSONField(default=list)

    inject_after_every_n_properties = models.PositiveIntegerField(default=5)

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    priority = models.PositiveIntegerField(default=1, db_index=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_ads",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["priority", "-created_at"]
        indexes = [
            models.Index(fields=["is_active", "start_date", "end_date"]),
            models.Index(fields=["state", "district", "city"]),
        ]

    def __str__(self):
        return self.title

    def is_live(self):
        if not self.is_active or self.processing_status != self.PROCESSING_READY:
            return False
        today = timezone.localdate()
        if self.start_date and self.start_date > today:
            return False
        if self.end_date and self.end_date < today:
            return False
        return True

    def save(self, *args, **kwargs):
        if self.desktop_image and is_new_image_upload(self.desktop_image):
            self.desktop_image = compress_ad_image(
                self.desktop_image,
                max_bytes=800 * 1024,
                max_dimension=1920,
                min_dimension=720,
            )
        if self.mobile_image and is_new_image_upload(self.mobile_image):
            self.mobile_image = compress_ad_image(
                self.mobile_image,
                max_bytes=800 * 1024,
                max_dimension=1080,
                min_dimension=540,
            )
        if self.video_file and is_new_image_upload(self.video_file):
            self.processing_status = self.PROCESSING_PENDING
            try:
                self.video_file = compress_ad_video(self.video_file)
                thumb = generate_video_thumbnail(self.video_file)
                if thumb is not None:
                    self.video_thumbnail = compress_ad_image(
                        thumb,
                        max_bytes=800 * 1024,
                        max_dimension=1080,
                        min_dimension=540,
                    )
                self.processing_status = self.PROCESSING_READY
            except Exception:
                self.processing_status = self.PROCESSING_FAILED
                raise
        super().save(*args, **kwargs)

