from datetime import date, timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import (
    Consultation,
    ContactLead,
    Design,
    Estimate,
    FurnitureItem,
    InteriorPackage,
    LocationMultiplier,
    ProjectType,
    PropertyType,
    RenovationOption,
    Scope,
)

# Consultation hours: Monday to Saturday, with a lunch break at 1 pm.
CONSULTATION_SLOTS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"]
BOOKING_WINDOW_DAYS = 60


def check_booking_date(value: date) -> date:
    today = timezone.localdate()
    if value <= today:
        raise serializers.ValidationError("Pick a date from tomorrow onwards.")
    if value > today + timedelta(days=BOOKING_WINDOW_DAYS):
        raise serializers.ValidationError(f"Bookings open up to {BOOKING_WINDOW_DAYS} days ahead.")
    if value.weekday() == 6:
        raise serializers.ValidationError("The studio is closed on Sundays.")
    return value


def check_time_slot(value):
    if value.strftime("%H:%M") not in CONSULTATION_SLOTS:
        raise serializers.ValidationError("Choose one of the available time slots.")
    return value


def slot_is_taken(day: date, time_slot, exclude_pk=None) -> bool:
    taken = Consultation.objects.filter(date=day, time_slot=time_slot).exclude(status=Consultation.Status.CANCELLED)
    return taken.exclude(pk=exclude_pk).exists() if exclude_pk else taken.exists()


class PackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = InteriorPackage
        fields = [
            "id", "tier", "title", "tagline", "description", "rate_per_sqft", "furniture_multiplier",
            "inclusions", "base_timeline_weeks", "warranty_years",
        ]


class FurnitureItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FurnitureItem
        fields = [
            "id", "name", "category", "description", "price_type", "unit_price", "compatible_packages",
            "property_types", "is_ready_made",
        ]


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RenovationOption
        fields = ["id", "name", "description", "category", "price_type", "unit_price", "enabled_for_project_types"]


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationMultiplier
        fields = ["id", "city", "multiplier"]


class DesignSerializer(serializers.ModelSerializer):
    image = serializers.CharField(source="image_src", read_only=True)
    category_label = serializers.CharField(source="get_category_display", read_only=True)
    room_label = serializers.CharField(source="get_room_display", read_only=True)
    style_label = serializers.CharField(source="get_style_display", read_only=True)
    is_saved = serializers.SerializerMethodField()

    class Meta:
        model = Design
        fields = [
            "id", "slug", "title", "category", "category_label", "room", "room_label", "style", "style_label",
            "description", "highlights", "image", "budget_min", "budget_max", "package_tier", "is_featured",
            "is_saved",
        ]

    def get_is_saved(self, obj) -> bool:
        return obj.id in self.context.get("saved_ids", set())


class SelectionSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=500, default=1)


class EstimateInputSerializer(serializers.Serializer):
    """Inputs shared by the live preview and saved estimates."""

    title = serializers.CharField(max_length=120, required=False, allow_blank=True)
    property_type = serializers.ChoiceField(choices=PropertyType.choices)
    property_subtype = serializers.CharField(max_length=40, required=False, allow_blank=True, default="")
    project_type = serializers.ChoiceField(choices=ProjectType.choices)
    scope = serializers.ChoiceField(choices=Scope.choices, default=Scope.FULL)
    area_sqft = serializers.IntegerField(min_value=50, max_value=100000)
    room_count = serializers.IntegerField(min_value=1, max_value=200, default=1)
    package_tier = serializers.CharField()
    city = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    furniture = SelectionSerializer(many=True, required=False, default=list)
    services = SelectionSerializer(many=True, required=False, default=list)

    def validate_package_tier(self, value):
        package = InteriorPackage.objects.filter(tier=value, is_active=True).first()
        if not package:
            raise serializers.ValidationError("Choose one of the available packages.")
        return package

    def validate(self, attrs):
        if attrs["scope"] != Scope.FULL and attrs["property_type"] != PropertyType.RESIDENTIAL:
            attrs["scope"] = Scope.FULL
        return attrs


class EstimateSerializer(serializers.ModelSerializer):
    reference = serializers.CharField(read_only=True)
    package_tier = serializers.CharField(source="package.tier", read_only=True)
    package_title = serializers.CharField(source="package.title", read_only=True)
    property_type_label = serializers.CharField(source="get_property_type_display", read_only=True)
    project_type_label = serializers.CharField(source="get_project_type_display", read_only=True)
    scope_label = serializers.CharField(source="get_scope_display", read_only=True)

    class Meta:
        model = Estimate
        fields = [
            "id", "reference", "title", "property_type", "property_type_label", "property_subtype",
            "project_type", "project_type_label", "scope", "scope_label", "area_sqft", "room_count",
            "package_tier", "package_title", "city", "selections", "result", "total", "created_at", "updated_at",
        ]


class EstimateSummarySerializer(EstimateSerializer):
    class Meta(EstimateSerializer.Meta):
        fields = [f for f in EstimateSerializer.Meta.fields if f not in ("selections", "result")]


class ConsultationSerializer(serializers.ModelSerializer):
    estimate = serializers.PrimaryKeyRelatedField(
        queryset=Estimate.objects.all(), required=False, allow_null=True
    )
    estimate_reference = serializers.CharField(source="estimate.reference", read_only=True, default=None)
    estimate_title = serializers.CharField(source="estimate.title", read_only=True, default=None)
    time_slot = serializers.TimeField(format="%H:%M", input_formats=["%H:%M", "%H:%M:%S"])
    mode_label = serializers.CharField(source="get_mode_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Consultation
        fields = [
            "id", "estimate", "estimate_reference", "estimate_title", "date", "time_slot", "mode", "mode_label",
            "address", "notes", "status", "status_label", "staff_note", "created_at",
        ]
        read_only_fields = ["status", "staff_note", "created_at"]
        # Slot clashes are checked in validate() with a friendlier message.
        validators = []

    def validate_estimate(self, value):
        if value and value.user_id != self.context["request"].user.id:
            raise serializers.ValidationError("Estimate not found.")
        return value

    def validate_date(self, value: date):
        return check_booking_date(value)

    def validate_time_slot(self, value):
        return check_time_slot(value)

    def validate(self, attrs):
        if attrs.get("mode") == Consultation.Mode.SITE and not attrs.get("address", "").strip():
            raise serializers.ValidationError({"address": "Add the site address for a site visit."})
        if slot_is_taken(attrs["date"], attrs["time_slot"]):
            raise serializers.ValidationError({"time_slot": "That slot was just booked. Please pick another."})
        return attrs


class RescheduleSerializer(serializers.Serializer):
    """A new date and time for an existing booking (passed in context as "consultation")."""

    date = serializers.DateField()
    time_slot = serializers.TimeField(input_formats=["%H:%M", "%H:%M:%S"])

    def validate_date(self, value: date):
        return check_booking_date(value)

    def validate_time_slot(self, value):
        return check_time_slot(value)

    def validate(self, attrs):
        consultation = self.context["consultation"]
        if (attrs["date"], attrs["time_slot"]) == (consultation.date, consultation.time_slot):
            raise serializers.ValidationError({"time_slot": "That's already your booking time. Pick a new one."})
        if slot_is_taken(attrs["date"], attrs["time_slot"], exclude_pk=consultation.pk):
            raise serializers.ValidationError({"time_slot": "That slot was just booked. Please pick another."})
        return attrs


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactLead
        fields = ["id", "name", "email", "phone", "message", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_message(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError("Please write a little more so we can help (10+ characters).")
        return value


# Staff-facing serializers


class CustomerMixin(serializers.Serializer):
    customer_name = serializers.CharField(source="user.first_name", read_only=True)
    customer_email = serializers.CharField(source="user.email", read_only=True)
    customer_phone = serializers.SerializerMethodField()

    def get_customer_phone(self, obj) -> str:
        profile = getattr(obj.user, "profile", None)
        return profile.phone if profile else ""


class StaffEstimateSerializer(CustomerMixin, EstimateSummarySerializer):
    class Meta(EstimateSummarySerializer.Meta):
        fields = EstimateSummarySerializer.Meta.fields + ["customer_name", "customer_email", "customer_phone"]


class StaffConsultationSerializer(CustomerMixin, serializers.ModelSerializer):
    estimate_reference = serializers.CharField(source="estimate.reference", read_only=True, default=None)
    estimate_total = serializers.DecimalField(
        source="estimate.total", max_digits=14, decimal_places=2, read_only=True, default=None
    )
    time_slot = serializers.TimeField(format="%H:%M", read_only=True)
    mode_label = serializers.CharField(source="get_mode_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Consultation
        fields = [
            "id", "estimate", "estimate_reference", "estimate_total", "date", "time_slot", "mode", "mode_label",
            "address", "notes", "status", "status_label", "staff_note", "created_at", "customer_name",
            "customer_email", "customer_phone",
        ]
        read_only_fields = [f for f in fields if f not in ("status", "staff_note")]
        validators = []

    def validate_status(self, value):
        consultation = self.instance
        reopening = consultation and consultation.status == Consultation.Status.CANCELLED
        if reopening and value != Consultation.Status.CANCELLED:
            clash = (
                Consultation.objects.filter(date=consultation.date, time_slot=consultation.time_slot)
                .exclude(pk=consultation.pk)
                .exclude(status=Consultation.Status.CANCELLED)
            )
            if clash.exists():
                raise serializers.ValidationError("This slot has been booked by someone else since it was cancelled.")
        return value


class StaffMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactLead
        fields = ["id", "name", "email", "phone", "message", "is_resolved", "created_at"]
        read_only_fields = ["id", "name", "email", "phone", "message", "created_at"]
