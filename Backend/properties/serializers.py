from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal, InvalidOperation
from rest_framework import serializers
from rest_framework.exceptions import ValidationError as DRFValidationError
from .models import (
    AdminPanelImage,
    Feature,
    PropertyType,
    Property,
    PropertyImage,
    State,
    District,
    City,
    HeroBanner,
    OfferBanner,
    Contact,
    SiteSettings,
    Testimonial,
)
from .slug_utils import generate_unique_property_slug, normalize_property_slug_input
from .utils import absolute_media_url, filter_public_video_ready, normalize_nearby_places_output
from .enquiry_email import send_enquiry_notification
from .area_utils import (
    AreaParseError,
    decimal_list_to_storage,
    normalize_stored_area_list,
    parse_decimal_list_input,
)

class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = ['id', 'name']

class DistrictSerializer(serializers.ModelSerializer):
    state_name = serializers.CharField(source='state.name', read_only=True)

    class Meta:
        model = District
        fields = ['id', 'name', 'state', 'state_name']

class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = ['id', 'name', 'district']

class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ['id', 'name']

class PropertyTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyType
        fields = [
            "id",
            "name",
            "image",
            "has_bedrooms",
            "has_bathrooms",
            "has_built_year",
            "has_parking_spaces",
            "has_project_status",
            "has_floors",
            "has_sighting",
            "has_area_both",
            "has_furnishing",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["image"] = absolute_media_url(self.context.get("request"), instance.image)
        return rep

    def validate(self, attrs):
        image = attrs.get("image")
        if self.instance is None:
            if not image:
                raise serializers.ValidationError({"image": "This field is required."})
        else:
            if image is None and "image" in attrs:
                raise serializers.ValidationError({"image": "This field is required."})
            if not image and not self.instance.image:
                raise serializers.ValidationError({"image": "This field is required."})
        return attrs

class PropertyImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyImage
        fields = ['id', 'image']

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get("request")
        if instance.image:
            rep["image"] = absolute_media_url(request, instance.image)
        return rep


def _create_property_images(property_instance, uploaded_images):
    """Create PropertyImage rows; map model ValidationError to uploaded_images."""
    if not isinstance(uploaded_images, list):
        uploaded_images = [uploaded_images] if uploaded_images else []
    for image in uploaded_images:
        try:
            PropertyImage.objects.create(property=property_instance, image=image)
        except DjangoValidationError as exc:
            detail = exc.messages[0] if getattr(exc, "messages", None) else str(exc)
            raise DRFValidationError({"uploaded_images": detail}) from exc


class DecimalListField(serializers.Field):
    """Accept scalar, comma-separated string, or JSON array; always return a number array."""

    def __init__(self, *, required=True, allow_null=False, **kwargs):
        super().__init__(required=required, allow_null=allow_null, **kwargs)

    def to_representation(self, value):
        if value is None:
            return None if self.allow_null else []
        values = normalize_stored_area_list(value)
        return [float(v) for v in values]

    def to_internal_value(self, data):
        if data is None or (isinstance(data, str) and not str(data).strip()):
            if self.allow_null:
                return None
            if self.required:
                raise serializers.ValidationError("This field is required.")
            return []

        field_name = getattr(self, "field_name", "area")
        try:
            parsed = parse_decimal_list_input(data, field_name)
        except AreaParseError as exc:
            raise serializers.ValidationError(str(exc)) from exc

        if not parsed:
            if self.allow_null:
                return None
            raise serializers.ValidationError("At least one area value is required.")

        return decimal_list_to_storage(parsed)


class PropertyVideoProcessingStatusSerializer(serializers.ModelSerializer):
    """Minimal serializer for batch video compression status polling."""

    property_video_url = serializers.SerializerMethodField(read_only=True)
    video_thumbnail_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Property
        fields = [
            "id",
            "video_processing_status",
            "property_video_url",
            "video_thumbnail_url",
        ]

    def get_property_video_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.property_video)

    def get_video_thumbnail_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.video_thumbnail)


class PropertySerializer(serializers.ModelSerializer):
    images = PropertyImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
        write_only=True, required=False
    )
    state = serializers.CharField(write_only=True, required=False)
    district = serializers.CharField(write_only=True, required=False)
    city = serializers.CharField(write_only=True, required=False)
    
    # Property type fields
    property_type = serializers.PrimaryKeyRelatedField(queryset=PropertyType.objects.all(), write_only=True)
    property_type_details = PropertyTypeSerializer(source='property_type', read_only=True)
    
    # Feature fields
    features = serializers.PrimaryKeyRelatedField(queryset=Feature.objects.all(), many=True, write_only=True, required=False)
    feature_details = FeatureSerializer(source='features', many=True, read_only=True)
    
    # Location fields
    location = serializers.SerializerMethodField()
    moderated_by_username = serializers.SerializerMethodField()
    created_by = serializers.IntegerField(source="created_by_id", read_only=True, allow_null=True)
    slug = serializers.SlugField(max_length=220, required=False, allow_blank=True)
    property_video_url = serializers.SerializerMethodField(read_only=True)
    video_thumbnail_url = serializers.SerializerMethodField(read_only=True)
    state_name = serializers.CharField(source="state.name", read_only=True)
    district_name = serializers.CharField(source="district.name", read_only=True)
    city_name = serializers.CharField(source="city.name", read_only=True)
    property_type_name = serializers.CharField(source="property_type.name", read_only=True)
    distance_km = serializers.SerializerMethodField(read_only=True)
    nearby_places_data = serializers.JSONField(write_only=True, required=False, allow_null=True)

    contact_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    whatsapp_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    remove_video = serializers.BooleanField(write_only=True, required=False, default=False)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    built_year = serializers.CharField(
        required=False, allow_blank=True, max_length=20, default=""
    )
    area = DecimalListField(required=True)
    area_cent = DecimalListField(required=False, allow_null=True)

    class Meta:
        model = Property
        fields = [
            'id', 'property_for', 'property_ownership', 'contact_name', 
            'whatsapp_number', 'phone_number', 'email', 
            'location', 'state', 'state_name', 'district', 'district_name', 'city', 'city_name',
            'title', 'slug', 'price', 'property_type', 'property_type_details', 'property_type_name',
            'bedrooms', 
            'bathrooms', 'area', 'area_unit', 'description', 'features', 'feature_details', 'google_maps_url', 
            'google_embedded_map_link', 'youtube_video_link', 'property_video', 'property_video_url',
            'video_thumbnail', 'video_thumbnail_url', 'video_processing_status',
            'latitude', 'longitude', 'distance_km',
            'nearby_places', 'nearby_places_data', 'built_year', 'furnishing',
            'project_status', 'floors', 'sighting', 'area_cent',
            'parking_spaces', 'is_featured', 'images', 
            'uploaded_images', 'remove_video', 'created_at', 'updated_at',
            'moderation_status', 'moderated_at', 'moderated_by_username', 'created_by',
        ]
        read_only_fields = (
            'created_at',
            'updated_at',
            'moderation_status',
            'moderated_at',
            'moderated_by_username',
            'created_by',
            'video_thumbnail',
            'video_thumbnail_url',
            'video_processing_status',
        )
        extra_kwargs = {
            'state': {'write_only': True},
            'district': {'write_only': True},
            'city': {'write_only': True}
        }

    @staticmethod
    def _normalize_location_value(value):
        if value is None:
            return ""
        return str(value).strip()

    @staticmethod
    def _looks_like_pk(value):
        s = PropertySerializer._normalize_location_value(value)
        return bool(s) and s.isdigit()

    @classmethod
    def _resolve_state(cls, value):
        """Accept a State pk (from admin UI) or a display name."""
        raw = cls._normalize_location_value(value)
        if not raw:
            return None
        if cls._looks_like_pk(raw):
            state = State.objects.filter(pk=int(raw)).first()
            if state:
                return state
        state = State.objects.filter(name__iexact=raw).first()
        if state:
            return state
        return State.objects.create(name=raw)

    @classmethod
    def _resolve_district(cls, value, state):
        """Accept a District pk (from admin UI) or a display name within `state`."""
        raw = cls._normalize_location_value(value)
        if not raw:
            return None
        if cls._looks_like_pk(raw):
            district = District.objects.filter(pk=int(raw), state=state).first()
            if district:
                return district
        district = District.objects.filter(name__iexact=raw, state=state).first()
        if district:
            return district
        return District.objects.create(name=raw, state=state)

    @classmethod
    def _resolve_city(cls, value, district):
        """Accept a City pk (from admin UI) or a display name within `district`."""
        raw = cls._normalize_location_value(value)
        if not raw:
            return None
        if cls._looks_like_pk(raw):
            city = City.objects.filter(pk=int(raw), district=district).first()
            if city:
                return city
        city = City.objects.filter(name__iexact=raw, district=district).first()
        if city:
            return city
        return City.objects.create(name=raw, district=district)

    def _location_dict(self, obj):
        """Human-readable state/district/city names for API responses."""
        return {
            "state": obj.state.name if obj.state_id else None,
            "district": obj.district.name if obj.district_id else None,
            "city": obj.city.name if obj.city_id else None,
        }

    def get_location(self, obj):
        return self._location_dict(obj)

    def get_distance_km(self, obj):
        d = getattr(obj, "distance_km", None)
        if d is None:
            return None
        try:
            return round(float(d), 2)
        except (TypeError, ValueError):
            return None

    def get_moderated_by_username(self, obj):
        u = obj.moderated_by
        if not u:
            return None
        full = u.get_full_name()
        return full.strip() if full and full.strip() else u.get_username()

    def get_property_video_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.property_video)

    def get_video_thumbnail_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.video_thumbnail)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get("request")
        if instance.property_video:
            rep["property_video_url"] = absolute_media_url(request, instance.property_video)
        else:
            rep["property_video_url"] = None
        rep["video_thumbnail_url"] = absolute_media_url(request, instance.video_thumbnail)
        rep.pop("property_video", None)
        rep.pop("video_thumbnail", None)
        rep["nearby_places_data"] = normalize_nearby_places_output(instance.nearby_places)
        loc = self._location_dict(instance)
        rep["location"] = loc
        rep["state_name"] = loc["state"]
        rep["district_name"] = loc["district"]
        rep["city_name"] = loc["city"]
        # Expose FK ids for edit forms (write uses CharField PK/name inputs).
        rep["state"] = instance.state_id
        rep["district"] = instance.district_id
        rep["city"] = instance.city_id
        return rep

    def validate_whatsapp_number(self, value):
        """Default the country code to +91 when none is supplied.

        If the number already starts with a country code ("+..."), keep it as
        entered. Otherwise prepend the default Indian country code.
        """
        if value is None:
            return value
        v = str(value).strip()
        if not v:
            return v
        if v.startswith("+"):
            return v
        # Strip any leading zeros/spaces commonly typed before a local number.
        digits = v.lstrip("0").strip()
        return f"+91{digits}"

    def validate_slug(self, value):
        if value is None:
            return ""
        v = str(value).strip()
        if not v:
            return ""
        try:
            exclude = self.instance.pk if getattr(self, "instance", None) and self.instance.pk else None
            return normalize_property_slug_input(v, exclude_pk=exclude)
        except ValueError as e:
            raise serializers.ValidationError(str(e)) from e

    BUILT_FIELDS = ("bedrooms", "bathrooms", "furnishing")
    BUILT_REQUIRED_FIELDS_SQFT = ()
    BUILT_INT_FIELDS = ("bedrooms", "bathrooms")
    OPTIONAL_BUILT_INT_FIELDS = ("bedrooms", "bathrooms")
    VALID_AREA_UNITS = frozenset({"sqft", "cent"})
    MAX_PROPERTY_IMAGES = 4

    @staticmethod
    def _is_blank_value(value):
        if value is None:
            return True
        if isinstance(value, str) and not str(value).strip():
            return True
        return False

    def _effective_area_unit(self, attrs):
        if "area_unit" in attrs:
            raw = attrs["area_unit"]
            return (raw or "sqft").strip().lower()
        if self.instance is not None:
            return (self.instance.area_unit or "sqft").strip().lower()
        return "sqft"

    def _merged_built_value(self, attrs, field):
        if field in attrs:
            return attrs[field]
        if self.instance is not None:
            return getattr(self.instance, field, None)
        return None

    def _switching_to_cent(self, attrs):
        if self.instance is None or "area_unit" not in attrs:
            return False
        new_unit = (attrs.get("area_unit") or "sqft").strip().lower()
        old_unit = (self.instance.area_unit or "sqft").strip().lower()
        return new_unit == "cent" and old_unit != "cent"

    def _normalize_positive_int(self, value, field_name):
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError({field_name: "Must be a positive integer."}) from None
        if parsed <= 0:
            raise serializers.ValidationError({field_name: "Must be a positive integer."})
        return parsed

    @staticmethod
    def _normalize_positive_decimal(value, field_name):
        try:
            parsed = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            raise serializers.ValidationError(
                {field_name: "Must be a positive number."}
            ) from None
        if parsed <= 0:
            raise serializers.ValidationError(
                {field_name: "Must be a positive number."}
            )
        return parsed

    @staticmethod
    def _normalize_non_negative_decimal(value, field_name):
        try:
            parsed = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            raise serializers.ValidationError(
                {field_name: "Must be zero or greater."}
            ) from None
        if parsed < 0:
            raise serializers.ValidationError(
                {field_name: "Must be zero or greater."}
            )
        return parsed

    def _normalize_area_fields(self, attrs):
        if "area" in attrs:
            if not attrs["area"]:
                raise serializers.ValidationError({"area": "At least one area value is required."})
        elif self.instance is None:
            raise serializers.ValidationError({"area": "This field is required."})

        if "area_cent" in attrs and attrs["area_cent"] is None:
            attrs["area_cent"] = None

    def _apply_cent_built_fields(self, attrs):
        switching_to_cent = self._switching_to_cent(attrs)
        is_create = self.instance is None
        for field in self.BUILT_FIELDS:
            if field in attrs:
                if self._is_blank_value(attrs[field]) or (
                    field in self.BUILT_INT_FIELDS and str(attrs[field]).strip() == "0"
                ):
                    attrs[field] = None
            elif is_create or switching_to_cent:
                attrs[field] = None

        for field in self.BUILT_INT_FIELDS:
            if field in attrs and attrs[field] is not None:
                attrs[field] = self._normalize_positive_int(attrs[field], field)

        if "furnishing" in attrs and attrs["furnishing"] is not None:
            attrs["furnishing"] = str(attrs["furnishing"]).strip()

    def _validate_sqft_built_fields(self, attrs):
        errors = {}
        for field in self.BUILT_REQUIRED_FIELDS_SQFT:
            value = self._merged_built_value(attrs, field)
            if self._is_blank_value(value):
                errors[field] = "This field is required when area_unit is sqft."
                continue
            if field in self.BUILT_INT_FIELDS:
                try:
                    parsed = int(value)
                except (TypeError, ValueError):
                    errors[field] = "Must be a positive integer."
                    continue
                if parsed <= 0:
                    errors[field] = "Must be a positive integer."
                    continue
                if field in attrs or self.instance is None:
                    attrs[field] = parsed
            elif field == "furnishing":
                if field in attrs or self.instance is None:
                    attrs[field] = str(value).strip()

        # bedrooms/bathrooms are optional too: blank or 0 means "not specified" -> None.
        for field in self.OPTIONAL_BUILT_INT_FIELDS:
            value = self._merged_built_value(attrs, field)
            if self._is_blank_value(value) or str(value).strip() == "0":
                if field in attrs or self.instance is None:
                    attrs[field] = None
                continue
            try:
                parsed = int(value)
            except (TypeError, ValueError):
                errors[field] = "Must be a positive integer."
                continue
            if parsed <= 0:
                errors[field] = "Must be a positive integer."
                continue
            if field in attrs or self.instance is None:
                attrs[field] = parsed

        if "furnishing" in attrs and attrs["furnishing"] is not None:
            attrs["furnishing"] = str(attrs["furnishing"]).strip()

        if errors:
            raise serializers.ValidationError(errors)

    def _normalize_built_year(self, attrs):
        """Optional free-form string; blank or 0 is stored as empty string."""
        if "built_year" in attrs:
            raw = attrs["built_year"]
            if self._is_blank_value(raw) or str(raw).strip() == "0":
                attrs["built_year"] = ""
            else:
                attrs["built_year"] = str(raw).strip()
        elif self.instance is None:
            attrs.setdefault("built_year", "")

    def validate(self, attrs):
        unit = self._effective_area_unit(attrs)
        if unit not in self.VALID_AREA_UNITS:
            raise serializers.ValidationError({"area_unit": "Must be 'sqft' or 'cent'."})

        if self.instance is None and "area_unit" not in attrs:
            attrs["area_unit"] = "sqft"
            unit = "sqft"

        if unit == "cent":
            self._apply_cent_built_fields(attrs)
        else:
            self._validate_sqft_built_fields(attrs)

        self._normalize_area_fields(attrs)
        self._normalize_built_year(attrs)
        self._validate_image_count(attrs)

        return attrs

    def _validate_image_count(self, attrs):
        """At most MAX_PROPERTY_IMAGES total; images are optional."""
        uploaded_images = attrs.get("uploaded_images", [])
        if not isinstance(uploaded_images, list):
            uploaded_images = [uploaded_images] if uploaded_images else []
        new_count = len(uploaded_images)

        if self.instance is None:
            existing_count = 0
        else:
            existing_count = self.instance.images.count()

        if existing_count + new_count > self.MAX_PROPERTY_IMAGES:
            raise serializers.ValidationError(
                {
                    "uploaded_images": (
                        f"A maximum of {self.MAX_PROPERTY_IMAGES} images is allowed"
                        + (f" (you already have {existing_count})." if existing_count else ".")
                    )
                }
            )

    def _process_location_data(self, data):
        """Helper method to process location data"""
        location_fields = {}
        
        state_name = data.pop('state', None)
        district_name = data.pop('district', None)
        city_name = data.pop('city', None)

        # For create operations, require all location fields
        if self.context['request'].method == 'POST':
            if not state_name:
                raise serializers.ValidationError({"state": "State is required"})
            if not district_name:
                raise serializers.ValidationError({"district": "District is required"})
            if not city_name:
                raise serializers.ValidationError({"city": "City is required"})

        # Clients may send location ids (admin selects) or display names.
        if state_name:
            state = self._resolve_state(state_name)
            location_fields["state"] = state

            if district_name:
                district = self._resolve_district(district_name, state)
                location_fields["district"] = district

                if city_name:
                    city = self._resolve_city(city_name, district)
                    location_fields["city"] = city

        return location_fields

    CONTACT_FIELDS = ("contact_name", "whatsapp_number", "phone_number", "email")

    @staticmethod
    def _is_blank_contact_value(value):
        return value is None or (isinstance(value, str) and not str(value).strip())

    @classmethod
    def _owner_contact_defaults(cls, user):
        """Contact details from the property owner's account / profile."""
        profile = getattr(user, "profile", None)
        full_name = (user.get_full_name() or "").strip()
        contact_name = full_name or user.get_username() or (user.email or "").strip()
        return {
            "contact_name": contact_name,
            "phone_number": ((profile.phone if profile else "") or "").strip(),
            "whatsapp_number": ((profile.whatsapp_number if profile else "") or "").strip(),
            "email": (user.email or "").strip(),
        }

    @classmethod
    def _owner_contact_validation_errors(cls, validated_data):
        """Require name, email, and at least one of phone or WhatsApp."""
        errors = {}
        if cls._is_blank_contact_value(validated_data.get("contact_name")):
            errors["contact_name"] = (
                "This field is required. Provide a value or complete your profile contact details."
            )
        if cls._is_blank_contact_value(validated_data.get("email")):
            errors["email"] = (
                "This field is required. Provide a value or complete your profile contact details."
            )
        if cls._is_blank_contact_value(validated_data.get("phone_number")) and cls._is_blank_contact_value(
            validated_data.get("whatsapp_number")
        ):
            errors["phone_number"] = (
                "Provide at least one contact number (phone or WhatsApp) on your profile."
            )
        return errors

    def _apply_owner_contact_defaults(self, validated_data, *, creator):
        """
        For owner-created listings, blank/omitted contact fields use the owner's profile.
        Staff must supply contact fields explicitly (or provide complete values).
        """
        if not creator or not getattr(creator, "is_authenticated", False):
            return validated_data

        is_owner_creator = not getattr(creator, "is_staff", False)
        owner_defaults = self._owner_contact_defaults(creator) if is_owner_creator else {}

        if is_owner_creator:
            for field in self.CONTACT_FIELDS:
                if self._is_blank_contact_value(validated_data.get(field)):
                    validated_data[field] = owner_defaults.get(field, "")
            errors = self._owner_contact_validation_errors(validated_data)
            if errors:
                raise serializers.ValidationError(errors)
            return validated_data

        # Contact name is optional for staff-managed listings; the remaining
        # contact fields still have to be supplied explicitly.
        errors = {}
        for field in self.CONTACT_FIELDS:
            if field == "contact_name":
                continue
            if self._is_blank_contact_value(validated_data.get(field)):
                errors[field] = (
                    "This field is required. Provide a value or complete your profile contact details."
                )

        if errors:
            raise serializers.ValidationError(errors)

        return validated_data

    def create(self, validated_data):
        request = self.context.get("request")
        creator = getattr(request, "user", None) if request else None
        validated_data = self._apply_owner_contact_defaults(validated_data, creator=creator)

        # remove_video is only meaningful on update; ignore on create.
        validated_data.pop('remove_video', None)

        # Process location data
        location_fields = self._process_location_data(validated_data)
        validated_data.update(location_fields)
        
        uploaded_images = validated_data.pop('uploaded_images', [])
        if not isinstance(uploaded_images, list):
            uploaded_images = [uploaded_images] if uploaded_images else []
        features = validated_data.pop('features', [])
        nearby_raw = validated_data.pop('nearby_places_data', None)
        if nearby_raw is not None:
            validated_data['nearby_places'] = nearby_raw

        slug_val = validated_data.get("slug")
        if not slug_val or (isinstance(slug_val, str) and not str(slug_val).strip()):
            validated_data["slug"] = generate_unique_property_slug(validated_data.get("title") or "")
        
        property_instance = Property.objects.create(**validated_data)
        
        # Add features
        if features:
            property_instance.features.set(features)
        
        _create_property_images(property_instance, uploaded_images)
        
        return property_instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        creator = getattr(request, "user", None) if request else None
        if creator and creator.is_authenticated and not creator.is_staff:
            defaults = self._owner_contact_defaults(creator)
            for field in self.CONTACT_FIELDS:
                if field in validated_data and self._is_blank_contact_value(validated_data.get(field)):
                    validated_data[field] = defaults.get(field, "")
            errors = self._owner_contact_validation_errors(
                {field: validated_data.get(field, getattr(instance, field, "")) for field in self.CONTACT_FIELDS}
            )
            if errors:
                raise serializers.ValidationError(errors)

        # Process location data
        location_fields = self._process_location_data(validated_data.copy())
        
        # Remove location string fields if they exist
        validated_data.pop('state', None)
        validated_data.pop('district', None)
        validated_data.pop('city', None)
        
        # Update location fields if they were processed
        if location_fields.get('state'):
            instance.state = location_fields['state']
        if location_fields.get('district'):
            instance.district = location_fields['district']
        if location_fields.get('city'):
            instance.city = location_fields['city']
        
        # Handle related fields
        uploaded_images = validated_data.pop('uploaded_images', [])
        features = validated_data.pop('features', None)
        remove_video = validated_data.pop('remove_video', False)
        nearby_raw = validated_data.pop('nearby_places_data', None)
        if nearby_raw is not None:
            validated_data['nearby_places'] = nearby_raw

        # Clear the uploaded video when requested and no replacement is supplied.
        # Property.save() removes the orphaned thumbnail when property_video is empty.
        if remove_video and 'property_video' not in validated_data:
            instance.property_video = None
            instance.video_processing_status = None

        if "slug" in validated_data:
            s = validated_data.get("slug")
            if not s or (isinstance(s, str) and not str(s).strip()):
                validated_data["slug"] = generate_unique_property_slug(instance.title or "", exclude_pk=instance.pk)
        
        # Update all other fields
        for attr, value in validated_data.items():
            if hasattr(instance, attr):
                setattr(instance, attr, value)
        
        # Save the instance after updating fields
        instance.save()
        
        # Update features if provided
        if features is not None:
            instance.features.set(features)
        
        if uploaded_images:
            _create_property_images(instance, uploaded_images)
        
        return instance

class HeroBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroBanner
        fields = ['id', 'image', 'created_at']

class OfferBannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = OfferBanner
        fields = ['id', 'image', 'created_at']


class AdminPanelImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = AdminPanelImage
        fields = [
            "id",
            "title",
            "image",
            "image_url",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_image_url(self, obj):
        return absolute_media_url(self.context.get("request"), obj.image)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        url = absolute_media_url(self.context.get("request"), instance.image)
        rep["image"] = url
        rep["image_url"] = url
        return rep

    def validate_title(self, value):
        title = (value or "").strip()
        if not title:
            raise serializers.ValidationError("Title is required.")
        if len(title) > 50:
            raise serializers.ValidationError("Title must be at most 50 characters.")
        return title

    def validate_image(self, value):
        if not value and (self.instance is None or not self.instance.image):
            raise serializers.ValidationError("Image file is required.")
        return value


class ContactSerializer(serializers.ModelSerializer):
    property = serializers.PrimaryKeyRelatedField(
        queryset=filter_public_video_ready(
            Property.objects.filter(moderation_status=Property.MODERATION_APPROVED)
        ),
        required=False,
        allow_null=True,
    )
    property_title = serializers.SerializerMethodField()
    email_sent = serializers.SerializerMethodField()
    notification_recipients = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            'id',
            'property',
            'property_title',
            'name',
            'email',
            'phone_number',
            'subject',
            'budget_range',
            'message',
            'created_at',
            'email_sent',
            'notification_recipients',
        ]
        read_only_fields = ['created_at', 'property_title', 'email_sent', 'notification_recipients']

    def get_property_title(self, obj):
        return obj.property.title if obj.property_id else ""

    def get_email_sent(self, obj):
        return getattr(obj, "_email_sent", None)

    def get_notification_recipients(self, obj):
        return getattr(obj, "_notification_recipients", [])

    def create(self, validated_data):
        contact = super().create(validated_data)
        sent, recipients = send_enquiry_notification(contact)
        contact._email_sent = sent
        contact._notification_recipients = recipients
        return contact


class TestimonialSerializer(serializers.ModelSerializer):
    initial = serializers.SerializerMethodField()

    class Meta:
        model = Testimonial
        fields = [
            "id",
            "client_name",
            "client_role",
            "testimonial_text",
            "rating",
            "avatar",
            "initial",
            "is_published",
            "display_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["initial", "created_at", "updated_at"]

    def get_initial(self, obj):
        return obj.initial


class TestimonialSectionSerializer(serializers.Serializer):
    tag = serializers.CharField()
    heading = serializers.CharField()
    description = serializers.CharField()


class SiteSettingsSerializer(serializers.ModelSerializer):
    ad_inject_after_every_n_properties = serializers.IntegerField(min_value=1, required=False)

    class Meta:
        model = SiteSettings
        fields = [
            "id",
            "filter_radius",
            "ad_inject_after_every_n_properties",
            "admin_phone",
            "admin_whatsapp",
            "company_email",
            "company_address",
            "testimonials_section_tag",
            "testimonials_section_heading",
            "testimonials_section_description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CompanyContactSerializer(serializers.Serializer):
    """Public read-only company contact info."""

    phone = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    address = serializers.CharField(read_only=True)
    whatsapp = serializers.CharField(read_only=True)


class CompanySettingsSerializer(serializers.Serializer):
    """Admin read/write company contact info (maps to SiteSettings singleton).

    ``phone`` and ``whatsapp`` are independent writable fields so the admin can
    publish a different WhatsApp number from the primary phone number.
    """

    phone = serializers.CharField(max_length=40, required=False, allow_blank=True)
    whatsapp = serializers.CharField(max_length=40, required=False, allow_blank=True)
    email = serializers.EmailField(max_length=254, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    def to_representation(self, instance):
        return {
            "phone": instance.admin_phone or "",
            "whatsapp": instance.admin_whatsapp or "",
            "email": instance.company_email or "",
            "address": instance.company_address or "",
        }

    def update(self, instance, validated_data):
        if "phone" in validated_data:
            instance.admin_phone = validated_data["phone"].strip()
        if "whatsapp" in validated_data:
            instance.admin_whatsapp = validated_data["whatsapp"].strip()
        if "email" in validated_data:
            instance.company_email = validated_data["email"].strip()
        if "address" in validated_data:
            instance.company_address = validated_data["address"].strip()
        instance.save()
        return instance


class MobileAppSettingsSerializer(serializers.Serializer):
    """Admin read/write per-platform mobile app version and force-update flags."""

    android_app_version = serializers.CharField(max_length=20, required=False, allow_blank=True)
    android_force_update = serializers.BooleanField(required=False)
    ios_app_version = serializers.CharField(max_length=20, required=False, allow_blank=True)
    ios_force_update = serializers.BooleanField(required=False)

    def to_representation(self, instance):
        return {
            "android_app_version": instance.android_app_version or "",
            "android_force_update": bool(instance.android_force_update),
            "ios_app_version": instance.ios_app_version or "",
            "ios_force_update": bool(instance.ios_force_update),
        }

    def update(self, instance, validated_data):
        if "android_app_version" in validated_data:
            instance.android_app_version = validated_data["android_app_version"].strip()
        if "android_force_update" in validated_data:
            instance.android_force_update = validated_data["android_force_update"]
        if "ios_app_version" in validated_data:
            instance.ios_app_version = validated_data["ios_app_version"].strip()
        if "ios_force_update" in validated_data:
            instance.ios_force_update = validated_data["ios_force_update"]
        instance.save()
        return instance


class PropertyLocationSerializer(serializers.Serializer):
    """Serializer for the property locations list endpoint (name + coordinates)."""
    location_name = serializers.CharField()
    latitude = serializers.DecimalField(max_digits=13, decimal_places=10)
    longitude = serializers.DecimalField(max_digits=13, decimal_places=10)
    state = serializers.CharField(required=False, allow_blank=True)
    district = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)


