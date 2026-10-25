from django.contrib import admin
from django.utils.html import format_html

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


@admin.register(InteriorPackage)
class InteriorPackageAdmin(admin.ModelAdmin):
    list_display = ("title", "tier", "rate_per_sqft", "furniture_multiplier", "base_timeline_weeks", "is_active")
    list_editable = ("rate_per_sqft", "furniture_multiplier", "is_active")
    list_filter = ("is_active",)


@admin.register(FurnitureItem)
class FurnitureItemAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price_type", "unit_price", "is_ready_made", "is_active")
    list_editable = ("unit_price", "is_active")
    list_filter = ("category", "price_type", "is_ready_made", "is_active")
    search_fields = ("name", "category")


@admin.register(RenovationOption)
class RenovationOptionAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price_type", "unit_price", "is_active")
    list_editable = ("unit_price", "is_active")
    list_filter = ("category", "price_type", "is_active")
    search_fields = ("name",)


@admin.register(LocationMultiplier)
class LocationMultiplierAdmin(admin.ModelAdmin):
    list_display = ("city", "multiplier", "is_active")
    list_editable = ("multiplier", "is_active")
    search_fields = ("city",)


@admin.register(Design)
class DesignAdmin(admin.ModelAdmin):
    list_display = ("title", "thumbnail", "category", "room", "style", "package_tier", "is_featured", "is_published")
    list_editable = ("is_featured", "is_published")
    list_filter = ("category", "room", "style", "is_featured", "is_published")
    search_fields = ("title", "description")
    prepopulated_fields = {"slug": ("title",)}

    @admin.display(description="Image")
    def thumbnail(self, obj):
        if not obj.image_src:
            return "-"
        return format_html('<img src="{}" style="height:40px;width:56px;object-fit:cover;border-radius:4px">', obj.image_src)


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = ("reference", "title", "user", "property_type", "package", "city", "total", "created_at")
    list_filter = ("property_type", "project_type", "package", "created_at")
    search_fields = ("title", "user__email", "city")
    readonly_fields = ("selections", "result", "total", "created_at", "updated_at")


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "time_slot", "mode", "status")
    list_filter = ("status", "mode", "date")
    list_editable = ("status",)
    search_fields = ("user__email", "user__first_name", "notes")


@admin.register(ContactLead)
class ContactLeadAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "is_resolved", "created_at")
    list_editable = ("is_resolved",)
    list_filter = ("is_resolved",)
    search_fields = ("name", "email", "message")
    readonly_fields = ("created_at", "updated_at")


@admin.register(SavedDesign)
class SavedDesignAdmin(admin.ModelAdmin):
    list_display = ("user", "design", "created_at")
