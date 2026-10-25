from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.HealthView.as_view(), name="health"),
    path("catalog/", views.CatalogView.as_view(), name="catalog"),
    path("contact/", views.ContactView.as_view(), name="contact"),
    # Estimates
    path("estimates/preview/", views.EstimatePreviewView.as_view(), name="estimate-preview"),
    path("estimates/", views.EstimateListCreateView.as_view(), name="estimate-list"),
    path("estimates/<int:pk>/", views.EstimateDetailView.as_view(), name="estimate-detail"),
    path("estimates/<int:pk>/pdf/", views.EstimatePdfView.as_view(), name="estimate-pdf"),
    # Design gallery
    path("designs/", views.DesignListView.as_view(), name="design-list"),
    path("designs/saved/", views.SavedDesignListView.as_view(), name="design-saved"),
    path("designs/<slug:slug>/", views.DesignDetailView.as_view(), name="design-detail"),
    path("designs/<slug:slug>/save/", views.DesignSaveView.as_view(), name="design-save"),
    # Consultations
    path("consultations/", views.ConsultationListCreateView.as_view(), name="consultation-list"),
    path("consultations/slots/", views.ConsultationSlotsView.as_view(), name="consultation-slots"),
    path("consultations/<int:pk>/cancel/", views.ConsultationCancelView.as_view(), name="consultation-cancel"),
    # Staff panel
    path("staff/overview/", views.StaffOverviewView.as_view(), name="staff-overview"),
    path("staff/estimates/", views.StaffEstimateListView.as_view(), name="staff-estimates"),
    path("staff/estimates/export/", views.StaffEstimateExportView.as_view(), name="staff-estimates-export"),
    path("staff/estimates/<int:pk>/", views.StaffEstimateDetailView.as_view(), name="staff-estimate-detail"),
    path("staff/consultations/", views.StaffConsultationListView.as_view(), name="staff-consultations"),
    path("staff/consultations/<int:pk>/", views.StaffConsultationUpdateView.as_view(), name="staff-consultation"),
    path("staff/messages/", views.StaffMessageListView.as_view(), name="staff-messages"),
    path("staff/messages/<int:pk>/", views.StaffMessageUpdateView.as_view(), name="staff-message"),
]
