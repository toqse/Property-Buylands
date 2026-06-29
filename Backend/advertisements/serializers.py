from django.http import QueryDict
from rest_framework import serializers

from property_listing.video_constants import VIDEO_READY
from advertisements.models import Advertisement
from properties.models import City, Property
from properties.utils import absolute_media_url


DEFAULT_AD_PLACEMENTS = [Advertisement.PLACEMENT_PROPERTY_LISTING_FEED]


class AdvertisementSerializer(serializers.ModelSerializer):
    city = serializers.CharField(write_only=True, required=False, allow_blank=True)
    city_name = serializers.CharField(source="city.name", read_only=True)
    placements = serializers.JSONField(read_only=True)
    remove_video = serializers.BooleanField(write_only=True, required=False, default=False)
    linked_property_slug = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = [
            "id",
            "title",
            "subtitle",
            "ad_type",
            "media_type",
            "is_active",
            "desktop_image",
            "mobile_image",
            "video_file",
            "remove_video",
            "video_thumbnail",
            "video_processing_status",
            "redirect_type",
            "linked_property",
            "linked_property_slug",
            "external_url",
            "country",
            "state",
            "district",
            "city",
            "city_name",
            "latitude",
            "longitude",
            "radius_km",
            "placements",
            "start_date",
            "end_date",
            "priority",
            "created_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "video_processing_status",
            "video_thumbnail",
            "created_by",
            "created_at",
            "updated_at",
        ]

    def to_internal_value(self, data):
        if isinstance(data, QueryDict):
            copied_data = QueryDict(mutable=True)
            for key in data:
                copied_data.setlist(key, data.getlist(key))
            data = copied_data
        elif hasattr(data, "copy"):
            data = data.copy()
        else:
            data = {**data}
        for field in ("latitude", "longitude"):
            if data.get(field) == "":
                data[field] = None
        return super().to_internal_value(data)

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        media_type = attrs.get("media_type", getattr(instance, "media_type", None))
        redirect_type = attrs.get("redirect_type", getattr(instance, "redirect_type", None))
        start_date = attrs.get("start_date", getattr(instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(instance, "end_date", None))
        ad_type = attrs.get("ad_type", getattr(instance, "ad_type", None))

        desktop_image = attrs.get("desktop_image", getattr(instance, "desktop_image", None))
        video_file = attrs.get("video_file", getattr(instance, "video_file", None))
        remove_video = attrs.get("remove_video", False)
        if remove_video:
            video_file = None
            attrs["video_file"] = None
        linked_property = attrs.get("linked_property", getattr(instance, "linked_property", None))
        external_url = attrs.get("external_url", getattr(instance, "external_url", ""))

        if media_type == Advertisement.MEDIA_IMAGE and not desktop_image:
            if not (instance and getattr(instance, "desktop_image", None)):
                raise serializers.ValidationError({"desktop_image": "This field is required for image ads."})
        if media_type == Advertisement.MEDIA_VIDEO and not video_file:
            if remove_video:
                pass
            elif instance and getattr(instance, "video_file", None):
                pass
            else:
                raise serializers.ValidationError({"video_file": "This field is required for video ads."})

        if redirect_type == Advertisement.REDIRECT_PROPERTY:
            if not linked_property:
                raise serializers.ValidationError({"linked_property": "This field is required."})
            if linked_property.moderation_status != Property.MODERATION_APPROVED:
                raise serializers.ValidationError({"linked_property": "Linked property must be approved."})
        if redirect_type == Advertisement.REDIRECT_EXTERNAL_URL and not external_url:
            raise serializers.ValidationError({"external_url": "This field is required."})

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"end_date": "End date must be on or after start date."})

        if ad_type == Advertisement.AD_TYPE_GENERIC:
            attrs["latitude"] = None
            attrs["longitude"] = None

        return attrs

    @staticmethod
    def _resolve_city(value, district):
        """Accept a City pk or a display name within `district`; create if missing."""
        if value is None or district is None:
            return None
        raw = str(value).strip()
        if not raw:
            return None
        if raw.isdigit():
            city = City.objects.filter(pk=int(raw), district=district).first()
            if city:
                return city
        city = City.objects.filter(name__iexact=raw, district=district).first()
        if city:
            return city
        return City.objects.create(name=raw, district=district)

    def create(self, validated_data):
        validated_data.pop("remove_video", None)
        validated_data["placements"] = list(DEFAULT_AD_PLACEMENTS)
        has_city = "city" in validated_data
        city_input = validated_data.pop("city", None)
        instance = super().create(validated_data)
        if has_city:
            instance.city = self._resolve_city(city_input, instance.district)
            instance.save(update_fields=["city"])
        return instance

    def update(self, instance, validated_data):
        validated_data["placements"] = list(DEFAULT_AD_PLACEMENTS)
        remove_video = validated_data.pop("remove_video", False)
        has_city = "city" in validated_data
        city_input = validated_data.pop("city", None)
        if remove_video and "video_file" not in validated_data:
            instance.video_file = None
            if instance.video_thumbnail:
                instance.video_thumbnail.delete(save=False)
                instance.video_thumbnail = None
            instance.video_processing_status = VIDEO_READY
        instance = super().update(instance, validated_data)
        if has_city:
            instance.city = self._resolve_city(city_input, instance.district)
            instance.save(update_fields=["city"])
        return instance

    def get_linked_property_slug(self, obj):
        if obj.linked_property_id:
            return obj.linked_property.slug
        return None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["city"] = instance.city_id
        return rep


class AdvertisementPublicSerializer(serializers.ModelSerializer):
    desktop_image_url = serializers.SerializerMethodField()
    mobile_image_url = serializers.SerializerMethodField()
    video_file_url = serializers.SerializerMethodField()
    video_thumbnail_url = serializers.SerializerMethodField()
    linked_property_slug = serializers.SerializerMethodField()

    class Meta:
        model = Advertisement
        fields = [
            "id",
            "title",
            "subtitle",
            "ad_type",
            "media_type",
            "desktop_image_url",
            "mobile_image_url",
            "video_file_url",
            "video_thumbnail_url",
            "redirect_type",
            "linked_property",
            "linked_property_slug",
            "external_url",
            "priority",
        ]

    def get_linked_property_slug(self, obj):
        if obj.linked_property_id:
            return obj.linked_property.slug
        return None

    def get_desktop_image_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.desktop_image)

    def get_mobile_image_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.mobile_image)

    def get_video_file_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.video_file)

    def get_video_thumbnail_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.video_thumbnail)

