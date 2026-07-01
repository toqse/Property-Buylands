from django.contrib import admin
from django import forms
from django.http import HttpResponseRedirect
from django.urls import reverse
from .models import (
    AdminPanelImage,
    Feature,
    PropertyType,
    Property,
    PropertyImage,
    State,
    District,
    City,
    SiteSettings,
    Testimonial,
)
from .area_utils import (
    AreaParseError,
    decimal_list_to_storage,
    join_decimal_list_for_display,
    parse_decimal_list_input,
)

@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name',)

@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ('name', 'state', 'created_at', 'updated_at')
    list_filter = ('state',)
    search_fields = ('name',)

@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'district', 'created_at', 'updated_at')
    list_filter = ('district__state', 'district')
    search_fields = ('name',)

@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at', 'updated_at')
    search_fields = ('name',)

@admin.register(PropertyType)
class PropertyTypeAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'has_bedrooms',
        'has_bathrooms',
        'has_built_year',
        'has_parking_spaces',
        'has_project_status',
        'has_floors',
        'has_sighting',
        'has_area_both',
        'has_furnishing',
        'created_at',
        'updated_at',
    )
    search_fields = ('name',)
    fields = (
        'name',
        'image',
        'has_bedrooms',
        'has_bathrooms',
        'has_built_year',
        'has_parking_spaces',
        'has_project_status',
        'has_floors',
        'has_sighting',
        'has_area_both',
        'has_furnishing',
        'created_at',
        'updated_at',
    )
    readonly_fields = ('created_at', 'updated_at')

class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1


class PropertyAdminForm(forms.ModelForm):
    area = forms.CharField(
        required=True,
        help_text="Multiple values: 23.56, 56.677, 4.56",
    )
    area_cent = forms.CharField(
        required=False,
        help_text="Multiple cent values: 5.75, 2.1 (optional)",
    )

    class Meta:
        model = Property
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.initial["area"] = join_decimal_list_for_display(self.instance.area)
            if self.instance.area_cent:
                self.initial["area_cent"] = join_decimal_list_for_display(self.instance.area_cent)

    def clean_area(self):
        raw = self.cleaned_data.get("area")
        try:
            values = parse_decimal_list_input(raw, "area")
        except AreaParseError as exc:
            raise forms.ValidationError(str(exc)) from exc
        if not values:
            raise forms.ValidationError("At least one area value is required.")
        return decimal_list_to_storage(values)

    def clean_area_cent(self):
        raw = self.cleaned_data.get("area_cent")
        if raw is None or not str(raw).strip():
            return None
        try:
            values = parse_decimal_list_input(raw, "area_cent")
        except AreaParseError as exc:
            raise forms.ValidationError(str(exc)) from exc
        if not values:
            return None
        return decimal_list_to_storage(values)


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    form = PropertyAdminForm
    list_display = ('title', 'property_for', 'is_featured', 'state', 'district', 'city', 'property_type', 'price', 'created_at')
    list_filter = ('property_for', 'is_featured', 'state', 'district', 'city', 'property_type', 'bedrooms', 'bathrooms', 'furnishing', 'project_status')
    search_fields = ('title', 'description', 'property_ownership', 'project_status', 'floors', 'sighting')
    inlines = [PropertyImageInline]
    filter_horizontal = ('features',)

@admin.register(AdminPanelImage)
class AdminPanelImageAdmin(admin.ModelAdmin):
    list_display = ("title", "image", "display_order", "created_at", "updated_at")
    list_editable = ("display_order",)
    search_fields = ("title",)
    ordering = ("display_order", "-created_at")


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = (
        "client_name",
        "client_role",
        "rating",
        "is_published",
        "display_order",
        "created_at",
    )
    list_filter = ("is_published", "rating")
    search_fields = ("client_name", "client_role", "testimonial_text")
    ordering = ("display_order", "-created_at")


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    """
    Admin interface for SiteSettings (singleton pattern).
    Only allows editing the single instance (pk=1).
    """
    list_display = ('filter_radius', 'created_at', 'updated_at')
    fields = (
        "filter_radius",
        "admin_phone",
        "admin_whatsapp",
        "company_email",
        "company_address",
        "android_app_version",
        "android_force_update",
        "ios_app_version",
        "ios_force_update",
        "testimonials_section_tag",
        "testimonials_section_heading",
        "testimonials_section_description",
        "created_at",
        "updated_at",
    )
    readonly_fields = ('created_at', 'updated_at')
    
    def has_add_permission(self, request):
        """Prevent adding new instances - only one should exist"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deleting the singleton instance"""
        return False
    
    def changelist_view(self, request, extra_context=None):
        """
        Redirect to the edit page of the singleton instance.
        """
        obj = SiteSettings.get_settings()
        return HttpResponseRedirect(
            reverse('admin:properties_sitesettings_change', args=[obj.pk])
        )
