from django.conf import settings
from django.db import models
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator

from property_listing.video_constants import (
    VIDEO_ALLOWED_EXTENSIONS,
    VIDEO_PROCESSING,
    VIDEO_PROCESSING_STATUS_CHOICES,
    VIDEO_READY,
)

from .image_utils import (
    compress_category_icon,
    compress_property_image,
    is_new_image_upload,
)
from .validators import (
    validate_category_icon_max_size,
    validate_property_image_max_size,
    validate_property_video_file_size,
)

PROPERTY_IMAGE_VALIDATORS = (
    FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"]),
)


PROPERTY_VIDEO_VALIDATORS = (
    FileExtensionValidator(allowed_extensions=list(VIDEO_ALLOWED_EXTENSIONS)),
    validate_property_video_file_size,
)

class State(models.Model):
    name = models.CharField(max_length=250)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class District(models.Model):
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='districts')
    name = models.CharField(max_length=250)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name}, {self.state.name}"

class City(models.Model):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='cities')
    name = models.CharField(max_length=250)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name}, {self.district.name}"

class Feature(models.Model):
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class PropertyType(models.Model):
    name = models.CharField(max_length=100)
    image = models.ImageField(
        upload_to="property_types/icons/",
        validators=PROPERTY_IMAGE_VALIDATORS,
        null=True,
        blank=True,
    )
    has_bedrooms = models.BooleanField(default=True)
    has_bathrooms = models.BooleanField(default=True)
    has_built_year = models.BooleanField(default=True)
    has_parking_spaces = models.BooleanField(default=True)
    has_project_status = models.BooleanField(default=False)
    has_floors = models.BooleanField(default=False)
    has_sighting = models.BooleanField(default=False)
    has_area_both = models.BooleanField(default=False)
    has_furnishing = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.image and is_new_image_upload(self.image):
            self.image = compress_category_icon(self.image)
            validate_category_icon_max_size(self.image)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class Property(models.Model):
    PROPERTY_FOR_CHOICES = [
        ('rent', 'Rent'),
        ('sell', 'Sell'),
    ]
    
    MODERATION_PENDING = "pending"
    MODERATION_APPROVED = "approved"
    MODERATION_REJECTED = "rejected"
    MODERATION_STATUS_CHOICES = [
        (MODERATION_PENDING, "Pending"),
        (MODERATION_APPROVED, "Approved"),
        (MODERATION_REJECTED, "Rejected"),
    ]

    # Basic Information
    property_for = models.CharField(max_length=10, choices=PROPERTY_FOR_CHOICES)
    property_ownership = models.CharField(max_length=50)
    
    # Contact Information
    contact_name = models.CharField(max_length=100, blank=True, default="")
    whatsapp_number = models.CharField(max_length=20)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    
    # Location Information
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='properties')
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='properties')
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='properties')
    
    # Property Information
    title = models.CharField(max_length=200)
    slug = models.SlugField(
        max_length=220,
        unique=True,
        db_index=True,
        help_text="URL segment for public detail pages; auto-generated from title if omitted.",
    )
    price = models.TextField(help_text="Price can be numeric (e.g., '2500000') or text (e.g., '25 Lakh', 'Negotiable', 'Contact for price')")
    property_type = models.ForeignKey(PropertyType, on_delete=models.CASCADE, related_name='properties')
    
    # Location Coordinates
    latitude = models.DecimalField(max_digits=13, decimal_places=10, null=True, blank=True)
    longitude = models.DecimalField(max_digits=13, decimal_places=10, null=True, blank=True)
    
    # Property Details (nullable for area_unit=cent plot listings)
    bedrooms = models.PositiveIntegerField(null=True, blank=True)
    bathrooms = models.PositiveIntegerField(null=True, blank=True)
    AREA_UNIT_CHOICES = [
        ('sqft', 'Square Feet'),
        ('cent', 'Cent'),
    ]
    area = models.JSONField(
        default=list,
        help_text="Area values (sq.ft or cent per area_unit); e.g. [\"23.56\", \"56.677\"]",
    )
    area_range_min = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        default=0,
        db_index=True,
        help_text="Minimum value in area list (for filtering)",
    )
    area_range_max = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        default=0,
        db_index=True,
        help_text="Maximum value in area list (for filtering)",
    )
    area_unit = models.CharField(max_length=10, choices=AREA_UNIT_CHOICES, default='sqft', help_text="Unit of measurement for area")
    description = models.TextField(blank=True, default="")
    features = models.ManyToManyField(Feature, related_name='properties')
    google_maps_url = models.URLField(blank=True, null=True)
    google_embedded_map_link = models.TextField(blank=True, null=True, help_text="Paste the complete iframe HTML code from Google Maps embed")
    youtube_video_link = models.URLField(blank=True, null=True)
    property_video = models.FileField(
        upload_to="property/videos/",
        null=True,
        blank=True,
        validators=PROPERTY_VIDEO_VALIDATORS,
    )
    video_thumbnail = models.ImageField(
        upload_to="property/video_thumbs/",
        null=True,
        blank=True,
        validators=PROPERTY_IMAGE_VALIDATORS,
    )
    video_processing_status = models.CharField(
        max_length=12,
        choices=VIDEO_PROCESSING_STATUS_CHOICES,
        default=VIDEO_READY,
        null=True,
        blank=True,
        db_index=True,
    )
    nearby_places = models.JSONField(blank=True, null=True, help_text="List of nearby places in format: ['place1 - 1km', 'place2 - 2km']")
    built_year = models.CharField(max_length=20, blank=True, default="")
    furnishing = models.CharField(max_length=50, null=True, blank=True)
    project_status = models.CharField(max_length=100, blank=True, null=True)
    floors = models.CharField(max_length=50, blank=True, null=True)
    sighting = models.CharField(max_length=100, blank=True, null=True)
    area_cent = models.JSONField(
        null=True,
        blank=True,
        help_text="Cent values when property type supports both units; e.g. [\"5.75\", \"2.1\"]",
    )
    area_cent_range_min = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        null=True,
        blank=True,
        db_index=True,
        help_text="Minimum value in area_cent list (for filtering)",
    )
    area_cent_range_max = models.DecimalField(
        max_digits=18,
        decimal_places=8,
        null=True,
        blank=True,
        db_index=True,
        help_text="Maximum value in area_cent list (for filtering)",
    )
    parking_spaces = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Highlight on marketing site when integrated with public listings.",
    )

    moderation_status = models.CharField(
        max_length=20,
        choices=MODERATION_STATUS_CHOICES,
        default=MODERATION_PENDING,
        db_index=True,
        help_text="Public listings only show approved properties.",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderated_properties",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_properties",
        help_text="Property owner who created this listing (non-staff).",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def _update_area_ranges(self):
        from .area_utils import normalize_stored_area_list, values_min_max

        area_values = normalize_stored_area_list(self.area)
        if area_values:
            self.area_range_min, self.area_range_max = values_min_max(area_values)

        if self.area_cent:
            cent_values = normalize_stored_area_list(self.area_cent)
            if cent_values:
                self.area_cent_range_min, self.area_cent_range_max = values_min_max(cent_values)
            else:
                self.area_cent = None
                self.area_cent_range_min = None
                self.area_cent_range_max = None
        else:
            self.area_cent_range_min = None
            self.area_cent_range_max = None

    def save(self, *args, **kwargs):
        self._update_area_ranges()
        new_video = bool(self.property_video) and is_new_image_upload(self.property_video)
        clear_video = not self.property_video
        queue_after_save = False

        if new_video:
            from property_listing.video_services import prepare_video_upload, queue_video_processing

            self.property_video = prepare_video_upload(self.property_video)
            self.video_processing_status = VIDEO_PROCESSING
            queue_after_save = True

        if clear_video:
            if self.video_thumbnail:
                self.video_thumbnail.delete(save=False)
                self.video_thumbnail = None
            self.video_processing_status = None

        super().save(*args, **kwargs)

        if queue_after_save:
            queue_video_processing("property", self.pk)

    def __str__(self):
        return self.title
        
class PropertyImage(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(
        upload_to='property_images/',
        validators=PROPERTY_IMAGE_VALIDATORS,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.image and is_new_image_upload(self.image):
            self.image = compress_property_image(self.image)
            validate_property_image_max_size(self.image)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Image for {self.property.title}"

class HeroBanner(models.Model):
    image = models.ImageField(upload_to='banners/hero/')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Hero Banner {self.id}"

class OfferBanner(models.Model):
    image = models.ImageField(upload_to='banners/offers/')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Offer Banner {self.id}"


class AdminPanelImage(models.Model):
    """Admin gallery images for mobile app / marketing (max 5 records system-wide)."""

    MAX_COUNT = 5

    title = models.CharField(max_length=50)
    image = models.ImageField(
        upload_to="admin_panel/images/",
        validators=PROPERTY_IMAGE_VALIDATORS,
    )
    display_order = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-created_at"]
        verbose_name = "Admin panel image"
        verbose_name_plural = "Admin panel images"

    def __str__(self):
        return self.title


class Contact(models.Model):
    property = models.ForeignKey(
        "Property",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contacts",
        help_text="When set, enquiry is about this listing (must be approved for public POST).",
    )
    name = models.CharField(max_length=100)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)
    subject = models.CharField(max_length=200)
    budget_range = models.CharField(max_length=100, null=True, blank=True, help_text="e.g., '₹50,000 - ₹1,00,000' or '$500 - $1000'")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} - {self.subject}"

    class Meta:
        ordering = ['-created_at']  # Most recent contacts first

class Testimonial(models.Model):
    client_name = models.CharField(max_length=120)
    client_role = models.CharField(max_length=120, help_text="e.g. Property Investor, Homeowner")
    testimonial_text = models.TextField()
    rating = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    avatar = models.ImageField(upload_to="testimonials/avatars/", blank=True, null=True)
    is_published = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveIntegerField(default=0, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return f"{self.client_name} ({self.client_role})"

    @property
    def initial(self):
        name = (self.client_name or "").strip()
        return name[0].upper() if name else "?"


class SiteSettings(models.Model):
    """
    Singleton model for site-wide settings.
    Only one instance should exist (pk=1).
    """
    testimonials_section_tag = models.CharField(
        max_length=80,
        default="CLIENT STORIES",
        help_text="Small label above the testimonials heading on the home page.",
    )
    testimonials_section_heading = models.CharField(
        max_length=200,
        default="What our clients say",
    )
    testimonials_section_description = models.TextField(
        default="Real experiences from people who found their perfect space with us.",
    )
    filter_radius = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=10.0,
        help_text="Default filter radius in kilometers for latitude/longitude-based property searches"
    )
    ad_inject_after_every_n_properties = models.PositiveIntegerField(
        default=5,
        help_text="Global cadence: inject an ad after every N properties in the listing feed.",
    )
    admin_phone = models.CharField(
        max_length=40,
        blank=True,
        default="9961280628",
        help_text="Company/platform contact phone shown on listings and public pages.",
    )
    admin_whatsapp = models.CharField(
        max_length=40,
        blank=True,
        default="9961280628",
        help_text="Platform WhatsApp (digits or E.164) shown on listings and contact page.",
    )
    company_email = models.EmailField(
        max_length=254,
        default="Premiumproperty4you@gmail.com",
        help_text="Company email shown in footer and contact page.",
    )
    company_address = models.TextField(
        default="4/461, Second Floor, Valamkottil Towers, Thrikkakara, Ernakulam – 682021, Kerala, India",
        help_text="Company office address shown in footer and contact page.",
    )
    android_app_version = models.CharField(
        max_length=20,
        default="1.0.0",
        help_text="Current published Android app version, e.g. 1.4.3",
    )
    android_force_update = models.BooleanField(
        default=False,
        help_text="If true, the Android app forces users to update.",
    )
    ios_app_version = models.CharField(
        max_length=20,
        default="1.0.0",
        help_text="Current published iOS app version, e.g. 1.4.3",
    )
    ios_force_update = models.BooleanField(
        default=False,
        help_text="If true, the iOS app forces users to update.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @classmethod
    def get_settings(cls):
        """
        Get or create the singleton SiteSettings instance.
        Returns the single settings object (pk=1).
        """
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
    
    def __str__(self):
        return f"Site Settings (Filter Radius: {self.filter_radius} km)"
    
    class Meta:
        verbose_name = "Site Settings"
        verbose_name_plural = "Site Settings"
