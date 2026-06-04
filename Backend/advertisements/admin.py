from django.contrib import admin

from advertisements.models import Advertisement


@admin.register(Advertisement)
class AdvertisementAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "ad_type",
        "media_type",
        "is_active",
        "state",
        "district",
        "city",
        "priority",
        "processing_status",
        "created_at",
    )
    list_filter = ("ad_type", "media_type", "is_active", "state", "district", "city", "processing_status")
    search_fields = ("title", "subtitle")
    readonly_fields = ("processing_status", "created_at", "updated_at")

