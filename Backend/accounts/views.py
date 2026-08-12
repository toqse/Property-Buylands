import re
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.core.files import File
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, status, permissions, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .activity import log_staff_activity
from .models import OTPVerification, PendingOwnerRegistration, StaffActivityLog, StaffProfile, UserProfile
from .otp_service import (
    OTPDeliveryError,
    deliver_otp_email,
    generate_otp_code,
    otp_send_failure,
    otp_send_success,
    otp_verify_success,
    send_otp_to_recipient,
)
from .pagination import OwnerAdminPagination
from .permissions import IsStaffUser, IsSuperUser
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    LoginSerializer,
    ForgotPasswordSerializer,
    OTPVerificationSerializer,
    ResetPasswordSerializer,
    OwnerRegisterInitSerializer,
    OwnerRegisterVerifySerializer,
    LoginOtpRequestSerializer,
    LoginOtpVerifySerializer,
    ProfileUpdateSerializer,
    ProfileEmailChangeRequestSerializer,
    OwnerAdminListSerializer,
    OwnerAdminUpdateSerializer,
    StaffAdminListSerializer,
    StaffAdminCreateSerializer,
    StaffAdminUpdateSerializer,
    StaffActivityLogSerializer,
    _split_full_name,
)


def _unique_username_from_email(email: str) -> str:
    local = (email.split("@")[0] or "user").strip()
    base = re.sub(r"[^a-zA-Z0-9_]", "_", local)[:25] or "user"
    base = re.sub(r"_+", "_", base).strip("_") or "user"
    candidate = base[:30]
    n = 0
    while User.objects.filter(username=candidate).exists():
        n += 1
        suffix = f"_{n}"
        candidate = (base[: 30 - len(suffix)] + suffix)[:30]
    return candidate


class AccountsAPIRootView(APIView):
    """GET /api/accounts/ — confirms routing is wired and lists endpoints."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response(
            {
                "detail": "Accounts API",
                "ROOT_URLCONF": settings.ROOT_URLCONF,
                "endpoints": {
                    "register": {"method": "POST", "path": "/api/accounts/register/"},
                    "register_owner_init": {"method": "POST", "path": "/api/accounts/register/owner/init/"},
                    "register_owner_verify": {"method": "POST", "path": "/api/accounts/register/owner/verify/"},
                    "register_user_alias": {"method": "POST", "path": "/api/accounts/register/user/"},
                    "register_admin_alias": {"method": "POST", "path": "/api/accounts/register/admin/"},
                    "login": {"method": "POST", "path": "/api/accounts/login/"},
                    "login_otp_request": {"method": "POST", "path": "/api/accounts/login/otp/request/"},
                    "login_otp_verify": {"method": "POST", "path": "/api/accounts/login/otp/verify/"},
                    "logout": {"method": "POST", "path": "/api/accounts/logout/"},
                    "forgot_password": {"method": "POST", "path": "/api/accounts/forgot-password/"},
                    "verify_otp": {"method": "POST", "path": "/api/accounts/verify-otp/"},
                    "reset_password": {"method": "POST", "path": "/api/accounts/reset-password/"},
                    "profile": {"method": "GET, PATCH", "path": "/api/accounts/profile/"},
                    "profile_email_change_request": {
                        "method": "POST",
                        "path": "/api/accounts/profile/email-change/request/",
                    },
                    "owners_list": {"method": "GET", "path": "/api/accounts/owners/"},
                    "owners_detail": {
                        "method": "GET, PATCH, DELETE",
                        "path": "/api/accounts/owners/{id}/",
                    },
                    "staff_list": {"method": "GET, POST", "path": "/api/accounts/staff/"},
                    "staff_detail": {
                        "method": "GET, PATCH, DELETE",
                        "path": "/api/accounts/staff/{id}/",
                    },
                    "staff_overview": {"method": "GET", "path": "/api/accounts/staff/overview/"},
                    "staff_me_dashboard": {
                        "method": "GET",
                        "path": "/api/accounts/staff/me/dashboard/",
                    },
                },
            }
        )


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _created = Token.objects.get_or_create(user=user)
            return Response(
                {"token": token.key, "user": UserSerializer(user, context={"request": request}).data},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OwnerRegisterInitView(APIView):
    """Step 1: store pending registration and send OTP. No User until verify."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = OwnerRegisterInitSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        email = ser.validated_data["email"]
        if User.objects.filter(email__iexact=email).exists():
            return Response({"email": ["Email already in use."]}, status=status.HTTP_400_BAD_REQUEST)

        avatar = request.FILES.get("avatar") or request.FILES.get("profile_photo")
        otp_code = generate_otp_code()

        try:
            with transaction.atomic():
                pending, _created = PendingOwnerRegistration.objects.update_or_create(
                    email=email,
                    defaults={
                        "full_name": ser.validated_data["full_name"].strip(),
                        "phone": (ser.validated_data.get("phone") or "").strip(),
                        "whatsapp_number": (ser.validated_data.get("whatsapp_number") or "").strip(),
                        "password": make_password(ser.validated_data["password"]),
                        "otp": otp_code,
                        "expires_at": timezone.now() + timedelta(minutes=10),
                    },
                )
                if avatar:
                    if pending.avatar:
                        pending.avatar.delete(save=False)
                    pending.avatar = avatar
                    pending.save(update_fields=["avatar"])

                deliver_otp_email(
                    recipient=email,
                    subject="Verify your email",
                    otp_code=otp_code,
                )
        except OTPDeliveryError:
            return otp_send_failure()

        return otp_send_success(http_status=status.HTTP_201_CREATED)


class OwnerRegisterVerifyView(APIView):
    """Step 2: verify OTP, create owner account, return token."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = OwnerRegisterVerifySerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        email = ser.validated_data["email"].strip().lower()
        otp = ser.validated_data["otp"].strip()

        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Account is already verified. Please log in."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pending = PendingOwnerRegistration.objects.get(email__iexact=email)
        except PendingOwnerRegistration.DoesNotExist:
            return Response({"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST)

        if pending.otp != otp or not pending.is_valid():
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        first_name, last_name = _split_full_name(pending.full_name)

        try:
            with transaction.atomic():
                user = User(
                    username=_unique_username_from_email(email),
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=True,
                    is_staff=False,
                )
                user.password = pending.password
                user.save()

                profile = UserProfile.objects.create(
                    user=user,
                    phone=pending.phone,
                    whatsapp_number=pending.whatsapp_number,
                    email_verified_at=timezone.now(),
                )
                if pending.avatar:
                    profile.avatar.save(
                        pending.avatar.name.split("/")[-1],
                        File(pending.avatar.open("rb")),
                        save=True,
                    )

                pending.delete()
        except Exception:
            return Response(
                {"detail": "Could not complete registration. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token, _created = Token.objects.get_or_create(user=user)
        user = User.objects.select_related("profile").get(pk=user.pk)
        return otp_verify_success(
            message="OTP verified successfully.",
            token=token.key,
            user=UserSerializer(user, context={"request": request}).data,
        )


def _user_for_auth_response(user):
    return (
        User.objects.select_related("profile", "staff_profile")
        .filter(pk=user.pk)
        .first()
        or user
    )


def _issue_auth_token(request, user):
    token, _created = Token.objects.get_or_create(user=user)
    if user.is_staff:
        log_staff_activity(
            user,
            action=StaffActivityLog.ACTION_LOGIN,
            resource_type=StaffActivityLog.RESOURCE_AUTH,
            summary="Staff login",
        )
    payload_user = _user_for_auth_response(user)
    return {
        "token": token.key,
        "user": UserSerializer(payload_user, context={"request": request}).data,
    }


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            return Response(_issue_auth_token(request, user))
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginOtpRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = LoginOtpRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        email = ser.validated_data["email"]
        invalid_email_message = "No user account found for this email address."
        try:
            user = User.objects.select_related("profile", "staff_profile").get(email__iexact=email)
        except User.DoesNotExist:
            return otp_send_failure(message=invalid_email_message)

        # Owners need a profile; staff may log in with StaffProfile (or is_staff alone).
        is_owner = hasattr(user, "profile") and not user.is_staff
        is_staff_user = user.is_staff
        if not user.is_active or (not is_owner and not is_staff_user):
            return otp_send_failure(message=invalid_email_message)

        try:
            otp_obj = send_otp_to_recipient(
                recipient=user.email,
                subject="Your login code",
                user=user,
                purpose=OTPVerification.PURPOSE_LOGIN,
                body_prefix="Your login code is",
            )
        except OTPDeliveryError:
            return otp_send_failure()

        return otp_send_success()


class LoginOtpVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = LoginOtpVerifySerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        email = ser.validated_data["email"].strip().lower()
        otp = ser.validated_data["otp"].strip()

        try:
            user = User.objects.select_related("profile", "staff_profile").get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST)

        is_owner = hasattr(user, "profile") and not user.is_staff
        is_staff_user = user.is_staff
        if not user.is_active or (not is_owner and not is_staff_user):
            return Response({"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST)

        otp_obj = (
            OTPVerification.objects.filter(
                user=user,
                purpose=OTPVerification.PURPOSE_LOGIN,
                otp=otp,
                expires_at__gt=timezone.now(),
            )
            .order_by("-created_at")
            .first()
        )
        if not otp_obj:
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        OTPVerification.objects.filter(user=user, purpose=OTPVerification.PURPOSE_LOGIN).delete()
        auth = _issue_auth_token(request, user)
        return otp_verify_success(
            message="OTP verified successfully.",
            token=auth["token"],
            user=auth["user"],
        )


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            invalid_email_message = "No user account found for this email address."
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                return otp_send_failure(message=invalid_email_message)

            try:
                otp_obj = send_otp_to_recipient(
                    recipient=email,
                    subject="Password Reset OTP",
                    user=user,
                    purpose=OTPVerification.PURPOSE_PASSWORD_RESET,
                    body_prefix="Your OTP for password reset is",
                )
            except OTPDeliveryError:
                return otp_send_failure()

            return otp_send_success()
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerificationSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            otp = serializer.validated_data["otp"]

            try:
                user = User.objects.get(email=email)
                otp_obj = (
                    OTPVerification.objects.filter(
                        user=user,
                        otp=otp,
                        purpose=OTPVerification.PURPOSE_PASSWORD_RESET,
                        expires_at__gt=timezone.now(),
                        is_verified=False,
                    )
                    .order_by("-created_at")
                    .first()
                )
                if otp_obj:
                    otp_obj.is_verified = True
                    otp_obj.save(update_fields=["is_verified"])
                    return otp_verify_success(message="OTP verified successfully.")
                return Response(
                    {"success": False, "message": "Invalid OTP or expired"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except (User.DoesNotExist, OTPVerification.DoesNotExist):
                return Response(
                    {"success": False, "message": "Invalid OTP or expired"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            otp = serializer.validated_data["otp"].strip()
            new_password = serializer.validated_data["new_password"]

            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)

            otp_valid = OTPVerification.objects.filter(
                user=user,
                purpose=OTPVerification.PURPOSE_PASSWORD_RESET,
                otp=otp,
                expires_at__gt=timezone.now(),
                is_verified=True,
            ).exists()
            if not otp_valid:
                return Response(
                    {"detail": "Invalid or expired OTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.set_password(new_password)
            user.save()
            OTPVerification.objects.filter(
                user=user,
                purpose=OTPVerification.PURPOSE_PASSWORD_RESET,
            ).delete()
            return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    def post(self, request):
        request.user.auth_token.delete()
        return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)


def _profile_required(user):
    if not hasattr(user, "profile"):
        return False, Response(
            {"detail": "Profile is only available for property owner accounts."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return True, None


def _apply_password_change(user, data):
    """Apply new_password from validated ProfileUpdateSerializer data, or return an error Response."""
    if not data.get("new_password"):
        return None
    if not user.check_password(data["current_password"]):
        return Response(
            {"current_password": ["Current password is incorrect."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user.set_password(data["new_password"])
    user.save(update_fields=["password"])
    return None


class ProfileView(APIView):
    """GET / PATCH authenticated owner or staff/admin profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = User.objects.select_related("profile", "staff_profile").get(pk=request.user.pk)
        if hasattr(user, "profile"):
            return Response(UserSerializer(user, context={"request": request}).data)
        if user.is_staff:
            return Response(UserSerializer(user, context={"request": request}).data)
        return Response(
            {"detail": "Profile is only available for property owner accounts."},
            status=status.HTTP_403_FORBIDDEN,
        )

    def patch(self, request):
        user = User.objects.select_related("profile", "staff_profile").get(pk=request.user.pk)

        ser = ProfileUpdateSerializer(data=request.data, context={"request": request}, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        data = ser.validated_data

        # Portal staff / platform admin (no owner UserProfile required).
        if user.is_staff and not hasattr(user, "profile"):
            if "full_name" in data:
                first_name, last_name = _split_full_name(data["full_name"])
                user.first_name = first_name
                user.last_name = last_name
                user.save(update_fields=["first_name", "last_name"])

            if "phone" in data:
                staff_profile, _ = StaffProfile.objects.get_or_create(user=user)
                staff_profile.phone = data["phone"].strip()
                staff_profile.save(update_fields=["phone", "updated_at"])

            pw_err = _apply_password_change(user, data)
            if pw_err is not None:
                return pw_err

            user = User.objects.select_related("profile", "staff_profile").get(pk=user.pk)
            return Response(UserSerializer(user, context={"request": request}).data)

        ok, err = _profile_required(user)
        if not ok:
            return err

        profile = user.profile

        if "full_name" in data:
            first_name, last_name = _split_full_name(data["full_name"])
            user.first_name = first_name
            user.last_name = last_name
            user.save(update_fields=["first_name", "last_name"])

        profile_fields = []
        if "phone" in data:
            profile.phone = data["phone"].strip()
            profile_fields.append("phone")
        if "whatsapp_number" in data:
            profile.whatsapp_number = data["whatsapp_number"].strip()
            profile_fields.append("whatsapp_number")
        if "address" in data:
            profile.address = data["address"].strip()
            profile_fields.append("address")

        new_email = data.get("email")
        email_otp = (data.get("email_otp") or "").strip()
        email_changed = False
        if new_email and new_email.lower() != user.email.lower():
            otp_obj = (
                OTPVerification.objects.filter(
                    user=user,
                    purpose=OTPVerification.PURPOSE_EMAIL_CHANGE,
                    otp=email_otp,
                    expires_at__gt=timezone.now(),
                )
                .order_by("-created_at")
                .first()
            )
            if not otp_obj:
                return Response(
                    {"email_otp": ["Invalid or expired verification code."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            email_changed = True
            user.email = new_email
            user.save(update_fields=["email"])
            profile.pending_email = ""
            profile.email_verified_at = timezone.now()
            profile_fields.extend(["pending_email", "email_verified_at"])
            OTPVerification.objects.filter(user=user, purpose=OTPVerification.PURPOSE_EMAIL_CHANGE).delete()

        if profile_fields:
            profile.save(update_fields=profile_fields)

        pw_err = _apply_password_change(user, data)
        if pw_err is not None:
            return pw_err

        user = User.objects.select_related("profile", "staff_profile").get(pk=user.pk)
        response_data = UserSerializer(user, context={"request": request}).data
        if email_changed:
            return Response(
                {
                    "success": True,
                    "message": "Email updated successfully.",
                    "user": response_data,
                }
            )
        return Response(response_data)


class ProfileEmailChangeRequestView(APIView):
    """Send OTP to a new email before PATCH applies the change."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ok, err = _profile_required(request.user)
        if not ok:
            return err

        ser = ProfileEmailChangeRequestSerializer(data=request.data, context={"request": request})
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        new_email = ser.validated_data["new_email"]
        user = request.user
        profile = user.profile

        try:
            otp_obj = send_otp_to_recipient(
                recipient=new_email,
                subject="Verify your new email",
                user=user,
                purpose=OTPVerification.PURPOSE_EMAIL_CHANGE,
            )
        except OTPDeliveryError:
            return otp_send_failure()

        profile.pending_email = new_email
        profile.save(update_fields=["pending_email"])

        return otp_send_success()


def _owner_admin_queryset():
    return (
        User.objects.filter(profile__account_type=UserProfile.ACCOUNT_PROPERTY_OWNER)
        .select_related("profile")
        .annotate(property_count=Count("owned_properties"))
        .order_by("-date_joined")
    )


def _apply_owner_admin_update(user, profile, data):
    """Apply validated OwnerAdminUpdateSerializer data to user + profile."""
    user_fields = []
    profile_fields = []

    if "full_name" in data:
        first_name, last_name = _split_full_name(data["full_name"])
        user.first_name = first_name
        user.last_name = last_name
        user_fields.extend(["first_name", "last_name"])

    if "email" in data:
        new_email = data["email"]
        if new_email.lower() != user.email.lower():
            user.email = new_email
            user_fields.append("email")
            profile.pending_email = ""
            profile.email_verified_at = timezone.now()
            profile_fields.extend(["pending_email", "email_verified_at"])

    if "is_active" in data:
        user.is_active = data["is_active"]
        user_fields.append("is_active")

    if user_fields:
        user.save(update_fields=user_fields)

    if "phone" in data:
        profile.phone = data["phone"].strip()
        profile_fields.append("phone")
    if "whatsapp_number" in data:
        profile.whatsapp_number = data["whatsapp_number"].strip()
        profile_fields.append("whatsapp_number")
    if "address" in data:
        profile.address = data["address"].strip()
        profile_fields.append("address")

    if profile_fields:
        profile.save(update_fields=profile_fields)

    if data.get("new_password"):
        user.set_password(data["new_password"])
        user.save(update_fields=["password"])


class PropertyOwnerAdminViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Staff-only CRUD for property owner accounts.
    GET/PATCH/DELETE /api/accounts/owners/{id}/
    """

    permission_classes = [IsSuperUser]
    pagination_class = OwnerAdminPagination
    serializer_class = OwnerAdminListSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = _owner_admin_queryset()
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(username__icontains=search)
                | Q(profile__phone__icontains=search)
                | Q(profile__whatsapp_number__icontains=search)
            )
        return qs

    def get_serializer_class(self):
        if self.action in ("partial_update", "update"):
            return OwnerAdminUpdateSerializer
        return OwnerAdminListSerializer

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        if user.is_staff:
            return Response(
                {"detail": "Staff accounts cannot be edited via this endpoint."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = OwnerAdminUpdateSerializer(
            data=request.data,
            partial=True,
            context={"instance": user, "request": request},
        )
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        profile = user.profile
        _apply_owner_admin_update(user, profile, ser.validated_data)
        if "is_active" in ser.validated_data and not ser.validated_data["is_active"]:
            Token.objects.filter(user=user).delete()
        user = _owner_admin_queryset().get(pk=user.pk)
        return Response(OwnerAdminListSerializer(user, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.is_staff:
            return Response(
                {"detail": "Staff accounts cannot be deleted via this endpoint."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.pk == request.user.pk:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        Token.objects.filter(user=user).delete()
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _staff_admin_queryset():
    return (
        User.objects.filter(is_staff=True)
        .select_related("staff_profile")
        .annotate(
            property_count=Count("owned_properties", distinct=True),
            advertisement_count=Count("created_ads", distinct=True),
        )
        .order_by("-date_joined")
    )


def _apply_staff_admin_update(user, profile, data):
    user_fields = []
    profile_fields = []

    if "full_name" in data:
        first_name, last_name = _split_full_name(data["full_name"])
        user.first_name = first_name
        user.last_name = last_name
        user_fields.extend(["first_name", "last_name"])

    if "email" in data:
        new_email = data["email"]
        if new_email.lower() != user.email.lower():
            user.email = new_email
            user_fields.append("email")

    if "is_active" in data:
        user.is_active = data["is_active"]
        user_fields.append("is_active")

    if user_fields:
        user.save(update_fields=user_fields)

    if "phone" in data:
        profile.phone = data["phone"].strip()
        profile_fields.append("phone")
    if "role_label" in data:
        profile.role_label = data["role_label"].strip()
        profile_fields.append("role_label")
    if "can_manage_properties" in data:
        profile.can_manage_properties = data["can_manage_properties"]
        profile_fields.append("can_manage_properties")
    if "can_manage_advertisements" in data:
        profile.can_manage_advertisements = data["can_manage_advertisements"]
        profile_fields.append("can_manage_advertisements")

    if profile_fields:
        profile.save(update_fields=profile_fields)

    if data.get("new_password"):
        user.set_password(data["new_password"])
        user.save(update_fields=["password"])


class StaffAdminViewSet(viewsets.GenericViewSet):
    """
    Superuser staff management + staff self-dashboard.
    /api/accounts/staff/
    """

    pagination_class = OwnerAdminPagination
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.action == "me_dashboard":
            return [IsStaffUser()]
        return [IsSuperUser()]

    def get_queryset(self):
        qs = _staff_admin_queryset()
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(username__icontains=search)
                | Q(staff_profile__phone__icontains=search)
                | Q(staff_profile__role_label__icontains=search)
            )
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            v = str(is_active).strip().lower()
            if v in ("1", "true", "yes"):
                qs = qs.filter(is_active=True)
            elif v in ("0", "false", "no"):
                qs = qs.filter(is_active=False)
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return StaffAdminCreateSerializer
        if self.action in ("partial_update", "update"):
            return StaffAdminUpdateSerializer
        return StaffAdminListSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            ser = StaffAdminListSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(ser.data)
        ser = StaffAdminListSerializer(queryset, many=True, context={"request": request})
        return Response(ser.data)

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        return Response(StaffAdminListSerializer(user, context={"request": request}).data)

    def create(self, request, *args, **kwargs):
        ser = StaffAdminCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        data = ser.validated_data
        email = data["email"]
        first_name, last_name = _split_full_name(data["full_name"])

        with transaction.atomic():
            user = User.objects.create(
                username=_unique_username_from_email(email),
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_staff=True,
                is_superuser=False,
                is_active=True,
            )
            user.set_password(data["password"])
            user.save()
            StaffProfile.objects.create(
                user=user,
                phone=(data.get("phone") or "").strip(),
                role_label=(data.get("role_label") or "").strip(),
                can_manage_properties=data.get("can_manage_properties", True),
                can_manage_advertisements=data.get("can_manage_advertisements", True),
            )
            log_staff_activity(
                request.user,
                action=StaffActivityLog.ACTION_CREATE,
                resource_type=StaffActivityLog.RESOURCE_STAFF,
                resource_id=str(user.pk),
                summary=f"Created staff account {email}",
            )

        user = _staff_admin_queryset().get(pk=user.pk)
        return Response(
            StaffAdminListSerializer(user, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        if user.is_superuser and user.pk != request.user.pk:
            return Response(
                {"detail": "Other superuser accounts cannot be edited via this endpoint."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = StaffAdminUpdateSerializer(
            data=request.data,
            partial=True,
            context={"instance": user, "request": request},
        )
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        profile, _created = StaffProfile.objects.get_or_create(user=user)
        _apply_staff_admin_update(user, profile, ser.validated_data)
        if "is_active" in ser.validated_data and not ser.validated_data["is_active"]:
            Token.objects.filter(user=user).delete()
        log_staff_activity(
            request.user,
            action=StaffActivityLog.ACTION_UPDATE,
            resource_type=StaffActivityLog.RESOURCE_STAFF,
            resource_id=str(user.pk),
            summary=f"Updated staff account {user.email}",
        )
        user = _staff_admin_queryset().get(pk=user.pk)
        return Response(StaffAdminListSerializer(user, context={"request": request}).data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user.is_superuser:
            return Response(
                {"detail": "Superuser accounts cannot be deleted via this endpoint."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Soft-deactivate rather than hard delete
        user.is_active = False
        user.save(update_fields=["is_active"])
        Token.objects.filter(user=user).delete()
        log_staff_activity(
            request.user,
            action=StaffActivityLog.ACTION_DELETE,
            resource_type=StaffActivityLog.RESOURCE_STAFF,
            resource_id=str(user.pk),
            summary=f"Deactivated staff account {user.email}",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def overview(self, request, *args, **kwargs):
        qs = _staff_admin_queryset().filter(is_superuser=False)
        total = qs.count()
        active = qs.filter(is_active=True).count()
        staff_rows = StaffAdminListSerializer(qs[:50], many=True, context={"request": request}).data
        return Response(
            {
                "total_staff": total,
                "active_staff": active,
                "inactive_staff": total - active,
                "staff": staff_rows,
            }
        )

    def activity(self, request, *args, **kwargs):
        user = self.get_object()
        logs = StaffActivityLog.objects.filter(actor=user).select_related("actor")

        action = (request.query_params.get("action") or "").strip().lower()
        if action:
            logs = logs.filter(action=action)

        resource_type = (request.query_params.get("resource_type") or "").strip().lower()
        if resource_type:
            logs = logs.filter(resource_type=resource_type)

        search = (request.query_params.get("search") or "").strip()
        if search:
            logs = logs.filter(
                Q(summary__icontains=search)
                | Q(resource_type__icontains=search)
                | Q(action__icontains=search)
            )

        page = self.paginate_queryset(logs)
        if page is not None:
            ser = StaffActivityLogSerializer(page, many=True)
            return self.get_paginated_response(ser.data)
        return Response(StaffActivityLogSerializer(logs[:100], many=True).data)

    def performance(self, request, *args, **kwargs):
        user = self.get_object()
        days = request.query_params.get("days")
        try:
            days_int = max(1, min(365, int(days))) if days else 30
        except (TypeError, ValueError):
            days_int = 30
        since = timezone.now() - timedelta(days=days_int)
        logs = StaffActivityLog.objects.filter(actor=user, created_at__gte=since)
        return Response(
            {
                "staff_id": user.pk,
                "period_days": days_int,
                "properties_created": user.owned_properties.count(),
                "advertisements_created": user.created_ads.count(),
                "activity_total": logs.count(),
                "activity_create": logs.filter(action=StaffActivityLog.ACTION_CREATE).count(),
                "activity_update": logs.filter(action=StaffActivityLog.ACTION_UPDATE).count(),
                "activity_delete": logs.filter(action=StaffActivityLog.ACTION_DELETE).count(),
                "activity_login": logs.filter(action=StaffActivityLog.ACTION_LOGIN).count(),
            }
        )

    def me_dashboard(self, request, *args, **kwargs):
        user = request.user
        recent = (
            StaffActivityLog.objects.filter(actor=user)
            .select_related("actor")
            .order_by("-created_at")[:20]
        )
        return Response(
            {
                "user": UserSerializer(
                    _user_for_auth_response(user), context={"request": request}
                ).data,
                "properties_count": user.owned_properties.count(),
                "advertisements_count": user.created_ads.count(),
                "recent_activity": StaffActivityLogSerializer(recent, many=True).data,
            }
        )
