from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Profile

User = get_user_model()


def get_profile(user) -> Profile:
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile


class UserSerializer(serializers.ModelSerializer):
    """The shape of a user everywhere in the API."""

    name = serializers.CharField(source="first_name", max_length=150)
    phone = serializers.CharField(max_length=20, allow_blank=True, required=False)
    city = serializers.CharField(max_length=120, allow_blank=True, required=False)

    class Meta:
        model = User
        fields = ["id", "email", "name", "phone", "city", "is_staff", "date_joined"]
        read_only_fields = ["id", "email", "is_staff", "date_joined"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        profile = get_profile(instance)
        data["phone"] = profile.phone
        data["city"] = profile.city
        return data

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be empty.")
        return value

    def update(self, instance, validated_data):
        profile = get_profile(instance)
        if "phone" in validated_data:
            profile.phone = validated_data.pop("phone").strip()
        if "city" in validated_data:
            profile.city = validated_data.pop("city").strip()
        profile.save()
        return super().update(instance, validated_data)


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, allow_blank=True, required=False, default="")
    password = serializers.CharField(write_only=True)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name cannot be empty.")
        return value

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(username__iexact=email).exists() or User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate(self, attrs):
        candidate = User(username=attrs["email"], email=attrs["email"], first_name=attrs["name"])
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["name"],
        )
        profile = get_profile(user)
        profile.phone = validated_data.get("phone", "").strip()
        profile.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        try:
            validate_password(attrs["new_password"], user=self.context["request"].user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": exc.messages})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)
