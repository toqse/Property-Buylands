from django.urls import include, path
from rest_framework.routers import DefaultRouter

from advertisements.views import AdvertisementViewSet

router = DefaultRouter()
router.register(r"", AdvertisementViewSet, basename="advertisements")

urlpatterns = [
    path("active/", AdvertisementViewSet.as_view({"get": "active"}), name="ads-active"),
    path("", include(router.urls)),
]

