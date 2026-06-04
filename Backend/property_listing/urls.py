"""
URL configuration for property_listing project.

Canonical account URLs from `apidoc.txt` are declared here first so they always match
before the `api/accounts/` include (avoids subtle routing / duplicate-app issues).
"""
import re

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings

from property_listing.media_serve import serve_media

from accounts.views import (
    ForgotPasswordView,
    LoginView,
    LoginOtpRequestView,
    LoginOtpVerifyView,
    LogoutView,
    OwnerRegisterInitView,
    OwnerRegisterVerifyView,
    ProfileEmailChangeRequestView,
    ProfileView,
    PropertyOwnerAdminViewSet,
    RegisterView,
    ResetPasswordView,
    VerifyOTPView,
)
from property_listing.views import api_meta

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/_meta/", api_meta, name="api-meta"),
    # --- Authentication (apidoc.txt) — explicit; optional trailing slash ---
    re_path(r"^api/accounts/register/?$", RegisterView.as_view(), name="register"),
    re_path(r"^api/accounts/register/owner/init/?$", OwnerRegisterInitView.as_view(), name="register-owner-init"),
    re_path(r"^api/accounts/register/owner/verify/?$", OwnerRegisterVerifyView.as_view(), name="register-owner-verify"),
    re_path(r"^api/accounts/login/?$", LoginView.as_view(), name="login"),
    re_path(r"^api/accounts/login/otp/request/?$", LoginOtpRequestView.as_view(), name="login-otp-request"),
    re_path(r"^api/accounts/login/otp/verify/?$", LoginOtpVerifyView.as_view(), name="login-otp-verify"),
    re_path(r"^api/accounts/logout/?$", LogoutView.as_view(), name="logout"),
    re_path(r"^api/accounts/forgot-password/?$", ForgotPasswordView.as_view(), name="forgot-password"),
    re_path(r"^api/accounts/verify-otp/?$", VerifyOTPView.as_view(), name="verify-otp"),
    re_path(r"^api/accounts/reset-password/?$", ResetPasswordView.as_view(), name="reset-password"),
    re_path(r"^api/accounts/profile/?$", ProfileView.as_view(), name="profile"),
    re_path(
        r"^api/accounts/profile/email-change/request/?$",
        ProfileEmailChangeRequestView.as_view(),
        name="profile-email-change-request",
    ),
    re_path(
        r"^api/accounts/owners/?$",
        PropertyOwnerAdminViewSet.as_view({"get": "list"}),
        name="owner-admin-list",
    ),
    re_path(
        r"^api/accounts/owners/(?P<pk>\d+)/?$",
        PropertyOwnerAdminViewSet.as_view(
            {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
        ),
        name="owner-admin-detail",
    ),
    path("api/accounts/", include("accounts.urls")),
    path("api/properties/", include("properties.urls")),
    path("api/advertisements/", include("advertisements.urls")),
    path("api-auth/", include("rest_framework.urls")),
]

# Serve on-disk media (relative MEDIA_URL) through a Range-aware view so iOS AVPlayer
# (Flutter video_player) gets `206 Partial Content` responses. This works under both
# `runserver` (dev) and a production WSGI/ASGI server; if a reverse proxy serves
# `/media/` directly in production it already supports ranges and bypasses this route.
_media_url = getattr(settings, "MEDIA_URL", "") or ""
if _media_url.startswith("/") and getattr(settings, "MEDIA_ROOT", None):
    _media_prefix = _media_url.lstrip("/")
    urlpatterns += [
        re_path(
            rf"^{re.escape(_media_prefix)}(?P<path>.*)$",
            serve_media,
            {"document_root": str(settings.MEDIA_ROOT)},
        ),
    ]
