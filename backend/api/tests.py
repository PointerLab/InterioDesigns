from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Consultation, ContactLead, Estimate, FurnitureItem, InteriorPackage, RenovationOption
from .pricing import calculate_estimate

User = get_user_model()


def next_weekday(days_ahead: int = 2):
    day = timezone.localdate() + timedelta(days=days_ahead)
    while day.weekday() == 6:
        day += timedelta(days=1)
    return day


class SeededTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed", "--no-demo-users", stdout=open("/dev/null", "w"))
        cls.user = User.objects.create_user("user@example.com", "user@example.com", "Pass!2026x", first_name="User")
        cls.other = User.objects.create_user("other@example.com", "other@example.com", "Pass!2026x")
        cls.staff = User.objects.create_user("staff@example.com", "staff@example.com", "Pass!2026x", is_staff=True)

    def setUp(self):
        self.client = APIClient()
        cache.clear()  # rate limit counters live in the cache

    def estimate_payload(self, **overrides):
        kitchen = FurnitureItem.objects.get(name="Modular Kitchen")
        wardrobe = FurnitureItem.objects.get(name="Wardrobe")
        payload = {
            "property_type": "residential",
            "property_subtype": "2 BHK",
            "project_type": "new",
            "scope": "full",
            "area_sqft": 800,
            "room_count": 4,
            "package_tier": "standard",
            "city": "Pune",
            "furniture": [{"id": kitchen.id, "quantity": 1}, {"id": wardrobe.id, "quantity": 2}],
            "services": [],
        }
        payload.update(overrides)
        return payload


class PricingEngineTests(SeededTestCase):
    def test_formula(self):
        package = InteriorPackage.objects.get(tier="standard")
        kitchen = FurnitureItem.objects.get(name="Modular Kitchen")
        lighting = RenovationOption.objects.get(name="Designer lighting upgrade")
        result = calculate_estimate(
            package=package,
            property_type="residential",
            project_type="new",
            area_sqft=1000,
            room_count=4,
            furniture=[{"id": kitchen.id, "quantity": 1}],
            services=[{"id": lighting.id}],
            city="Mumbai",
        )
        base = 1000 * 750
        furniture = round(160000 * 1.35)
        services = 60 * 1000
        subtotal = base + furniture + services
        adjusted = round(subtotal * 1.2)
        self.assertEqual(result["subtotal"], subtotal)
        self.assertEqual(result["location"]["adjustment"], adjusted - subtotal)
        self.assertEqual(result["gst"]["amount"], round(adjusted * 0.18))
        self.assertEqual(result["total"], adjusted + round(adjusted * 0.18))
        self.assertEqual(sum(row["amount"] for row in result["categories"]), subtotal)
        self.assertEqual(sum(p["weeks"] for p in result["timeline"]["phases"]), result["timeline"]["weeks"])

    def test_unknown_city_uses_no_multiplier(self):
        package = InteriorPackage.objects.get(tier="basic")
        result = calculate_estimate(
            package=package, property_type="residential", project_type="new", area_sqft=500,
            room_count=2, furniture=[], services=[], city="Atlantis",
        )
        self.assertEqual(result["location"]["multiplier"], 1.0)
        self.assertEqual(result["subtotal"], 500 * 450)

    def test_disallowed_items_are_skipped_with_note(self):
        package = InteriorPackage.objects.get(tier="basic")
        walk_in = FurnitureItem.objects.get(name="Walk-in Wardrobe")  # standard/premium only
        workstation = FurnitureItem.objects.get(name="Office Workstation")  # not residential
        flooring = RenovationOption.objects.get(name="Flooring replacement")  # renovation only
        result = calculate_estimate(
            package=package, property_type="residential", project_type="new", area_sqft=500, room_count=2,
            furniture=[{"id": walk_in.id, "quantity": 1}, {"id": workstation.id, "quantity": 3}],
            services=[{"id": flooring.id}], city="",
        )
        self.assertEqual(result["furniture"]["items"], [])
        self.assertEqual(result["services"]["items"], [])
        self.assertEqual(len(result["notes"]), 3)

    def test_scope_limits_furniture(self):
        package = InteriorPackage.objects.get(tier="standard")
        kitchen = FurnitureItem.objects.get(name="Modular Kitchen")
        sofa = FurnitureItem.objects.get(name="Sofa (3-seater)")
        result = calculate_estimate(
            package=package, property_type="residential", project_type="new", area_sqft=120, room_count=1,
            furniture=[{"id": kitchen.id, "quantity": 1}, {"id": sofa.id, "quantity": 1}], services=[],
            scope="kitchen",
        )
        self.assertEqual([row["name"] for row in result["furniture"]["items"]], ["Modular Kitchen"])
        self.assertEqual(result["notes"], ["Sofa (3-seater) was left out: not part of a kitchen only estimate."])

    def test_renovation_adds_time(self):
        package = InteriorPackage.objects.get(tier="basic")
        common = dict(package=package, property_type="residential", area_sqft=500, room_count=2,
                      furniture=[], services=[], city="")
        new = calculate_estimate(project_type="new", **common)
        reno = calculate_estimate(project_type="renovation", **common)
        self.assertEqual(reno["timeline"]["weeks"], new["timeline"]["weeks"] + 2)


class CatalogAndPreviewTests(SeededTestCase):
    def test_health(self):
        self.assertEqual(self.client.get("/api/health/").json()["status"], "ok")

    def test_catalog(self):
        data = self.client.get("/api/catalog/").json()
        self.assertEqual([p["tier"] for p in data["packages"]], ["basic", "standard", "premium"])
        self.assertTrue(data["furniture_items"])
        self.assertTrue(data["services"])
        self.assertIn("residential", data["space_presets"])
        self.assertEqual(data["scope_presets"]["kitchen"]["categories"], ["kitchen"])

    def test_empty_catalog_explains_how_to_fix(self):
        InteriorPackage.objects.update(is_active=False)
        response = self.client.get("/api/catalog/")
        self.assertEqual(response.status_code, 503)
        self.assertIn("seed", response.json()["detail"])

    def test_preview_is_public_and_saves_nothing(self):
        response = self.client.post("/api/estimates/preview/", self.estimate_payload(), format="json")
        self.assertEqual(response.status_code, 200)
        self.assertGreater(response.json()["total"], 0)
        self.assertEqual(Estimate.objects.count(), 0)

    def test_preview_validation(self):
        response = self.client.post(
            "/api/estimates/preview/", self.estimate_payload(area_sqft=10, package_tier="gold"), format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("area_sqft", response.json())
        self.assertIn("package_tier", response.json())


class EstimateTests(SeededTestCase):
    def test_saving_requires_login(self):
        response = self.client.post("/api/estimates/", self.estimate_payload(), format="json")
        self.assertEqual(response.status_code, 401)

    def test_create_list_update_delete(self):
        self.client.force_authenticate(self.user)
        created = self.client.post("/api/estimates/", self.estimate_payload(), format="json")
        self.assertEqual(created.status_code, 201)
        data = created.json()
        self.assertEqual(data["title"], "2 BHK in Pune")
        self.assertTrue(data["reference"].startswith("EST-"))
        self.assertEqual(float(data["total"]), data["result"]["total"])

        self.assertEqual(len(self.client.get("/api/estimates/").json()), 1)

        updated = self.client.put(
            f"/api/estimates/{data['id']}/", self.estimate_payload(package_tier="premium"), format="json"
        )
        self.assertEqual(updated.status_code, 200)
        self.assertGreater(updated.json()["total"], data["total"])

        renamed = self.client.patch(f"/api/estimates/{data['id']}/", {"title": "Our new flat"}, format="json")
        self.assertEqual(renamed.json()["title"], "Our new flat")

        self.assertEqual(self.client.delete(f"/api/estimates/{data['id']}/").status_code, 204)
        self.assertEqual(Estimate.objects.count(), 0)

    def test_cannot_see_other_users_estimates(self):
        self.client.force_authenticate(self.user)
        estimate_id = self.client.post("/api/estimates/", self.estimate_payload(), format="json").json()["id"]
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/estimates/{estimate_id}/").status_code, 404)
        self.assertEqual(self.client.get("/api/estimates/").json(), [])

    def test_pdf_quotation(self):
        self.client.force_authenticate(self.user)
        estimate_id = self.client.post("/api/estimates/", self.estimate_payload(), format="json").json()["id"]
        response = self.client.get(f"/api/estimates/{estimate_id}/pdf/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn(f"INTERIO-EST-{estimate_id:05d}.pdf", response["Content-Disposition"])
        self.assertTrue(response.content.startswith(b"%PDF"))

        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/estimates/{estimate_id}/pdf/").status_code, 404)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get(f"/api/estimates/{estimate_id}/pdf/").status_code, 200)

    def test_inr_uses_indian_grouping(self):
        from .quotation import inr

        self.assertEqual(inr(708000), "Rs. 7,08,000")
        self.assertEqual(inr(12345678), "Rs. 1,23,45,678")
        self.assertEqual(inr(999), "Rs. 999")
        self.assertEqual(inr(-1500), "-Rs. 1,500")


class DesignTests(SeededTestCase):
    def test_list_and_filter(self):
        all_designs = self.client.get("/api/designs/").json()["results"]
        self.assertGreaterEqual(len(all_designs), 20)
        kitchens = self.client.get("/api/designs/?room=kitchen").json()["results"]
        self.assertTrue(kitchens)
        self.assertTrue(all(d["room"] == "kitchen" for d in kitchens))
        search = self.client.get("/api/designs/?q=boardroom").json()["results"]
        self.assertEqual(search[0]["slug"], "glass-walled-boardroom")

    def test_detail_and_save_toggle(self):
        slug = "white-island-kitchen"
        detail = self.client.get(f"/api/designs/{slug}/").json()
        self.assertFalse(detail["design"]["is_saved"])
        self.assertEqual(self.client.post(f"/api/designs/{slug}/save/").status_code, 401)

        self.client.force_authenticate(self.user)
        self.client.post(f"/api/designs/{slug}/save/")
        self.client.post(f"/api/designs/{slug}/save/")  # idempotent
        saved = self.client.get("/api/designs/saved/").json()
        self.assertEqual([d["slug"] for d in saved], [slug])
        self.assertTrue(self.client.get(f"/api/designs/{slug}/").json()["design"]["is_saved"])

        self.client.delete(f"/api/designs/{slug}/save/")
        self.assertEqual(self.client.get("/api/designs/saved/").json(), [])

    def test_missing_design(self):
        self.assertEqual(self.client.get("/api/designs/not-a-design/").status_code, 404)


class ConsultationTests(SeededTestCase):
    def book(self, **overrides):
        data = {"date": next_weekday().isoformat(), "time_slot": "11:00", "mode": "studio", "notes": "Kitchen ideas"}
        data.update(overrides)
        return self.client.post("/api/consultations/", data, format="json")

    def test_book_list_and_cancel(self):
        self.client.force_authenticate(self.user)
        response = self.book()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["status"], "requested")

        slots = self.client.get(f"/api/consultations/slots/?date={next_weekday().isoformat()}").json()["slots"]
        self.assertFalse(next(s for s in slots if s["time"] == "11:00")["available"])

        consultation_id = response.json()["id"]
        cancelled = self.client.post(f"/api/consultations/{consultation_id}/cancel/")
        self.assertEqual(cancelled.json()["status"], "cancelled")
        # A cancelled slot can be booked again.
        self.assertEqual(self.book().status_code, 201)

    def test_slot_cannot_be_double_booked(self):
        self.client.force_authenticate(self.user)
        self.book()
        self.client.force_authenticate(self.other)
        response = self.book()
        self.assertEqual(response.status_code, 400)
        self.assertIn("time_slot", response.json())

    def test_rejects_past_dates_sundays_and_bad_slots(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.book(date=timezone.localdate().isoformat()).status_code, 400)
        sunday = timezone.localdate() + timedelta(days=1)
        while sunday.weekday() != 6:
            sunday += timedelta(days=1)
        self.assertEqual(self.book(date=sunday.isoformat()).status_code, 400)
        self.assertEqual(self.book(time_slot="13:00").status_code, 400)

    def test_site_visit_needs_address(self):
        self.client.force_authenticate(self.user)
        response = self.book(mode="site")
        self.assertEqual(response.status_code, 400)
        self.assertIn("address", response.json())

    def test_cannot_link_someone_elses_estimate(self):
        self.client.force_authenticate(self.other)
        estimate_id = self.client.post("/api/estimates/", self.estimate_payload(), format="json").json()["id"]
        self.client.force_authenticate(self.user)
        response = self.book(estimate=estimate_id)
        self.assertEqual(response.status_code, 400)
        self.assertIn("estimate", response.json())


class ContactTests(SeededTestCase):
    def test_contact_message(self):
        response = self.client.post(
            "/api/contact/",
            {"name": "Ravi", "email": "ravi@example.com", "message": "Need a quote for my café."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ContactLead.objects.count(), 1)

    def test_contact_validation(self):
        response = self.client.post("/api/contact/", {"name": "", "email": "bad", "message": "hi"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.json()), {"name", "email", "message"})

    def test_contact_form_is_rate_limited(self):
        data = {"name": "Ravi", "email": "ravi@example.com", "message": "Need a quote for my café."}
        for _ in range(20):
            self.assertEqual(self.client.post("/api/contact/", data, format="json").status_code, 201)
        self.assertEqual(self.client.post("/api/contact/", data, format="json").status_code, 429)


class StaffTests(SeededTestCase):
    def test_staff_endpoints_are_forbidden_for_customers(self):
        self.client.force_authenticate(self.user)
        for url in ("/api/staff/overview/", "/api/staff/estimates/", "/api/staff/consultations/",
                    "/api/staff/messages/"):
            self.assertEqual(self.client.get(url).status_code, 403, url)

    def test_staff_can_manage_leads(self):
        self.client.force_authenticate(self.user)
        self.client.post("/api/estimates/", self.estimate_payload(), format="json")
        consultation = self.client.post(
            "/api/consultations/", {"date": next_weekday().isoformat(), "time_slot": "10:00", "mode": "video"},
            format="json",
        ).json()
        ContactLead.objects.create(name="A", email="a@example.com", message="Hello there, need help")

        self.client.force_authenticate(self.staff)
        overview = self.client.get("/api/staff/overview/").json()
        self.assertEqual(overview["estimates"], 1)
        self.assertEqual(overview["consultations"]["requested"], 1)
        self.assertEqual(overview["open_messages"], 1)

        leads = self.client.get("/api/staff/estimates/?q=user@example").json()
        self.assertEqual(leads[0]["customer_email"], "user@example.com")

        csv_response = self.client.get("/api/staff/estimates/export/")
        self.assertEqual(csv_response["Content-Type"], "text/csv")
        self.assertIn("2 BHK in Pune", csv_response.content.decode())

        updated = self.client.patch(
            f"/api/staff/consultations/{consultation['id']}/", {"status": "confirmed", "staff_note": "Priya"},
            format="json",
        )
        self.assertEqual(updated.json()["status"], "confirmed")
        self.assertEqual(Consultation.objects.get().staff_note, "Priya")

        message = ContactLead.objects.get()
        self.client.patch(f"/api/staff/messages/{message.id}/", {"is_resolved": True}, format="json")
        message.refresh_from_db()
        self.assertTrue(message.is_resolved)
