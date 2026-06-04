"""Routes under `api/accounts/` not declared on `property_listing.urls` (aliases + API index)."""

from django.urls import path

from .views import AccountsAPIRootView, RegisterView

urlpatterns = [
    path("register/user/", RegisterView.as_view(), name="register-user"),
    path("register/user", RegisterView.as_view()),
    path("register/admin/", RegisterView.as_view(), name="register-admin"),
    path("register/admin", RegisterView.as_view()),
    path("", AccountsAPIRootView.as_view(), name="accounts-api-root"),
]
