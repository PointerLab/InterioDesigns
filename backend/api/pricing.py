"""
Rule-based cost estimation engine.

    base      = carpet area x package rate          (design, civil and finishing work)
    furniture = sum(item price x qty) x package furniture multiplier
    services  = sum(per-sqft services x area, per-unit services x qty)
    subtotal  = base + furniture + services
    total     = subtotal x city multiplier + GST

Every figure is rounded to whole rupees. The result is a plain dict so it can be
stored on the Estimate as a snapshot and returned to the client unchanged.
"""

import math
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from .models import FurnitureItem, InteriorPackage, LocationMultiplier, PriceType, RenovationOption

GST_RATE = Decimal("0.18")
ESTIMATE_VARIANCE = Decimal("0.10")

# How the area-based package work splits across cost heads.
BASE_SPLIT = {
    "civil": Decimal("0.50"),
    "labour": Decimal("0.30"),
    "electrical": Decimal("0.12"),
    "plumbing": Decimal("0.08"),
}

CATEGORY_LABELS = {
    "furniture": "Furniture & modular units",
    "civil": "Civil & finishing materials",
    "labour": "Labour",
    "electrical": "Electrical & lighting",
    "plumbing": "Plumbing",
}

DISCLAIMER = (
    "This is an indicative estimate. Final pricing is confirmed after a site measurement "
    "and depends on material availability and site conditions."
)

# Preset sizes shown in the estimate wizard. Area is carpet area in sq.ft.
SPACE_PRESETS = {
    "residential": [
        {"id": "1bhk", "label": "1 BHK", "area": 450, "rooms": 3},
        {"id": "2bhk", "label": "2 BHK", "area": 800, "rooms": 4},
        {"id": "3bhk", "label": "3 BHK", "area": 1200, "rooms": 5},
        {"id": "4bhk", "label": "4 BHK", "area": 1800, "rooms": 7},
        {"id": "villa", "label": "Villa", "area": 2800, "rooms": 9},
    ],
    "commercial": [
        {"id": "shop", "label": "Shop", "area": 400, "rooms": 1},
        {"id": "showroom", "label": "Showroom", "area": 1500, "rooms": 2},
        {"id": "cafe", "label": "Café / Restaurant", "area": 1000, "rooms": 3},
    ],
    "office": [
        {"id": "startup", "label": "Startup office", "area": 1200, "rooms": 4},
        {"id": "corporate", "label": "Corporate office", "area": 4000, "rooms": 10},
    ],
}

# Kitchen-only and wardrobe-only estimates price a smaller area.
SCOPE_PRESETS = {
    "full": {"label": "Full interior", "area": None, "rooms": None, "categories": None},
    "kitchen": {"label": "Kitchen only", "area": 120, "rooms": 1, "categories": ["kitchen"]},
    "wardrobe": {"label": "Wardrobes only", "area": 180, "rooms": 2, "categories": ["wardrobe"]},
}


def rupees(value: Decimal) -> int:
    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


@dataclass
class Line:
    item: object
    quantity: int


def resolve_lines(model, selections: list, allowed) -> tuple[list[Line], list[str]]:
    """Turn [{"id": 1, "quantity": 2}, ...] into model lines, skipping anything not allowed."""
    wanted = {}
    for entry in selections or []:
        try:
            item_id = int(entry.get("id"))
            quantity = int(entry.get("quantity", 1))
        except (AttributeError, TypeError, ValueError):
            continue
        if quantity > 0:
            wanted[item_id] = wanted.get(item_id, 0) + quantity

    items = model.objects.filter(id__in=wanted.keys(), is_active=True)
    lines, notes = [], []
    for item in items:
        reason = allowed(item)
        if reason:
            notes.append(f"{item.name} was left out: {reason}.")
            continue
        lines.append(Line(item=item, quantity=min(wanted[item.id], 500)))
    return lines, notes


def calculate_estimate(
    *,
    package: InteriorPackage,
    property_type: str,
    project_type: str,
    area_sqft: int,
    room_count: int,
    furniture: list,
    services: list,
    city: str = "",
) -> dict:
    area = Decimal(area_sqft)

    def furniture_allowed(item: FurnitureItem):
        if item.compatible_packages and package.tier not in item.compatible_packages:
            return f"not offered with the {package.title}"
        if item.property_types and property_type not in item.property_types:
            return f"not available for {property_type} projects"
        return None

    def service_allowed(item: RenovationOption):
        if item.enabled_for_project_types and project_type not in item.enabled_for_project_types:
            return "only available for renovation projects" if project_type == "new" else "not available here"
        return None

    furniture_lines, furniture_notes = resolve_lines(FurnitureItem, furniture, furniture_allowed)
    service_lines, service_notes = resolve_lines(RenovationOption, services, service_allowed)

    # Area-based package work
    base_amount = area * package.rate_per_sqft
    categories = {key: base_amount * share for key, share in BASE_SPLIT.items()}
    categories["furniture"] = Decimal("0")

    # Furniture, priced at the package's material grade
    furniture_rows = []
    for line in furniture_lines:
        unit_price = line.item.unit_price * package.furniture_multiplier
        amount = unit_price * line.quantity
        categories["furniture"] += amount
        furniture_rows.append(
            {
                "id": line.item.id,
                "name": line.item.name,
                "category": line.item.category,
                "quantity": line.quantity,
                "unit": "sq.ft" if line.item.price_type == PriceType.SQFT else "unit",
                "unit_price": rupees(unit_price),
                "amount": rupees(amount),
            }
        )

    # Services and renovation works
    service_rows = []
    for line in service_lines:
        per_sqft = line.item.price_type == PriceType.SQFT
        quantity = area_sqft if per_sqft else line.quantity
        amount = line.item.unit_price * quantity
        categories[line.item.category] = categories.get(line.item.category, Decimal("0")) + amount
        service_rows.append(
            {
                "id": line.item.id,
                "name": line.item.name,
                "category": line.item.category,
                "quantity": quantity,
                "unit": "sq.ft" if per_sqft else "unit",
                "unit_price": rupees(line.item.unit_price),
                "amount": rupees(amount),
            }
        )

    furniture_total = sum((Decimal(row["amount"]) for row in furniture_rows), Decimal("0"))
    services_total = sum((Decimal(row["amount"]) for row in service_rows), Decimal("0"))
    subtotal = Decimal(rupees(base_amount)) + furniture_total + services_total

    location = LocationMultiplier.objects.filter(city__iexact=(city or "").strip(), is_active=True).first()
    multiplier = location.multiplier if location else Decimal("1.00")
    adjusted = Decimal(rupees(subtotal * multiplier))
    gst = Decimal(rupees(adjusted * GST_RATE))
    total = adjusted + gst

    # Cost-head breakdown of the subtotal. Rounding drift goes to the largest head.
    category_rows = [
        {"key": key, "label": CATEGORY_LABELS[key], "amount": rupees(categories.get(key, Decimal("0")))}
        for key in ("furniture", "civil", "labour", "electrical", "plumbing")
    ]
    drift = rupees(subtotal) - sum(row["amount"] for row in category_rows)
    if drift:
        max(category_rows, key=lambda row: row["amount"])["amount"] += drift
    category_rows = [row for row in category_rows if row["amount"] > 0]

    furniture_units = sum(line.quantity for line in furniture_lines if line.item.price_type == PriceType.UNIT)
    weeks = (
        package.base_timeline_weeks
        + max(0, math.ceil(area_sqft / 600) - 1)
        + (2 if project_type == "renovation" else 0)
        + (1 if furniture_units > 8 else 0)
    )

    return {
        "currency": "INR",
        "package": {
            "tier": package.tier,
            "title": package.title,
            "rate_per_sqft": rupees(package.rate_per_sqft),
            "furniture_multiplier": float(package.furniture_multiplier),
        },
        "area_sqft": area_sqft,
        "room_count": room_count,
        "base": {
            "label": "Design, civil & finishing work",
            "rate": rupees(package.rate_per_sqft),
            "area": area_sqft,
            "amount": rupees(base_amount),
        },
        "furniture": {"items": furniture_rows, "amount": rupees(furniture_total)},
        "services": {"items": service_rows, "amount": rupees(services_total)},
        "subtotal": rupees(subtotal),
        "location": {
            "city": location.city if location else (city or "").strip(),
            "multiplier": float(multiplier),
            "adjustment": rupees(adjusted - subtotal),
        },
        "gst": {"rate": float(GST_RATE), "amount": rupees(gst)},
        "total": rupees(total),
        "range": {
            "low": rupees(total * (1 - ESTIMATE_VARIANCE)),
            "high": rupees(total * (1 + ESTIMATE_VARIANCE)),
        },
        "categories": category_rows,
        "timeline": {"weeks": weeks, "phases": timeline_phases(weeks)},
        "notes": furniture_notes + service_notes,
        "disclaimer": DISCLAIMER,
    }


def timeline_phases(weeks: int) -> list[dict]:
    design = max(1, round(weeks * 0.2))
    installation = max(1, round(weeks * 0.3))
    handover = 1
    production = max(1, weeks - design - installation - handover)
    return [
        {"name": "Design & approvals", "weeks": design},
        {"name": "Material procurement & factory production", "weeks": production},
        {"name": "Site work & installation", "weeks": installation},
        {"name": "Final finishing & handover", "weeks": handover},
    ]
