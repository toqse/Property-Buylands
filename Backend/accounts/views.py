import re

from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import mixins, status, permissions, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import OTPVerification, UserProfile
from .otp_service import (
    OTPDeliveryError,
    otp_send_failure,
    otp_send_success,
    otp_verify_success,
    send_otp_to_recipient,
)
from .pagination import OwnerAdminPagination
from .permissions import IsStaffUser
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
    """Step 1: create inactive owner + profile, send registration OTP (no token)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = OwnerRegisterInitSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        email = ser.validated_data["email"]
        if User.objects.filter(email__iexact=email).exists():
            return Response({"email": ["Email already in use."]}, status=status.HTTP_400_BAD_REQUEST)

        first_name, last_name = _split_full_name(ser.validated_data["full_name"])
        avatar = request.FILES.get("avatar") or request.FILES.get("profile_photo")

        try:
            with transaction.atomic():
                user = User.objects.create(
                    username=_unique_username_from_email(email),
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    is_active=False,
                    is_staff=False,
                )
                user.set_password(ser.validated_data["password"])
                user.save()

                UserProfile.objects.create(
                    user=user,
                    phone=(ser.validated_data.get("phone") or "").strip(),
                    whatsapp_number=(ser.validated_data.get("whatsapp_number") or "").strip(),
                    avatar=avatar if avatar else None,
                )

                otp_obj = send_otp_to_recipient(
                    recipient=email,
                    subject="Verify your email",
                    user=user,
                    purpose=OTPVerification.PURPOSE_REGISTRATION,
                )
        except OTPDeliveryError:
            return otp_send_failure()

        return otp_send_success(otp=otp_obj.otp, http_status=status.HTTP_201_CREATED)


class OwnerRegisterVerifyView(APIView):
    """Step 2: verify OTP, activate account, return token."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = OwnerRegisterVerifySerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        email = ser.validated_data["email"].strip().lower()
        otp = ser.validated_data["otp"].strip()

        try:
            user = User.objects.select_related("profile").get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_active:
            return Response({"detail": "Account is already verified. Please log in."}, status=status.HTTP_400_BAD_REQUEST)

        if not hasattr(user, "profile"):
            return Response({"detail": "Invalid registration."}, status=status.HTTP_400_BAD_REQUEST)

        otp_obj = (
            OTPVerification.objects.filter(
                user=user,
                purpose=OTPVerification.PURPOSE_REGISTRATION,
                otp=otp,
                expires_at__gt=timezone.now(),
            )
            .order_by("-created_at")
            .first()
        )
        if not otp_obj:
            return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save(update_fields=["is_active"])
        user.profile.email_verified_at = timezone.now()
        user.profile.save(update_fields=["email_verified_at"])
        OTPVerification.objects.filter(user=user, purpose=OTPVerification.PURPOSE_REGISTRATION).delete()

        token, _created = Token.objects.get_or_create(user=user)
        return otp_verify_success(
            message="OTP verified successfully.",
            otp=otp,
            token=token.key,
            user=UserSerializer(user, context={"request": request}).data,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            token, _created = Token.objects.get_or_create(user=user)
            return Response({"token": token.key, "user": UserSerializer(user, context={"request": request}).data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginOtpRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = LoginOtpRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        email = ser.validated_data["email"]
        try:
            user = User.objects.select_related("profile").get(email__iexact=email)
        except User.DoesNotExist:
            return otp_send_failure()

        if not user.is_active or not hasattr(user, "profile") or user.is_staff:
            return otp_send_failure()

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

        return otp_send_success(otp=otp_obj.otp)


class LoginOtpVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        ser = LoginOtpVerifySerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        email = ser.validated_data["email"].strip().lower()
        otp = ser.validated_data["otp"].strip()

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.is_active or not hasattr(user, "profile"):
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
        token, _created = Token.objects.get_or_create(user=user)
        return otp_verify_success(
            message="OTP verified successfully.",
            otp=otp,
            token=token.key,
            user=UserSerializer(user, context={"request": request}).data,
        )


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data["email"]
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                return otp_send_failure()

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

            return otp_send_success(otp=otp_obj.otp)
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
                valid = OTPVerification.objects.filter(
                    user=user,
                    otp=otp,
                    purpose=OTPVerification.PURPOSE_PASSWORD_RESET,
                    expires_at__gt=timezone.now(),
                ).exists()
                if valid:
                    return otp_verify_success(message="OTP verified successfully.", otp=otp.strip())
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
            new_password = serializer.validated_data["new_password"]

            try:
                user = User.objects.get(email=email)
                user.set_password(new_password)
                user.save()
                return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)

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


class ProfileView(APIView):
    """GET / PATCH authenticated owner profile."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ok, err = _profile_required(request.user)
        if not ok:
            return err
        user = User.objects.select_related("profile").get(pk=request.user.pk)
        return Response(UserSerializer(user, context={"request": request}).data)

    def patch(self, request):
        ok, err = _profile_required(request.user)
        if not ok:
            return err

        ser = ProfileUpdateSerializer(data=request.data, context={"request": request}, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.select_related("profile").get(pk=request.user.pk)
        profile = user.profile
        data = ser.validated_data

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
        verified_email_otp = None
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
            verified_email_otp = email_otp
            user.email = new_email
            user.save(update_fields=["email"])
            profile.pending_email = ""
            profile.email_verified_at = timezone.now()
            profile_fields.extend(["pending_email", "email_verified_at"])
            OTPVerification.objects.filter(user=user, purpose=OTPVerification.PURPOSE_EMAIL_CHANGE).delete()

        if profile_fields:
            profile.save(update_fields=profile_fields)

        if data.get("new_password"):
            if not user.check_password(data["current_password"]):
                return Response(
                    {"current_password": ["Current password is incorrect."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.set_password(data["new_password"])
            user.save(update_fields=["password"])

        user = User.objects.select_related("profile").get(pk=user.pk)
        response_data = UserSerializer(user, context={"request": request}).data
        if verified_email_otp is not None:
            return Response(
                {
                    "success": True,
                    "message": "Email updated successfully.",
                    "otp": verified_email_otp,
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

        return otp_send_success(otp=otp_obj.otp)


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

    permission_classes = [IsStaffUser]
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
