from django.conf import settings
from django.db import models


class Profile(models.Model):
    """Extra contact details for a user. Created automatically on signup."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=120, blank=True)

    def __str__(self) -> str:
        return f"Profile of {self.user.email}"
