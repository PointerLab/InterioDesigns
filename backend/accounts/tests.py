import re

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()
PASSWORD = "ComplexPass!2026"


class AuthFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()  # rate limit counters live in the cache

    def register(self, **overrides):
        data = {"name": "Asha Rao", "email": "Asha@Example.com", "phone": "9876543210", "password": PASSWORD}
        data.update(overrides)
        return self.client.post("/api/auth/register/", data, format="json")

    def test_register_returns_tokens_and_profile(self):
        response = self.register()
        self.assertEqual(response.status_code, 201)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "asha@example.com")
        self.assertEqual(response.data["user"]["phone"], "9876543210")

    def test_register_rejects_duplicate_email_case_insensitively(self):
        self.register()
        response = self.register(email="ASHA@example.com")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_register_rejects_weak_password_on_password_field(self):
        response = self.register(password="12345")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_login_with_email_and_fetch_me(self):
        self.register()
        response = self.client.post(
            "/api/auth/login/", {"email": "asha@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["name"], "Asha Rao")

    def test_login_with_wrong_password(self):
        self.register()
        response = self.client.post("/api/auth/login/", {"email": "asha@example.com", "password": "nope"}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_update_profile(self):
        token = self.register().data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.patch("/api/auth/me/", {"name": "Asha R.", "city": "Pune"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["city"], "Pune")
        self.assertEqual(response.data["name"], "Asha R.")

    def test_refresh_token(self):
        refresh = self.register().data["refresh"]
        response = self.client.post("/api/auth/token/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)

    def refresh(self, token):
        return self.client.post("/api/auth/token/refresh/", {"refresh": token}, format="json")

    def test_refresh_tokens_are_single_use(self):
        refresh = self.register().data["refresh"]
        self.assertEqual(self.refresh(refresh).status_code, 200)
        self.assertEqual(self.refresh(refresh).status_code, 401)

    def test_logout_revokes_the_refresh_token(self):
        refresh = self.register().data["refresh"]
        response = self.client.post("/api/auth/logout/", {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.refresh(refresh).status_code, 401)
        # Logging out twice, or with junk, is harmless.
        self.assertEqual(self.client.post("/api/auth/logout/", {"refresh": refresh}, format="json").status_code, 204)
        self.assertEqual(self.client.post("/api/auth/logout/", {"refresh": "junk"}, format="json").status_code, 204)

    def test_change_password(self):
        tokens = self.register().data
        token = tokens["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        bad = self.client.post(
            "/api/auth/change-password/", {"current_password": "wrong", "new_password": "Another!Pass99"}, format="json"
        )
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post(
            "/api/auth/change-password/", {"current_password": PASSWORD, "new_password": "Another!Pass99"}, format="json"
        )
        self.assertEqual(ok.status_code, 200)
        self.assertTrue(User.objects.get(email="asha@example.com").check_password("Another!Pass99"))
        # Other sessions are signed out; this one gets fresh tokens.
        self.assertEqual(self.refresh(tokens["refresh"]).status_code, 401)
        self.assertEqual(self.refresh(ok.data["refresh"]).status_code, 200)

    def test_password_reset_flow(self):
        old_refresh = self.register().data["refresh"]
        response = self.client.post("/api/auth/password-reset/", {"email": "asha@example.com"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

        uid, token = re.search(r"uid=([^&\s]+)&token=(\S+)", mail.outbox[0].body).groups()
        response = self.client.post(
            "/api/auth/password-reset/confirm/", {"uid": uid, "token": token, "password": "Fresh!Pass2026"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.get(email="asha@example.com").check_password("Fresh!Pass2026"))
        self.assertEqual(self.refresh(old_refresh).status_code, 401)

        reused = self.client.post(
            "/api/auth/password-reset/confirm/", {"uid": uid, "token": token, "password": "Other!Pass2026"}, format="json"
        )
        self.assertEqual(reused.status_code, 400)

    def test_password_reset_unknown_email_does_not_leak(self):
        response = self.client.post("/api/auth/password-reset/", {"email": "nobody@example.com"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
