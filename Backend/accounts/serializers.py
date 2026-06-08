from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import OTPVerification, UserProfile


def _split_full_name(full: str) -> tuple[str, str]:
    parts = (full or "").strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


class UserSerializer(serializers.ModelSerializer):
    """User JSON for login/register responses; includes owner profile when present."""

    is_property_owner = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    whatsapp_number = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    account_type = serializers.SerializerMethodField()
    email_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_property_owner",
            "phone",
            "whatsapp_number",
            "address",
            "avatar",
            "account_type",
            "email_verified",
        )

    def get_is_property_owner(self, obj):
        p = getattr(obj, "profile", None)
        return bool(p and p.account_type == UserProfile.ACCOUNT_PROPERTY_OWNER)

    def get_phone(self, obj):
        return getattr(getattr(obj, "profile", None), "phone", "") or ""

    def get_whatsapp_number(self, obj):
        return getattr(getattr(obj, "profile", None), "whatsapp_number", "") or ""

    def get_address(self, obj):
        return getattr(getattr(obj, "profile", None), "address", "") or ""

    def get_email_verified(self, obj):
        p = getattr(obj, "profile", None)
        return bool(p and p.email_verified_at)

    def get_account_type(self, obj):
        p = getattr(obj, "profile", None)
        return p.account_type if p else None

    def get_avatar(self, obj):
        p = getattr(obj, "profile", None)
        if not p or not p.avatar:
            return None
        request = self.context.get("request")
        url = p.avatar.url
        if request:
            return request.build_absolute_uri(url)
        return url


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ("username", "email", "password", "password2", "first_name", "last_name")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        if User.objects.filter(email=attrs["email"]).exists():
            raise serializers.ValidationError({"email": "Email already in use."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        user = User.objects.create(
            username=validated_data["username"],
            email=validated_data["email"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            is_staff=False,
            is_active=True,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")

        if email and password:
            try:
                user = User.objects.get(email=email)
                if not user.is_active:
                    raise serializers.ValidationError("This account is not active or email is not verified yet.")
                if user.check_password(password):
                    attrs["user"] = user
                    return attrs
            except User.DoesNotExist:
                pass

            raise serializers.ValidationError("Invalid email or password.")
        raise serializers.ValidationError("Must include 'email' and 'password'.")


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()


class OTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, max_length=6)


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, max_length=6)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs


class OwnerRegisterInitSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    whatsapp_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        if User.objects.filter(email__iexact=attrs["email"].strip()).exists():
            raise serializers.ValidationError({"email": "Email already in use."})
        phone = (attrs.get("phone") or "").strip()
        whatsapp = (attrs.get("whatsapp_number") or "").strip()
        if not phone and not whatsapp:
            raise serializers.ValidationError(
                {"phone": "Provide at least one contact number (phone or WhatsApp)."}
            )
        attrs["phone"] = phone
        attrs["whatsapp_number"] = whatsapp
        return attrs


class OwnerRegisterVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)


class LoginOtpRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class LoginOtpVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)


class ProfileEmailChangeRequestSerializer(serializers.Serializer):
    new_email = serializers.EmailField()

    def validate_new_email(self, value):
        email = value.strip().lower()
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            if request.user.email.lower() == email:
                raise serializers.ValidationError("This is already your email address.")
            if User.objects.filter(email__iexact=email).exclude(pk=request.user.pk).exists():
                raise serializers.ValidationError("Email already in use.")
        return email


class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    whatsapp_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    email_otp = serializers.CharField(max_length=6, required=False, allow_blank=True)
    current_password = serializers.CharField(required=False, write_only=True)
    new_password = serializers.CharField(required=False, write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=False, write_only=True)

    def validate(self, attrs):
        new_pw = attrs.get("new_password")
        new_pw2 = attrs.get("new_password2")
        current = attrs.get("current_password")

        if new_pw or new_pw2 or current:
            if not current:
                raise serializers.ValidationError({"current_password": "Current password is required to set a new password."})
            if not new_pw:
                raise serializers.ValidationError({"new_password": "New password is required."})
            if not new_pw2:
                raise serializers.ValidationError({"new_password2": "Please confirm your new password."})
            if new_pw != new_pw2:
                raise serializers.ValidationError({"new_password": "Password fields didn't match."})

        request = self.context.get("request")
        user = getattr(request, "user", None)
        new_email = attrs.get("email")
        email_otp = (attrs.get("email_otp") or "").strip()

        if new_email and user:
            new_email = new_email.strip().lower()
            attrs["email"] = new_email
            if new_email != user.email.lower():
                if not email_otp:
                    raise serializers.ValidationError(
                        {"email_otp": "Verification code is required when changing your email."}
                    )
                profile = getattr(user, "profile", None)
                if not profile or profile.pending_email.lower() != new_email:
                    raise serializers.ValidationError(
                        {"email": "Request a verification code for this email before saving."}
                    )
            else:
                attrs.pop("email", None)
                attrs.pop("email_otp", None)

        return attrs


class OwnerAdminListSerializer(UserSerializer):
    """Staff list/detail: UserSerializer + admin metadata."""

    date_joined = serializers.DateTimeField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    property_count = serializers.IntegerField(read_only=True)

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + (
            "date_joined",
            "is_active",
            "property_count",
        )


class OwnerAdminUpdateSerializer(serializers.Serializer):
    """Staff PATCH for a property owner (no email OTP / current password)."""

    full_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    whatsapp_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False)
    is_active = serializers.BooleanField(required=False)
    new_password = serializers.CharField(required=False, write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(required=False, write_only=True)

    def validate(self, attrs):
        new_pw = attrs.get("new_password")
        new_pw2 = attrs.get("new_password2")

        if new_pw or new_pw2:
            if not new_pw:
                raise serializers.ValidationError({"new_password": "New password is required."})
            if not new_pw2:
                raise serializers.ValidationError({"new_password2": "Please confirm the new password."})
            if new_pw != new_pw2:
                raise serializers.ValidationError({"new_password": "Password fields didn't match."})

        email = attrs.get("email")
        if email is not None:
            email = email.strip().lower()
            attrs["email"] = email
            instance = self.context.get("instance")
            if instance and User.objects.filter(email__iexact=email).exclude(pk=instance.pk).exists():
                raise serializers.ValidationError({"email": "Email already in use."})

        return attrs
