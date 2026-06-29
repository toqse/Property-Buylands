import json
import logging
from datetime import datetime, time
from decimal import Decimal, InvalidOperation
import math
from urllib.parse import urlencode

from django.db import IntegrityError
from django.db.models import F, Q, Case, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import serializers, viewsets, permissions, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response

from property_listing.video_constants import VIDEO_FAILED, VIDEO_PROCESSING, VIDEO_READY

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
from .api_responses import error_response, success_response
from .pagination import (
    AdminPanelImagePagination,
    CatalogPagination,
    LocationPagination,
    PropertyPagination,
    TestimonialLimitPagination,
)
from .serializers import (
    FeatureSerializer,
    PropertyTypeSerializer,
    PropertySerializer,
    PropertyVideoProcessingStatusSerializer,
    PropertyImageSerializer,
    StateSerializer,
    DistrictSerializer,
    CitySerializer,
    HeroBannerSerializer,
    OfferBannerSerializer,
    AdminPanelImageSerializer,
    ContactSerializer,
    SiteSettingsSerializer,
    CompanySettingsSerializer,
    MobileAppSettingsSerializer,
    PropertyLocationSerializer,
    TestimonialSerializer,
    TestimonialSectionSerializer,
)
from .utils import annotate_queryset_distance_km, cluster_property_locations, filter_public_video_ready
from advertisements.injector import inject_ads_into_results

class StateViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows states to be viewed or edited.
    GET methods (list and retrieve) are publicly accessible.
    Other methods require authentication.
    """
    queryset = State.objects.all()
    serializer_class = StateSerializer
    pagination_class = LocationPagination

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = []
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = State.objects.all().order_by('name')
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search.strip())
        return queryset

class DistrictViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows districts to be viewed or edited.
    """
    queryset = District.objects.all()
    serializer_class = DistrictSerializer
    pagination_class = LocationPagination

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = []
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        queryset = District.objects.select_related('state').all().order_by('name')
        state_id = self.request.query_params.get('state_id')
        if state_id:
            queryset = queryset.filter(state_id=state_id)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search.strip())
        return queryset

class CityViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows cities to be viewed or edited.
    """
    queryset = City.objects.all()
    serializer_class = CitySerializer
    pagination_class = LocationPagination

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = []
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        queryset = City.objects.all()
        district_id = self.request.query_params.get('district_id')
        if district_id:
            queryset = queryset.filter(district_id=district_id)
        return queryset

class FeatureViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows features to be viewed or edited.
    GET methods (list and retrieve) are publicly accessible.
    Other methods require authentication.
    """
    queryset = Feature.objects.all()
    serializer_class = FeatureSerializer
    pagination_class = CatalogPagination

    def get_queryset(self):
        qs = Feature.objects.all().order_by("name")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search.strip())
        return qs
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = []
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def update(self, request, *args, **kwargs):
        # Override to prevent PUT method
        return Response({"detail": "Method 'PUT' not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def partial_update(self, request, *args, **kwargs):
        # Use PATCH for updates
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class PropertyTypeViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows property types to be viewed or edited.
    GET methods (list and retrieve) are publicly accessible.
    Other methods require authentication.
    """
    queryset = PropertyType.objects.all()
    serializer_class = PropertyTypeSerializer
    pagination_class = CatalogPagination

    def get_queryset(self):
        qs = PropertyType.objects.all().order_by("name")
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search.strip())
        return qs
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = []
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def update(self, request, *args, **kwargs):
        # Override to prevent PUT method
        return Response({"detail": "Method 'PUT' not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def partial_update(self, request, *args, **kwargs):
        # Use PATCH for updates
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class PropertyViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows properties to be viewed or edited.
    GET methods (list and retrieve) are publicly accessible.
    Other methods require authentication.
    """
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    pagination_class = PropertyPagination

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'locations']:
            permission_classes = [permissions.AllowAny]
        elif self.action == 'mine':
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def list(self, request, *args, **kwargs):
        """
        Paginate with a fast ORDER BY on `properties_property` only, then reload that page
        with select_related + prefetch_related. A single JOIN+ORDER BY+LIMIT on Azure MySQL
        was taking several seconds; PK lookup + joins for ~10 rows is ~0.1s.
        """
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.prefetch_related(None)
        page = self.paginate_queryset(queryset)
        if page is not None:
            pks = [obj.pk for obj in page]
            if not pks:
                serializer = self.get_serializer([], many=True)
                return self.get_paginated_response(serializer.data)
            order = Case(*[When(pk=pk, then=i) for i, pk in enumerate(pks)])
            page_qs = (
                Property.objects.filter(pk__in=pks)
                .select_related('state', 'district', 'city', 'property_type', 'moderated_by')
                .prefetch_related('images', 'features')
                .order_by(order)
            )
            serializer = self.get_serializer(page_qs, many=True)
            include_ads = str(request.query_params.get("include_ads", "false")).strip().lower() in (
                "1",
                "true",
                "yes",
            )
            payload = serializer.data
            if include_ads:
                payload = inject_ads_into_results(payload, request)
            return self.get_paginated_response(payload)
        pks = list(queryset.values_list('pk', flat=True))
        if not pks:
            serializer = self.get_serializer([], many=True)
            return Response(serializer.data)
        order = Case(*[When(pk=pk, then=i) for i, pk in enumerate(pks)])
        full_qs = (
            Property.objects.filter(pk__in=pks)
            .select_related('state', 'district', 'city', 'property_type', 'moderated_by')
            .prefetch_related('images', 'features')
            .order_by(order)
        )
        serializer = self.get_serializer(full_qs, many=True)
        include_ads = str(request.query_params.get("include_ads", "false")).strip().lower() in (
            "1",
            "true",
            "yes",
        )
        payload = serializer.data
        if include_ads:
            payload = inject_ads_into_results(payload, request)
        return Response(payload)

    def _parse_json_field(self, raw):
        if raw is None or raw == "":
            return None
        if isinstance(raw, (list, dict)):
            return raw
        if isinstance(raw, str):
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return raw
        return raw

    def _normalize_features_list(self, features):
        if features is None:
            return []
        if isinstance(features, list):
            if len(features) == 1:
                parsed = self._parse_json_field(features[0])
                if isinstance(parsed, list):
                    return parsed
            return features
        parsed = self._parse_json_field(features)
        if isinstance(parsed, list):
            return parsed
        return [parsed] if parsed else []

    def _normalize_create_data(self, request):
        """Ensure uploaded_images and features are lists for multipart (multiple files/IDs)."""
        data = request.data
        has_multipart = hasattr(data, 'getlist')
        # Normalize uploaded_images to a list
        if has_multipart:
            files = data.getlist('uploaded_images')
            if not files and data.get('uploaded_images'):
                files = [data.get('uploaded_images')]
        else:
            files = data.get('uploaded_images')
            if not isinstance(files, list):
                files = [files] if files else []
        # Normalize features to a list (FormData sends multiple "features" keys; QueryDict.get returns only the last)
        if has_multipart:
            features = self._normalize_features_list(data.getlist('features') or None)
        else:
            features = self._normalize_features_list(data.get('features'))
        nearby_raw = self._parse_json_field(data.get('nearby_places_data'))
        out = {}
        for key in data:
            if key == 'uploaded_images':
                out[key] = files
            elif key == 'features':
                out[key] = features
            elif key == 'nearby_places_data':
                if nearby_raw is not None:
                    out['nearby_places_data'] = nearby_raw
            elif key == 'nearby_places':
                if nearby_raw is None:
                    out[key] = self._parse_json_field(data.get(key))
            else:
                out[key] = data.get(key)
        if nearby_raw is not None and 'nearby_places_data' not in out:
            out['nearby_places_data'] = nearby_raw
        return out

    def create(self, request, *args, **kwargs):
        try:
            data = self._normalize_create_data(request)
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except serializers.ValidationError:
            raise  # Let DRF return 400 with validation errors
        except IntegrityError as e:
            return Response(
                {"detail": "Invalid or duplicate data: " + str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logging.exception("Property create failed")
            return Response(
                {
                    "detail": str(e),
                    "error_type": type(e).__name__,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request, *args, **kwargs):
        return self._update_with_normalized_multipart(request, partial=False, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self._update_with_normalized_multipart(request, partial=True, **kwargs)

    def _update_with_normalized_multipart(self, request, partial=False, **kwargs):
        """PATCH/PUT multipart: normalize features[] and uploaded_images like create."""
        try:
            instance = self.get_object()
            data = self._normalize_create_data(request)
            serializer = self.get_serializer(instance, data=data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        except serializers.ValidationError:
            raise
        except IntegrityError as e:
            return Response(
                {"detail": "Invalid or duplicate data: " + str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logging.exception("Property update failed")
            return Response(
                {"detail": str(e), "error_type": type(e).__name__},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def perform_create(self, serializer):
        status_val = (
            Property.MODERATION_APPROVED
            if self.request.user.is_authenticated and self.request.user.is_staff
            else Property.MODERATION_PENDING
        )
        kwargs = {"moderation_status": status_val}
        if self.request.user.is_authenticated and not self.request.user.is_staff:
            kwargs["created_by"] = self.request.user
        serializer.save(**kwargs)

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request, *args, **kwargs):
        """Paginated listings for the authenticated owner (all moderation statuses)."""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response(
                {"detail": "Only staff can approve properties."},
                status=status.HTTP_403_FORBIDDEN,
            )
        prop = self.get_object()
        prop.moderation_status = Property.MODERATION_APPROVED
        prop.moderated_at = timezone.now()
        prop.moderated_by = request.user
        prop.save(update_fields=["moderation_status", "moderated_at", "moderated_by", "updated_at"])
        serializer = self.get_serializer(prop)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        if not request.user.is_authenticated or not request.user.is_staff:
            return Response(
                {"detail": "Only staff can reject properties."},
                status=status.HTTP_403_FORBIDDEN,
            )
        prop = self.get_object()
        prop.moderation_status = Property.MODERATION_REJECTED
        prop.moderated_at = timezone.now()
        prop.moderated_by = request.user
        prop.save(update_fields=["moderation_status", "moderated_at", "moderated_by", "updated_at"])
        serializer = self.get_serializer(prop)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="retry-video-processing")
    def retry_video_processing(self, request, pk=None):
        """Re-queue Celery compression for a failed uploaded video (owner or staff)."""
        prop = self.get_object()
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user.is_staff and prop.created_by_id != user.id:
            return Response(
                {"detail": "You do not have permission to retry this property video."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not prop.property_video:
            return Response(
                {"detail": "No video file to process."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if prop.video_processing_status != VIDEO_FAILED:
            return Response(
                {
                    "detail": (
                        "Video processing can only be retried when status is failed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        from property_listing.video_services import queue_video_processing

        prop.video_processing_status = VIDEO_PROCESSING
        prop.save(update_fields=["video_processing_status", "updated_at"])
        queue_video_processing("property", prop.pk)
        serializer = self.get_serializer(prop)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="video-processing-status")
    def video_processing_status(self, request):
        """Lightweight batch poll for video compression status (owner or staff)."""
        raw = (request.query_params.get("ids") or "").strip()
        if not raw:
            return Response({"results": []})

        ids = []
        for part in raw.split(","):
            part = part.strip()
            if part.isdigit():
                ids.append(int(part))
        ids = ids[:50]
        if not ids:
            return Response({"results": []})

        user = request.user
        queryset = Property.objects.filter(pk__in=ids).only(
            "id",
            "video_processing_status",
            "property_video",
            "video_thumbnail",
            "created_by_id",
        )
        if not user.is_staff:
            queryset = queryset.filter(created_by=user)

        serializer = PropertyVideoProcessingStatusSerializer(
            queryset,
            many=True,
            context={"request": request},
        )
        return Response({"results": serializer.data})

    @action(detail=False, methods=['get'], url_path='locations')
    def locations(self, request):
        """
        GET /api/properties/locations/
        Returns distinct property locations (name + lat/lng) with pagination and search.
        Same-name locations within filter_radius are merged; the first (newest) location's
        coordinates are shown. Ordered by most recently added first.
        Query params: page, page_size, search, property_for (optional: 'rent' or 'sell')
        """
        site_settings = SiteSettings.get_settings()
        filter_radius_km = float(site_settings.filter_radius)

        queryset = Property.objects.filter(
            moderation_status=Property.MODERATION_APPROVED,
            latitude__isnull=False,
            longitude__isnull=False,
        )
        queryset = filter_public_video_ready(queryset)

        property_for = (request.query_params.get('property_for') or '').strip().lower()
        if property_for in dict(Property.PROPERTY_FOR_CHOICES):
            queryset = queryset.filter(property_for=property_for)

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(state__name__icontains=search)
                | Q(district__name__icontains=search)
                | Q(city__name__icontains=search)
            )

        # Single query: only columns needed for clustering (no per-row select_related).
        rows = queryset.values(
            'state_id',
            'district_id',
            'city_id',
            'latitude',
            'longitude',
            'created_at',
            state_name=F('state__name'),
            district_name=F('district__name'),
            city_name=F('city__name'),
        ).order_by('-created_at')

        results = cluster_property_locations(rows, filter_radius_km)

        paginator = PropertyPagination()
        page_size = paginator.get_page_size(request)
        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (TypeError, ValueError):
            page = 1
        count = len(results)
        start = (page - 1) * page_size
        end = start + page_size
        page_results = results[start:end]

        serializer = PropertyLocationSerializer(page_results, many=True)
        base_url = request.build_absolute_uri(request.path)

        def pagination_url(p):
            params = {'page': p, 'page_size': page_size}
            if search:
                params['search'] = search
            if property_for:
                params['property_for'] = property_for
            return f"{base_url}?{urlencode(params)}"

        next_url = None if end >= count else pagination_url(page + 1)
        prev_url = None if page <= 1 else pagination_url(page - 1)

        return Response({
            "count": count,
            "filter_radius_km": filter_radius_km,
            "next": next_url,
            "previous": prev_url,
            "results": serializer.data,
        })

    def get_queryset(self):
        if self.action == "mine":
            user = self.request.user
            if not user.is_authenticated:
                return Property.objects.none()
            queryset = (
                Property.objects.filter(created_by=user)
                .select_related("state", "district", "city", "property_type", "moderated_by")
                .prefetch_related("images", "features")
            )
            search = (self.request.query_params.get("search") or "").strip()
            if search:
                search_terms = [term for term in search.split() if term.strip()]
                combined_query = Q()
                for term in search_terms:
                    term_query = (
                        Q(title__icontains=term)
                        | Q(description__icontains=term)
                        | Q(property_type__name__icontains=term)
                        | Q(features__name__icontains=term)
                        | Q(state__name__icontains=term)
                        | Q(district__name__icontains=term)
                        | Q(city__name__icontains=term)
                        | Q(property_for__icontains=term)
                        | Q(property_ownership__icontains=term)
                        | Q(furnishing__icontains=term)
                        | Q(moderation_status__icontains=term)
                        | Q(price__icontains=term)
                    )
                    combined_query &= term_query if combined_query else term_query
                if search_terms:
                    queryset = queryset.filter(combined_query).distinct()
            return queryset.order_by("-created_at")

        queryset = super().get_queryset()
        user = self.request.user
        staff = user.is_authenticated and user.is_staff

        if self.action in ("update", "partial_update", "destroy", "delete_image"):
            if staff:
                pass
            elif user.is_authenticated:
                queryset = queryset.filter(created_by=user)
            else:
                queryset = queryset.none()
        elif staff:
            if self.action == 'list':
                ms = (self.request.query_params.get('moderation_status') or 'all').strip().lower()
                if ms in (
                    Property.MODERATION_PENDING,
                    Property.MODERATION_APPROVED,
                    Property.MODERATION_REJECTED,
                ):
                    queryset = queryset.filter(moderation_status=ms)
        elif self.action == 'list':
            queryset = queryset.filter(moderation_status=Property.MODERATION_APPROVED)
            queryset = filter_public_video_ready(queryset)
        else:
            if user.is_authenticated:
                video_ready_q = (
                    Q(property_video__isnull=True)
                    | Q(property_video="")
                    | Q(video_processing_status=VIDEO_READY)
                )
                queryset = queryset.filter(
                    Q(created_by=user)
                    | (
                        Q(moderation_status=Property.MODERATION_APPROVED)
                        & video_ready_q
                    )
                )
            else:
                queryset = queryset.filter(
                    moderation_status=Property.MODERATION_APPROVED
                )
                queryset = filter_public_video_ready(queryset)
        # list: avoid select_related — combined JOIN + ORDER BY + LIMIT made Azure MySQL use a ~4s plan.
        # Other actions still prefetch FKs in one round-trip per object.
        if self.action != 'list':
            queryset = queryset.select_related(
                'state', 'district', 'city', 'property_type', 'moderated_by'
            )
        params = self.request.query_params

        price_min = params.get('price_min')
        price_max = params.get('price_max')
        property_for = params.get('property_for')
        ownership = params.get('ownership')
        area_min = params.get('area_min')
        area_max = params.get('area_max')
        area_cent_min = params.get('area_cent_min')
        area_cent_max = params.get('area_cent_max')
        area_unit_param = params.get('area_unit')
        area_unit = (area_unit_param or '').strip().lower() or None
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        property_type = params.get('property_type')
        bedrooms_min = params.get('bedrooms_min')
        bedrooms_max = params.get('bedrooms_max')
        bathrooms_min = params.get('bathrooms_min')
        bathrooms_max = params.get('bathrooms_max')
        state_id = params.get('state_id')
        district_id = params.get('district_id')
        city_id = params.get('city_id')
        location = params.get('location')
        furnishing = params.get('furnishing')
        project_status = params.get('project_status')
        floors = params.get('floors')
        sighting = params.get('sighting')
        parking_spaces_min = params.get('parking_spaces_min')
        search = params.get('search')
        # Search OR-clauses include features (M2M); DISTINCT is required then only.
        # Unconditional DISTINCT made every list query a heavy SELECT DISTINCT over Azure MySQL (~4s+).
        search_needs_distinct = False

        # Latitude/Longitude filtering parameters
        latitude = params.get('latitude')
        longitude = params.get('longitude')
        radius = params.get('radius')  # in kilometers
        lat_min = params.get('lat_min')
        lat_max = params.get('lat_max')
        lng_min = params.get('lng_min')
        lng_max = params.get('lng_max')

        def convert_decimal(value):
            try:
                return Decimal(value)
            except (InvalidOperation, TypeError):
                return None

        def convert_int(value):
            try:
                return int(value)
            except (TypeError, ValueError):
                return None

        # Price filtering: price is TextField and can contain non-numeric values
        # Apply filtering in Python for rows where price is a pure numeric string
        price_min_decimal = convert_decimal(price_min)
        price_max_decimal = convert_decimal(price_max)
        if price_min_decimal is not None or price_max_decimal is not None:
            # Invalid range: min > max returns no results
            if (
                price_min_decimal is not None
                and price_max_decimal is not None
                and price_min_decimal > price_max_decimal
            ):
                return queryset.none()

            matching_ids = []
            for row in queryset.values("id", "price"):
                raw_price = (row.get("price") or "").strip()
                try:
                    numeric_price = Decimal(raw_price)
                except (InvalidOperation, TypeError):
                    # Skip non-numeric prices like "75 lakh", "Negotiable", etc.
                    continue

                if price_min_decimal is not None and numeric_price < price_min_decimal:
                    continue
                if price_max_decimal is not None and numeric_price > price_max_decimal:
                    continue

                matching_ids.append(row["id"])

            if not matching_ids:
                return queryset.none()

            queryset = queryset.filter(id__in=matching_ids)

        if property_for in dict(Property.PROPERTY_FOR_CHOICES):
            queryset = queryset.filter(property_for=property_for)

        is_featured_param = params.get('is_featured')
        if is_featured_param is not None:
            val = str(is_featured_param).strip().lower()
            if val in ('true', '1', 'yes'):
                queryset = queryset.filter(is_featured=True)
            elif val in ('false', '0', 'no'):
                queryset = queryset.filter(is_featured=False)

        if ownership:
            queryset = queryset.filter(property_ownership__iexact=ownership)

        if furnishing:
            queryset = queryset.filter(furnishing__iexact=furnishing)

        if project_status:
            queryset = queryset.filter(project_status__iexact=project_status)

        if floors:
            queryset = queryset.filter(floors__icontains=floors)

        if sighting:
            queryset = queryset.filter(sighting__iexact=sighting)

        parking_spaces_min_value = convert_int(parking_spaces_min)
        if parking_spaces_min_value is not None:
            queryset = queryset.filter(parking_spaces__gte=parking_spaces_min_value)

        # Area filtering - filter by matching area_unit and area value (no conversion)
        # Get valid area unit choices as a set for efficient lookup
        valid_area_units = {choice[0] for choice in Property.AREA_UNIT_CHOICES}
        
        # Filter by area_unit if provided and valid
        if area_unit and area_unit in valid_area_units:
            queryset = queryset.filter(area_unit=area_unit)
            
            # Apply area_min and area_max filters only when area_unit is specified
            # This ensures we're comparing within the same unit
            area_min_value = convert_decimal(area_min)
            if area_min_value is not None:
                queryset = queryset.filter(area__gte=area_min_value)

            area_max_value = convert_decimal(area_max)
            if area_max_value is not None:
                queryset = queryset.filter(area__lte=area_max_value)
        elif area_min or area_max:
            # If area_min/area_max are provided but area_unit is not, 
            # default to 'sqft' for backward compatibility
            queryset = queryset.filter(area_unit='sqft')
            area_min_value = convert_decimal(area_min)
            if area_min_value is not None:
                queryset = queryset.filter(area__gte=area_min_value)

            area_max_value = convert_decimal(area_max)
            if area_max_value is not None:
                queryset = queryset.filter(area__lte=area_max_value)

        area_cent_min_value = convert_decimal(area_cent_min)
        if area_cent_min_value is not None:
            queryset = queryset.filter(area_cent__gte=area_cent_min_value)

        area_cent_max_value = convert_decimal(area_cent_max)
        if area_cent_max_value is not None:
            queryset = queryset.filter(area_cent__lte=area_cent_max_value)

        if date_from:
            parsed_date = parse_date(date_from)
            if parsed_date:
                start_datetime = timezone.make_aware(datetime.combine(parsed_date, time.min))
                queryset = queryset.filter(created_at__gte=start_datetime)

        if date_to:
            parsed_date = parse_date(date_to)
            if parsed_date:
                end_datetime = timezone.make_aware(datetime.combine(parsed_date, time.max))
                queryset = queryset.filter(created_at__lte=end_datetime)

        # Support single ID or multiple: property_type=1 or property_type=1,2,3 or property_type=1&property_type=2
        property_type_ids = None
        if property_type is not None:
            # getlist handles repeated params: ?property_type=1&property_type=2
            raw_values = self.request.query_params.getlist('property_type') or [property_type]
            # Also support comma-separated in first value: ?property_type=1,2,3
            parsed = []
            for raw in raw_values:
                for part in str(raw).split(','):
                    part = part.strip()
                    if part:
                        pid = convert_int(part)
                        if pid is not None:
                            parsed.append(pid)
            if parsed:
                property_type_ids = list(dict.fromkeys(parsed))  # unique, preserve order
        if property_type_ids is not None:
            queryset = queryset.filter(property_type_id__in=property_type_ids)

        bedrooms_min_value = convert_int(bedrooms_min)
        if bedrooms_min_value is not None:
            queryset = queryset.filter(bedrooms__gte=bedrooms_min_value)

        bedrooms_max_value = convert_int(bedrooms_max)
        if bedrooms_max_value is not None:
            queryset = queryset.filter(bedrooms__lte=bedrooms_max_value)

        bathrooms_min_value = convert_int(bathrooms_min)
        if bathrooms_min_value is not None:
            queryset = queryset.filter(bathrooms__gte=bathrooms_min_value)

        bathrooms_max_value = convert_int(bathrooms_max)
        if bathrooms_max_value is not None:
            queryset = queryset.filter(bathrooms__lte=bathrooms_max_value)

        # Feature filtering (IDs): supports
        #   ?features=1
        #   ?features=1,2
        #   ?features=1&features=2
        # Each selected feature must be present (AND) by feature FK id.
        feature_ids = None
        features_param = params.get("features")
        if features_param is not None:
            # getlist handles repeated params: ?features=1&features=2
            raw_values = self.request.query_params.getlist("features") or [features_param]
            parsed: list[int] = []
            for raw in raw_values:
                for part in str(raw).split(","):
                    part = part.strip()
                    if part:
                        fid = convert_int(part)
                        if fid is not None:
                            parsed.append(fid)
            if parsed:
                feature_ids = list(dict.fromkeys(parsed))  # unique, preserve order
        if feature_ids is not None:
            for feature_id in feature_ids:
                queryset = queryset.filter(features__id=feature_id)
            search_needs_distinct = True

        state_value = convert_int(state_id)
        if state_value is not None:
            queryset = queryset.filter(state_id=state_value)

        district_value = convert_int(district_id)
        if district_value is not None:
            queryset = queryset.filter(district_id=district_value)

        city_value = convert_int(city_id)
        if city_value is not None:
            queryset = queryset.filter(city_id=city_value)

        if location:
            queryset = queryset.filter(
                Q(city__name__icontains=location)
                | Q(district__name__icontains=location)
                | Q(state__name__icontains=location)
            )

        if search:
            search_terms = [term.strip() for term in search.split() if term.strip()]
            if search_terms:
                combined_query = Q()
                for term in search_terms:
                    # Note: nearby_places is JSONField; icontains is not supported, so it's excluded from search
                    term_query = (
                        Q(title__icontains=term)
                        | Q(description__icontains=term)
                        | Q(property_type__name__icontains=term)
                        | Q(contact_name__icontains=term)
                        | Q(features__name__icontains=term)
                        | Q(state__name__icontains=term)
                        | Q(district__name__icontains=term)
                        | Q(city__name__icontains=term)
                        | Q(property_for__icontains=term)
                        | Q(property_ownership__icontains=term)
                        | Q(furnishing__icontains=term)
                        | Q(price__icontains=term)
                    )
                    combined_query &= term_query if combined_query else term_query
                queryset = queryset.filter(combined_query)
                search_needs_distinct = True

        # Latitude/Longitude filtering
        lat_min_value = convert_decimal(lat_min)
        lat_max_value = convert_decimal(lat_max)
        lng_min_value = convert_decimal(lng_min)
        lng_max_value = convert_decimal(lng_max)
        lat_value = convert_decimal(latitude)
        lng_value = convert_decimal(longitude)
        radius_value = convert_decimal(radius)
        
        # Check if any lat/lng filtering is being applied
        has_lat_lng_filter = any([
            lat_min_value is not None,
            lat_max_value is not None,
            lng_min_value is not None,
            lng_max_value is not None,
            (lat_value is not None and lng_value is not None)
        ])
        
        # Only filter by coordinates if lat/lng filters are being used
        if has_lat_lng_filter:
            # Ensure we only filter properties that have coordinates
            queryset = queryset.filter(latitude__isnull=False, longitude__isnull=False)
            
            # Bounding box filtering
            if lat_min_value is not None:
                queryset = queryset.filter(latitude__gte=lat_min_value)
            if lat_max_value is not None:
                queryset = queryset.filter(latitude__lte=lat_max_value)
            if lng_min_value is not None:
                queryset = queryset.filter(longitude__gte=lng_min_value)
            if lng_max_value is not None:
                queryset = queryset.filter(longitude__lte=lng_max_value)
            
            # Distance-based filtering (using bounding box approximation for efficiency)
            # This finds properties within a radius (in km) from a given point
            if lat_value is not None and lng_value is not None:
                # Determine which radius to use: query parameter or admin-defined default
                if radius_value is not None:
                    # Use the radius from query parameter (override admin setting)
                    radius_to_use = radius_value
                else:
                    # Use the admin-defined filter_radius from SiteSettings
                    site_settings = SiteSettings.get_settings()
                    radius_to_use = Decimal(str(site_settings.filter_radius))
                
                # Convert radius from km to degrees (approximate)
                # 1 degree latitude ≈ 111 km
                # 1 degree longitude ≈ 111 km * cos(latitude); avoid division by zero near poles
                lat_degree = radius_to_use / Decimal('111.0')
                cos_lat = abs(math.cos(math.radians(float(lat_value))))
                lng_degree = radius_to_use / (Decimal('111.0') * Decimal(str(cos_lat))) if cos_lat >= 1e-9 else Decimal('0')
                
                # Create bounding box
                queryset = queryset.filter(
                    latitude__gte=lat_value - lat_degree,
                    latitude__lte=lat_value + lat_degree,
                    longitude__gte=lng_value - lng_degree,
                    longitude__lte=lng_value + lng_degree
                )

        ordering_param = (params.get("ordering") or "").strip().lower()
        if lat_value is not None and lng_value is not None:
            queryset = annotate_queryset_distance_km(queryset, lat_value, lng_value)
            if ordering_param in ("", "distance"):
                queryset = queryset.order_by("distance_km")
            elif ordering_param == "price":
                queryset = queryset.order_by("price")
            elif ordering_param == "-price":
                queryset = queryset.order_by("-price")
            elif ordering_param == "created_at":
                queryset = queryset.order_by("created_at")
            else:
                queryset = queryset.order_by("-created_at")
        elif ordering_param == "price":
            queryset = queryset.order_by("price")
        elif ordering_param == "-price":
            queryset = queryset.order_by("-price")
        elif ordering_param == "created_at":
            queryset = queryset.order_by("created_at")
        else:
            queryset = queryset.order_by("-created_at")
        if search_needs_distinct:
            queryset = queryset.distinct()
        # Avoid N+1 when serializing nested images and features (critical with remote DB).
        if self.action in ('list', 'retrieve'):
            queryset = queryset.prefetch_related('images', 'features')
        return queryset

    def get_object(self):
        """
        Detail URL `{pk}` may be a numeric primary key or a non-numeric `slug`.
        All-digit values are resolved as integer pk so digit-only slugs are not used.
        """
        queryset = self.filter_queryset(self.get_queryset())
        lookup = self.kwargs.get(self.lookup_url_kwarg or self.lookup_field or "pk")
        s = "" if lookup is None else str(lookup).strip()
        if s.isdigit():
            return get_object_or_404(queryset, pk=int(s))
        return get_object_or_404(queryset, slug=s)

    @action(detail=True, methods=['delete'])
    def delete_image(self, request, pk=None):
        """
        Delete a specific image from a property.
        Pass image_id in JSON body (e.g. {"image_id": 1}) or as query param (?image_id=1).
        """
        property_obj = self.get_object()
        # Accept image_id from body or query params (DELETE often has no body)
        image_id = None
        try:
            image_id = request.data.get('image_id') if request.data else None
        except Exception:
            pass
        if image_id is None:
            image_id = request.query_params.get('image_id')
        if image_id is None:
            return Response(
                {"detail": "image_id is required. Pass it in the request body or as query param (e.g. ?image_id=1)."},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            image_id = int(image_id)
        except (TypeError, ValueError):
            return Response(
                {"detail": "image_id must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            image = PropertyImage.objects.get(id=image_id, property=property_obj)
            image.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PropertyImage.DoesNotExist:
            return Response(
                {"detail": "Image not found or does not belong to this property."},
                status=status.HTTP_404_NOT_FOUND
            )

class HeroBannerViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows hero banners to be viewed or edited.
    GET methods (list and retrieve) are publicly accessible.
    Other methods require authentication.
    """
    queryset = HeroBanner.objects.all().order_by('-created_at')
    serializer_class = HeroBannerSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = []
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        # Delete all existing banners before creating new one
        HeroBanner.objects.all().delete()
        return super().create(request, *args, **kwargs)

class OfferBannerViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows offer banners to be viewed or edited.
    GET methods (list and retrieve) are publicly accessible.
    Other methods require authentication.
    """
    queryset = OfferBanner.objects.all().order_by('-created_at')
    serializer_class = OfferBannerSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = []
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        # Delete all existing banners before creating new one
        OfferBanner.objects.all().delete()
        return super().create(request, *args, **kwargs)

class ContactViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows contacts to be created by users and managed by admins.
    POST: Public access - Anyone can submit a contact form
    GET / retrieve: Staff see all; authenticated owners see enquiries for their listings only.
    DELETE: Admin only.
    """
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer

    def get_queryset(self):
        qs = Contact.objects.all().select_related("property")
        user = self.request.user
        if not user.is_authenticated:
            return Contact.objects.none()
        if user.is_staff:
            return qs
        return qs.filter(property__created_by=user)

    def get_permissions(self):
        if self.action == 'create':  # POST request
            permission_classes = [permissions.AllowAny]
        elif self.action == 'destroy':
            permission_classes = [permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def update(self, request, *args, **kwargs):
        # Prevent PUT and PATCH methods
        return Response({"detail": "Method not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def partial_update(self, request, *args, **kwargs):
        # Prevent PUT and PATCH methods
        return Response({"detail": "Method not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

def _testimonials_section_payload():
    s = SiteSettings.get_settings()
    return {
        "tag": s.testimonials_section_tag,
        "heading": s.testimonials_section_heading,
        "description": s.testimonials_section_description,
    }


class TestimonialViewSet(viewsets.ModelViewSet):
    """
    Client testimonials for the home page.
    GET list/retrieve: public, tokenless; list returns only published items for anonymous users.
    Pagination: ``?page=1&limit=3`` with ``total_count``, ``current_page``, ``total_pages``.
    POST/PATCH/PUT/DELETE: authenticated admin/staff.
    """
    queryset = Testimonial.objects.all()
    serializer_class = TestimonialSerializer
    pagination_class = TestimonialLimitPagination

    def get_queryset(self):
        qs = Testimonial.objects.all().order_by("display_order", "-created_at")
        user = self.request.user
        if self.action in ("list", "retrieve") and not (user.is_authenticated and user.is_staff):
            qs = qs.filter(is_published=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        section = TestimonialSectionSerializer(_testimonials_section_payload()).data
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.paginator.get_paginated_response(serializer.data, section=section)
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "section": section,
                "total_count": len(serializer.data),
                "current_page": 1,
                "total_pages": 1,
                "results": serializer.data,
            }
        )


class SiteSettingsViewSet(viewsets.GenericViewSet, mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    """
    API endpoint for managing site settings (singleton pattern).
    GET and PATCH full settings require admin authentication.
    GET site-contact is public (admin phone / WhatsApp for listing pages).
    """
    queryset = SiteSettings.objects.all()
    serializer_class = SiteSettingsSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'pk'
    lookup_url_kwarg = None

    def get_permissions(self):
        if getattr(self, "action", None) == "site_contact":
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def site_contact(self, request, *args, **kwargs):
        s = SiteSettings.get_settings()
        return Response(
            {
                "admin_phone": s.admin_phone or "",
                "admin_whatsapp": s.admin_whatsapp or "",
                "email": s.company_email or "",
                "address": s.company_address or "",
            }
        )
    
    def get_object(self):
        """
        Always return the singleton instance (pk=1).
        """
        return SiteSettings.get_settings()
    
    def retrieve(self, request, *args, **kwargs):
        """
        GET /api/properties/site-settings/
        Get the current site settings (admin only).
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        """
        PATCH /api/properties/site-settings/
        Update the site settings (admin only).
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """
        PUT method is not allowed - use PATCH instead.
        """
        return Response(
            {"detail": "Method 'PUT' not allowed. Use 'PATCH' instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )


def _company_contact_payload(s):
    return {
        "phone": s.admin_phone or "",
        "email": s.company_email or "",
        "address": s.company_address or "",
        "whatsapp": s.admin_whatsapp or "",
    }


class CompanySettingsViewSet(viewsets.GenericViewSet, mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    """Admin GET/PATCH for company phone, email, and address. Public read: company-contact/."""
    queryset = SiteSettings.objects.all()
    serializer_class = CompanySettingsSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_object(self):
        return SiteSettings.get_settings()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Method 'PUT' not allowed. Use 'PATCH' instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class CompanyContactViewSet(viewsets.GenericViewSet):
    """Public GET for company phone, email, address, and WhatsApp."""

    queryset = SiteSettings.objects.all()
    permission_classes = [permissions.AllowAny]

    def company_contact(self, request, *args, **kwargs):
        s = SiteSettings.get_settings()
        return Response(_company_contact_payload(s))


def _mobile_app_version_payload(s):
    return {
        "android_app_version": s.android_app_version or "",
        "android_force_update": bool(s.android_force_update),
        "ios_app_version": s.ios_app_version or "",
        "ios_force_update": bool(s.ios_force_update),
    }


class MobileAppSettingsViewSet(viewsets.GenericViewSet, mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    """Admin GET/PATCH for mobile app version and force-update flag."""

    queryset = SiteSettings.objects.all()
    serializer_class = MobileAppSettingsSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_object(self):
        return SiteSettings.get_settings()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Method 'PUT' not allowed. Use 'PATCH' instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class MobileAppVersionViewSet(viewsets.GenericViewSet):
    """Public GET for mobile app version and force-update flag."""

    queryset = SiteSettings.objects.all()
    permission_classes = [permissions.AllowAny]

    def mobile_app_version(self, request, *args, **kwargs):
        s = SiteSettings.get_settings()
        return Response(_mobile_app_version_payload(s))


def _parse_bulk_titles(request, file_count):
    """Parse title(s) from multipart or JSON for single or bulk image upload."""
    titles = list(request.data.getlist("titles"))
    if not titles:
        raw = request.data.get("titles")
        if isinstance(raw, str) and raw.strip():
            try:
                parsed = json.loads(raw)
                titles = parsed if isinstance(parsed, list) else [raw]
            except json.JSONDecodeError:
                titles = [raw]
        elif isinstance(raw, list):
            titles = raw
    if len(titles) == 1:
        raw = str(titles[0]).strip()
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    titles = parsed
            except json.JSONDecodeError:
                pass
    if not titles and file_count == 1:
        single = request.data.get("title")
        if single is not None and str(single).strip():
            titles = [str(single).strip()]
    return [str(t).strip() for t in titles]


class AdminPanelImageViewSet(viewsets.ModelViewSet):
    """
    Admin panel gallery images (max 5 system-wide).
    GET list/detail: public, mobile-friendly paginated JSON.
    POST/PATCH/DELETE: admin only. POST supports single or bulk multipart upload.
    """

    queryset = AdminPanelImage.objects.all()
    serializer_class = AdminPanelImageSerializer
    pagination_class = AdminPanelImagePagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def _serialized(self, instance):
        return self.get_serializer(instance).data

    def _serialized_many(self, instances):
        return self.get_serializer(instances, many=True).data

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            data = self._serialized_many(page)
            return self.paginator.get_paginated_response(
                data,
                max_allowed=AdminPanelImage.MAX_COUNT,
            )
        data = self._serialized_many(queryset)
        return Response(
            {
                "success": True,
                "message": "Images retrieved successfully.",
                "max_allowed": AdminPanelImage.MAX_COUNT,
                "total_count": len(data),
                "current_page": 1,
                "total_pages": 1,
                "results": data,
            }
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return success_response(
            message="Image retrieved successfully.",
            data=self._serialized(instance),
        )

    @staticmethod
    def _collect_uploaded_files(request):
        files = list(request.FILES.getlist("images"))
        if not files:
            files = list(request.FILES.getlist("image"))
        if not files:
            single = request.FILES.get("image")
            if single:
                files = [single]
        if not files:
            index = 0
            while True:
                key = f"image_{index}"
                if key not in request.FILES:
                    break
                files.append(request.FILES[key])
                index += 1
        return files

    def create(self, request, *args, **kwargs):
        files = self._collect_uploaded_files(request)

        if not files:
            return error_response(
                message="At least one image file is required.",
                errors={"image": ["Upload 'image' or 'images'."]},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        titles = _parse_bulk_titles(request, len(files))
        if len(titles) != len(files):
            return error_response(
                message="Each image must have a matching title.",
                errors={
                    "titles": [
                        f"Expected {len(files)} title(s) for {len(files)} image(s), got {len(titles)}."
                    ]
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        for i, title in enumerate(titles):
            if not title:
                return error_response(
                    message="Title is required for every image.",
                    errors={"titles": [f"Title at index {i} is empty."]},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            if len(title) > 50:
                return error_response(
                    message="Title must be at most 50 characters.",
                    errors={"titles": [f"Title at index {i} exceeds 50 characters."]},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        current_count = AdminPanelImage.objects.count()
        if current_count + len(files) > AdminPanelImage.MAX_COUNT:
            remaining = max(0, AdminPanelImage.MAX_COUNT - current_count)
            return error_response(
                message=(
                    f"Cannot add {len(files)} image(s). "
                    f"Maximum is {AdminPanelImage.MAX_COUNT} total "
                    f"({remaining} slot(s) remaining)."
                ),
                errors={
                    "images": [
                        f"System limit is {AdminPanelImage.MAX_COUNT} images. "
                        f"Currently {current_count}, tried to add {len(files)}."
                    ]
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        for index, (title, upload) in enumerate(zip(titles, files)):
            order = request.data.get("display_order")
            if order is None:
                order = current_count + index
            else:
                try:
                    order = int(order) + index
                except (TypeError, ValueError):
                    order = current_count + index
            payload = {
                "title": title,
                "image": upload,
                "display_order": order,
            }
            serializer = self.get_serializer(data=payload)
            serializer.is_valid(raise_exception=True)
            created.append(serializer.save())

        if len(created) == 1:
            return success_response(
                message="Image created successfully.",
                data=self._serialized(created[0]),
                status_code=status.HTTP_201_CREATED,
            )

        return success_response(
            message=f"{len(created)} images created successfully.",
            data=self._serialized_many(created),
            status_code=status.HTTP_201_CREATED,
            count=len(created),
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        instance.refresh_from_db()
        return success_response(
            message="Image updated successfully.",
            data=self._serialized(instance),
        )

    def update(self, request, *args, **kwargs):
        return Response(
            {"success": False, "message": "Method 'PUT' not allowed. Use PATCH."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        title = instance.title
        instance.delete()
        return success_response(message=f'Image "{title}" deleted successfully.')
