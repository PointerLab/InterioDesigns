from django.conf import settings
from django.db import models
from django.db.models import Q


class PropertyType(models.TextChoices):
    RESIDENTIAL = "residential", "Residential"
    COMMERCIAL = "commercial", "Commercial"
    OFFICE = "office", "Office"


class ProjectType(models.TextChoices):
    NEW_INTERIOR = "new", "New Interior"
    RENOVATION = "renovation", "Renovation"


class Scope(models.TextChoices):
    FULL = "full", "Full interior"
    KITCHEN = "kitchen", "Kitchen only"
    WARDROBE = "wardrobe", "Wardrobes only"


class PriceType(models.TextChoices):
    UNIT = "unit", "Per Unit"
    SQFT = "sqft", "Per Sq Ft"


class PackageTier(models.TextChoices):
    BASIC = "basic", "Basic"
    STANDARD = "standard", "Standard"
    PREMIUM = "premium", "Premium"


class WorkCategory(models.TextChoices):
    CIVIL = "civil", "Civil & finishing"
    ELECTRICAL = "electrical", "Electrical & lighting"
    PLUMBING = "plumbing", "Plumbing"


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class InteriorPackage(TimestampedModel):
    tier = models.CharField(max_length=24, choices=PackageTier.choices, unique=True)
    title = models.CharField(max_length=100)
    tagline = models.CharField(max_length=160, blank=True)
    description = models.TextField()
    rate_per_sqft = models.DecimalField(
        max_digits=12, decimal_places=2, help_text="Design, civil and finishing work per sq.ft of carpet area."
    )
    furniture_multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, default=1, help_text="Material grade factor applied to furniture prices."
    )
    inclusions = models.JSONField(default=list, blank=True)
    base_timeline_weeks = models.PositiveIntegerField(default=4)
    warranty_years = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["rate_per_sqft"]

    def __str__(self) -> str:
        return f"{self.title} ({self.tier})"


class FurnitureItem(TimestampedModel):
    name = models.CharField(max_length=120)
    category = models.CharField(max_length=80)
    description = models.CharField(max_length=255, blank=True)
    price_type = models.CharField(max_length=10, choices=PriceType.choices, default=PriceType.UNIT)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, help_text="Price at Basic grade.")
    compatible_packages = models.JSONField(default=list, blank=True, help_text="Empty means every package.")
    property_types = models.JSONField(default=list, blank=True, help_text="Empty means every property type.")
    is_ready_made = models.BooleanField(default=False)
    image = models.ImageField(upload_to="furniture/", blank=True, help_text="Upload a photo, or use Image URL below.")
    image_url = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["category", "name"]

    @property
    def image_src(self) -> str:
        return self.image.url if self.image else self.image_url

    def __str__(self) -> str:
        return self.name


class RenovationOption(TimestampedModel):
    """A service or renovation work that can be added to an estimate."""

    name = models.CharField(max_length=120, unique=True)
    description = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=20, choices=WorkCategory.choices, default=WorkCategory.CIVIL)
    price_type = models.CharField(max_length=10, choices=PriceType.choices, default=PriceType.SQFT)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    enabled_for_project_types = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "service / renovation option"

    def __str__(self) -> str:
        return self.name


class LocationMultiplier(TimestampedModel):
    city = models.CharField(max_length=120, unique=True)
    multiplier = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["city"]

    def __str__(self) -> str:
        return f"{self.city} x{self.multiplier}"


class ContactLead(TimestampedModel):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "contact message"

    def __str__(self) -> str:
        return f"{self.name} <{self.email}>"


class Estimate(TimestampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="estimates")
    title = models.CharField(max_length=120)
    property_type = models.CharField(max_length=24, choices=PropertyType.choices)
    property_subtype = models.CharField(max_length=40, blank=True)
    project_type = models.CharField(max_length=24, choices=ProjectType.choices)
    scope = models.CharField(max_length=20, choices=Scope.choices, default=Scope.FULL)
    area_sqft = models.PositiveIntegerField()
    room_count = models.PositiveIntegerField(default=1)
    package = models.ForeignKey(InteriorPackage, on_delete=models.PROTECT, related_name="estimates")
    city = models.CharField(max_length=120, blank=True)
    selections = models.JSONField(default=dict, blank=True)
    result = models.JSONField(default=dict, blank=True)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    # Set while the owner shares a read-only link to the estimate; cleared to stop sharing.
    share_token = models.CharField(max_length=32, null=True, blank=True, unique=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def reference(self) -> str:
        return f"EST-{self.pk:05d}" if self.pk else "EST-NEW"

    def __str__(self) -> str:
        return f"{self.reference} {self.title}"


class Design(TimestampedModel):
    class Room(models.TextChoices):
        LIVING = "living", "Living room"
        BEDROOM = "bedroom", "Bedroom"
        KITCHEN = "kitchen", "Kitchen"
        DINING = "dining", "Dining"
        STUDY = "study", "Study & home office"
        BALCONY = "balcony", "Balcony & patio"
        CAFE = "cafe", "Café & restaurant"
        MEETING = "meeting", "Meeting room"
        WORKSPACE = "workspace", "Workspace"

    class Style(models.TextChoices):
        MODERN = "modern", "Modern"
        MINIMAL = "minimal", "Minimal"
        CONTEMPORARY = "contemporary", "Contemporary"
        SCANDINAVIAN = "scandinavian", "Scandinavian"
        CLASSIC = "classic", "Classic"
        MID_CENTURY = "mid-century", "Mid-century"
        INDUSTRIAL = "industrial", "Industrial"
        BOHEMIAN = "bohemian", "Bohemian"

    title = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    category = models.CharField(max_length=24, choices=PropertyType.choices)
    room = models.CharField(max_length=20, choices=Room.choices)
    style = models.CharField(max_length=20, choices=Style.choices)
    description = models.TextField()
    highlights = models.JSONField(default=list, blank=True)
    image = models.ImageField(upload_to="designs/", blank=True, help_text="Upload an image, or use Image URL below.")
    image_url = models.CharField(max_length=500, blank=True)
    budget_min = models.PositiveIntegerField(help_text="Approximate budget in INR.")
    budget_max = models.PositiveIntegerField()
    package_tier = models.CharField(max_length=24, choices=PackageTier.choices, default=PackageTier.STANDARD)
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_featured", "title"]

    @property
    def image_src(self) -> str:
        return self.image.url if self.image else self.image_url

    def __str__(self) -> str:
        return self.title


class SavedDesign(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_designs")
    design = models.ForeignKey(Design, on_delete=models.CASCADE, related_name="saves")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "design"], name="unique_saved_design")]


class Consultation(TimestampedModel):
    class Mode(models.TextChoices):
        STUDIO = "studio", "Studio visit"
        VIDEO = "video", "Video call"
        SITE = "site", "Site visit"

    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        CONFIRMED = "confirmed", "Confirmed"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="consultations")
    estimate = models.ForeignKey(
        Estimate, on_delete=models.SET_NULL, null=True, blank=True, related_name="consultations"
    )
    date = models.DateField()
    time_slot = models.TimeField()
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.STUDIO)
    address = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.REQUESTED)
    staff_note = models.TextField(blank=True)

    class Meta:
        ordering = ["date", "time_slot"]
        constraints = [
            models.UniqueConstraint(
                fields=["date", "time_slot"],
                condition=~Q(status="cancelled"),
                name="unique_active_consultation_slot",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user.email} on {self.date} {self.time_slot:%H:%M}"
