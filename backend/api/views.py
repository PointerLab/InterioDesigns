import csv
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Consultation,
    ContactLead,
    Design,
    Estimate,
    FurnitureItem,
    InteriorPackage,
    LocationMultiplier,
    RenovationOption,
    SavedDesign,
)
from .pricing import SCOPE_PRESETS, SPACE_PRESETS, calculate_estimate
from .serializers import (
    BOOKING_WINDOW_DAYS,
    CONSULTATION_SLOTS,
    CitySerializer,
    ConsultationSerializer,
    ContactSerializer,
    DesignSerializer,
    EstimateInputSerializer,
    EstimateSerializer,
    EstimateSummarySerializer,
    FurnitureItemSerializer,
    PackageSerializer,
    ServiceSerializer,
    StaffConsultationSerializer,
    StaffEstimateSerializer,
    StaffMessageSerializer,
)

User = get_user_model()


class HealthView(APIView):
    def get(self, request):
        return Response({"status": "ok", "service": "interio-backend"})


class CatalogView(APIView):
    """Everything the estimate wizard and package pages need, in one request."""

    def get(self, request):
        packages = InteriorPackage.objects.filter(is_active=True)
        if not packages.exists():
            return Response(
                {"detail": "The pricing catalog is empty. Run `python manage.py seed` on the backend."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {
                "packages": PackageSerializer(packages, many=True).data,
                "furniture_items": FurnitureItemSerializer(FurnitureItem.objects.filter(is_active=True), many=True).data,
                "services": ServiceSerializer(RenovationOption.objects.filter(is_active=True), many=True).data,
                "cities": CitySerializer(LocationMultiplier.objects.filter(is_active=True), many=True).data,
                "space_presets": SPACE_PRESETS,
                "scope_presets": {key: value["label"] for key, value in SCOPE_PRESETS.items()},
            }
        )


def run_estimate(data: dict) -> dict:
    return calculate_estimate(
        package=data["package_tier"],
        property_type=data["property_type"],
        project_type=data["project_type"],
        area_sqft=data["area_sqft"],
        room_count=data["room_count"],
        furniture=data["furniture"],
        services=data["services"],
        city=data["city"],
    )


def default_title(data: dict) -> str:
    parts = [data.get("property_subtype") or data["property_type"].title()]
    if data["scope"] != "full":
        parts.append(SCOPE_PRESETS[data["scope"]]["label"].lower())
    if data["city"]:
        parts.append(f"in {data['city']}")
    return " ".join(parts)[:120]


def estimate_fields(data: dict, result: dict) -> dict:
    return {
        "title": (data.get("title") or "").strip() or default_title(data),
        "property_type": data["property_type"],
        "property_subtype": data["property_subtype"],
        "project_type": data["project_type"],
        "scope": data["scope"],
        "area_sqft": data["area_sqft"],
        "room_count": data["room_count"],
        "package": data["package_tier"],
        "city": data["city"].strip(),
        "selections": {"furniture": data["furniture"], "services": data["services"]},
        "result": result,
        "total": result["total"],
    }


class EstimatePreviewView(APIView):
    """Live calculation for the wizard. Nothing is saved."""

    def post(self, request):
        serializer = EstimateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(run_estimate(serializer.validated_data))


class EstimateListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        estimates = Estimate.objects.filter(user=request.user).select_related("package")
        return Response(EstimateSummarySerializer(estimates, many=True).data)

    def post(self, request):
        serializer = EstimateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        estimate = Estimate.objects.create(user=request.user, **estimate_fields(data, run_estimate(data)))
        return Response(EstimateSerializer(estimate).data, status=status.HTTP_201_CREATED)


class EstimateDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return get_object_or_404(Estimate.objects.select_related("package"), pk=pk, user=request.user)

    def get(self, request, pk):
        return Response(EstimateSerializer(self.get_object(request, pk)).data)

    def put(self, request, pk):
        estimate = self.get_object(request, pk)
        serializer = EstimateInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        for field, value in estimate_fields(data, run_estimate(data)).items():
            setattr(estimate, field, value)
        estimate.save()
        return Response(EstimateSerializer(estimate).data)

    def patch(self, request, pk):
        """Only the title can be changed without recalculating."""
        estimate = self.get_object(request, pk)
        title = str(request.data.get("title", "")).strip()
        if not title:
            return Response({"title": ["Title cannot be empty."]}, status=status.HTTP_400_BAD_REQUEST)
        estimate.title = title[:120]
        estimate.save(update_fields=["title", "updated_at"])
        return Response(EstimateSerializer(estimate).data)

    def delete(self, request, pk):
        self.get_object(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def saved_design_ids(request) -> set:
    if not request.user.is_authenticated:
        return set()
    return set(SavedDesign.objects.filter(user=request.user).values_list("design_id", flat=True))


class DesignListView(APIView):
    def get(self, request):
        designs = Design.objects.filter(is_published=True)
        params = request.query_params

        if params.get("category"):
            designs = designs.filter(category=params["category"])
        if params.get("room"):
            designs = designs.filter(room=params["room"])
        if params.get("style"):
            designs = designs.filter(style=params["style"])
        if params.get("featured") == "true":
            designs = designs.filter(is_featured=True)
        if params.get("q"):
            q = params["q"].strip()
            designs = designs.filter(Q(title__icontains=q) | Q(description__icontains=q) | Q(style__icontains=q))
        if params.get("limit", "").isdigit():
            designs = designs[: int(params["limit"])]

        return Response(
            {
                "results": DesignSerializer(designs, many=True, context={"saved_ids": saved_design_ids(request)}).data,
                "filters": {
                    "categories": [{"value": v, "label": l} for v, l in Design._meta.get_field("category").choices],
                    "rooms": [{"value": v, "label": l} for v, l in Design.Room.choices],
                    "styles": [{"value": v, "label": l} for v, l in Design.Style.choices],
                },
            }
        )


class DesignDetailView(APIView):
    def get(self, request, slug):
        design = get_object_or_404(Design, slug=slug, is_published=True)
        context = {"saved_ids": saved_design_ids(request)}
        related = (
            Design.objects.filter(is_published=True, category=design.category)
            .exclude(pk=design.pk)
            .order_by("-is_featured", "?")[:3]
        )
        return Response(
            {
                "design": DesignSerializer(design, context=context).data,
                "related": DesignSerializer(related, many=True, context=context).data,
            }
        )


class DesignSaveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        design = get_object_or_404(Design, slug=slug, is_published=True)
        SavedDesign.objects.get_or_create(user=request.user, design=design)
        return Response({"is_saved": True})

    def delete(self, request, slug):
        SavedDesign.objects.filter(user=request.user, design__slug=slug).delete()
        return Response({"is_saved": False})


class SavedDesignListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        designs = Design.objects.filter(saves__user=request.user, is_published=True).order_by("-saves__created_at")
        return Response(DesignSerializer(designs, many=True, context={"saved_ids": saved_design_ids(request)}).data)


class ConsultationSlotsView(APIView):
    def get(self, request):
        day = parse_date(request.query_params.get("date", ""))
        if not day:
            return Response({"detail": "Pass ?date=YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        today = timezone.localdate()
        closed_reason = None
        if day <= today:
            closed_reason = "Pick a date from tomorrow onwards."
        elif day > today + timedelta(days=BOOKING_WINDOW_DAYS):
            closed_reason = f"Bookings open up to {BOOKING_WINDOW_DAYS} days ahead."
        elif day.weekday() == 6:
            closed_reason = "The studio is closed on Sundays."

        booked = {
            slot.strftime("%H:%M")
            for slot in Consultation.objects.filter(date=day)
            .exclude(status=Consultation.Status.CANCELLED)
            .values_list("time_slot", flat=True)
        }
        return Response(
            {
                "date": day,
                "closed_reason": closed_reason,
                "slots": [
                    {"time": slot, "available": closed_reason is None and slot not in booked}
                    for slot in CONSULTATION_SLOTS
                ],
            }
        )


class ConsultationListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ConsultationSerializer
    pagination_class = None

    def get_queryset(self):
        return Consultation.objects.filter(user=self.request.user).select_related("estimate")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ConsultationCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        consultation = get_object_or_404(Consultation, pk=pk, user=request.user)
        if consultation.status in (Consultation.Status.COMPLETED, Consultation.Status.CANCELLED):
            return Response(
                {"detail": f"This consultation is already {consultation.get_status_display().lower()}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        consultation.status = Consultation.Status.CANCELLED
        consultation.save(update_fields=["status", "updated_at"])
        return Response(ConsultationSerializer(consultation, context={"request": request}).data)


class ContactView(APIView):
    throttle_scope = "contact"

    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Thanks for writing to us. We usually reply within one working day."},
            status=status.HTTP_201_CREATED,
        )


# Staff panel


class StaffOverviewView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        since = timezone.now() - timedelta(days=30)
        today = timezone.localdate()
        estimates = Estimate.objects.all()
        recent = estimates.filter(created_at__gte=since)

        consultation_counts = dict(
            Consultation.objects.values_list("status").annotate(count=Count("id")).values_list("status", "count")
        )
        by_package = list(
            estimates.values("package__title").annotate(count=Count("id"), value=Sum("total")).order_by("-count")
        )
        by_city = list(
            estimates.exclude(city="").values("city").annotate(count=Count("id")).order_by("-count")[:5]
        )
        upcoming = (
            Consultation.objects.filter(date__gte=today)
            .exclude(status=Consultation.Status.CANCELLED)
            .select_related("user", "user__profile", "estimate")[:5]
        )
        latest = estimates.select_related("user", "user__profile", "package")[:5]

        return Response(
            {
                "customers": User.objects.filter(is_staff=False).count(),
                "new_customers_30d": User.objects.filter(is_staff=False, date_joined__gte=since).count(),
                "estimates": estimates.count(),
                "estimates_30d": recent.count(),
                "pipeline_value_30d": recent.aggregate(total=Sum("total"))["total"] or 0,
                "consultations": {
                    choice: consultation_counts.get(choice, 0) for choice in Consultation.Status.values
                },
                "open_messages": ContactLead.objects.filter(is_resolved=False).count(),
                "by_package": [
                    {"package": row["package__title"], "count": row["count"], "value": row["value"] or 0}
                    for row in by_package
                ],
                "by_city": by_city,
                "upcoming_consultations": StaffConsultationSerializer(upcoming, many=True).data,
                "latest_estimates": StaffEstimateSerializer(latest, many=True).data,
            }
        )


class StaffEstimateListView(APIView):
    permission_classes = [IsAdminUser]

    def get_queryset(self, request):
        estimates = Estimate.objects.select_related("user", "user__profile", "package")
        params = request.query_params
        if params.get("package"):
            estimates = estimates.filter(package__tier=params["package"])
        if params.get("property_type"):
            estimates = estimates.filter(property_type=params["property_type"])
        if params.get("q"):
            q = params["q"].strip()
            estimates = estimates.filter(
                Q(title__icontains=q) | Q(user__email__icontains=q) | Q(user__first_name__icontains=q)
                | Q(city__icontains=q)
            )
        return estimates

    def get(self, request):
        return Response(StaffEstimateSerializer(self.get_queryset(request), many=True).data)


class StaffEstimateExportView(StaffEstimateListView):
    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="interio-leads-{timezone.localdate()}.csv"'
        writer = csv.writer(response)
        writer.writerow(
            ["Reference", "Created", "Customer", "Email", "Phone", "Title", "Property", "Project", "Area (sq.ft)",
             "Package", "City", "Total (INR)"]
        )
        for estimate in self.get_queryset(request):
            profile = getattr(estimate.user, "profile", None)
            writer.writerow(
                [
                    estimate.reference,
                    timezone.localtime(estimate.created_at).strftime("%Y-%m-%d %H:%M"),
                    estimate.user.first_name,
                    estimate.user.email,
                    profile.phone if profile else "",
                    estimate.title,
                    estimate.get_property_type_display(),
                    estimate.get_project_type_display(),
                    estimate.area_sqft,
                    estimate.package.title,
                    estimate.city,
                    int(estimate.total),
                ]
            )
        return response


class StaffEstimateDetailView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pk):
        estimate = get_object_or_404(Estimate.objects.select_related("user", "user__profile", "package"), pk=pk)
        data = EstimateSerializer(estimate).data
        data.update(StaffEstimateSerializer(estimate).data)
        data["result"] = estimate.result
        data["selections"] = estimate.selections
        return Response(data)


class StaffConsultationListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = StaffConsultationSerializer
    pagination_class = None

    def get_queryset(self):
        consultations = Consultation.objects.select_related("user", "user__profile", "estimate")
        status_filter = self.request.query_params.get("status")
        if status_filter:
            consultations = consultations.filter(status=status_filter)
        if self.request.query_params.get("upcoming") == "true":
            consultations = consultations.filter(date__gte=timezone.localdate())
        return consultations


class StaffConsultationUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = StaffConsultationSerializer
    queryset = Consultation.objects.select_related("user", "user__profile", "estimate")
    http_method_names = ["patch"]


class StaffMessageListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = StaffMessageSerializer
    pagination_class = None

    def get_queryset(self):
        messages = ContactLead.objects.all()
        resolved = self.request.query_params.get("resolved")
        if resolved in ("true", "false"):
            messages = messages.filter(is_resolved=resolved == "true")
        return messages


class StaffMessageUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = StaffMessageSerializer
    queryset = ContactLead.objects.all()
    http_method_names = ["patch"]
