from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminPanelImageViewSet,
    FeatureViewSet, PropertyTypeViewSet, PropertyViewSet,
    StateViewSet, DistrictViewSet, CityViewSet,
    HeroBannerViewSet, OfferBannerViewSet, ContactViewSet,
    SiteSettingsViewSet, CompanySettingsViewSet, CompanyContactViewSet,
    TestimonialViewSet,
)

router = DefaultRouter()
router.register(r'states', StateViewSet)
router.register(r'districts', DistrictViewSet)
router.register(r'cities', CityViewSet)
router.register(r'features', FeatureViewSet)
router.register(r'property-types', PropertyTypeViewSet)
router.register(r'properties', PropertyViewSet)
router.register(r'hero-banners', HeroBannerViewSet)
router.register(r'offer-banners', OfferBannerViewSet)
router.register(r'admin-images', AdminPanelImageViewSet, basename='admin-images')
router.register(r'contacts', ContactViewSet)
router.register(r'testimonials', TestimonialViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Property locations list (GET) at /api/properties/locations/
    path('locations/', PropertyViewSet.as_view(actions={'get': 'locations'}), name='property-locations'),
    # Custom URL for singleton site-settings endpoint
    path('site-settings/', SiteSettingsViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}), name='site-settings'),
    path('site-contact/', SiteSettingsViewSet.as_view({'get': 'site_contact'}), name='site-contact'),
    path('company-settings/', CompanySettingsViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}), name='company-settings'),
    path('company-contact/', CompanyContactViewSet.as_view({'get': 'company_contact'}), name='company-contact'),
]

