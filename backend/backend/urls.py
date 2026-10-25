from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

admin.site.site_header = "INTERIO Administration"
admin.site.site_title = "INTERIO Admin"
admin.site.index_title = "Pricing, catalog and leads"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/", include("api.urls")),
]

# Uploaded images (gallery designs, furniture). Django serving them directly is fine at this
# project's scale; a busy site would put them on object storage or a CDN instead.
urlpatterns += [re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT})]
