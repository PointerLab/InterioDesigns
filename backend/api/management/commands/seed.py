from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Profile
from api import seed_data
from api.models import Design, FurnitureItem, InteriorPackage, LocationMultiplier, RenovationOption

User = get_user_model()

DEMO_USERS = [
    # email, password, name, is_staff
    ("admin@interio.local", "InterioAdmin@123", "Studio Admin", True),
    ("demo@interio.local", "InterioDemo@123", "Demo Customer", False),
]


class Command(BaseCommand):
    help = "Load the default pricing catalog, cities, design gallery and demo accounts. Safe to run again."

    def add_arguments(self, parser):
        parser.add_argument("--no-demo-users", action="store_true", help="Skip creating the demo accounts.")

    @transaction.atomic
    def handle(self, *args, **options):
        for data in seed_data.PACKAGES:
            data = dict(data)
            InteriorPackage.objects.update_or_create(
                tier=data.pop("tier"),
                defaults={
                    **data,
                    "rate_per_sqft": Decimal(data["rate_per_sqft"]),
                    "furniture_multiplier": Decimal(data["furniture_multiplier"]),
                    "is_active": True,
                },
            )

        for data in seed_data.FURNITURE:
            FurnitureItem.objects.update_or_create(
                name=data["name"],
                defaults={
                    "category": data["category"],
                    "description": data.get("description", ""),
                    "price_type": data.get("price_type", "unit"),
                    "unit_price": Decimal(data["unit_price"]),
                    "compatible_packages": data.get("compatible_packages", []),
                    "property_types": data.get("property_types", []),
                    "is_ready_made": data.get("is_ready_made", False),
                    "is_active": True,
                },
            )

        for data in seed_data.SERVICES:
            data = dict(data)
            RenovationOption.objects.update_or_create(
                name=data.pop("name"),
                defaults={**data, "unit_price": Decimal(data["unit_price"]), "is_active": True},
            )

        for city, multiplier in seed_data.CITIES:
            LocationMultiplier.objects.update_or_create(
                city=city, defaults={"multiplier": Decimal(multiplier), "is_active": True}
            )

        for data in seed_data.DESIGNS:
            Design.objects.update_or_create(
                slug=data["slug"],
                defaults={
                    "title": data["title"],
                    "category": data["category"],
                    "room": data["room"],
                    "style": data["style"],
                    "description": data["description"],
                    "highlights": data.get("highlights", []),
                    "image_url": f"/images/{data['image']}",
                    "budget_min": data["budget"][0],
                    "budget_max": data["budget"][1],
                    "package_tier": data["tier"],
                    "is_featured": data.get("featured", False),
                    "is_published": True,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Catalog ready: {InteriorPackage.objects.count()} packages, {FurnitureItem.objects.count()} "
                f"furniture items, {RenovationOption.objects.count()} services, "
                f"{LocationMultiplier.objects.count()} cities, {Design.objects.count()} designs."
            )
        )

        if options["no_demo_users"]:
            return

        for email, password, name, is_staff in DEMO_USERS:
            user, created = User.objects.get_or_create(
                username=email, defaults={"email": email, "first_name": name, "is_staff": is_staff}
            )
            if created:
                user.set_password(password)
                user.is_superuser = is_staff
                user.save()
                Profile.objects.update_or_create(user=user, defaults={"city": "Pune", "phone": "9800000000"})
                self.stdout.write(f"Created {'staff' if is_staff else 'customer'} account {email} / {password}")
            else:
                self.stdout.write(f"Account {email} already exists (password unchanged)")
