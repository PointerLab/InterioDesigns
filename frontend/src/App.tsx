import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PublicLayout, { ScrollManager } from "@/components/layout/PublicLayout";
import RequireAuth from "@/components/layout/RequireAuth";
import { PageLoader } from "@/components/common/States";
import { ApiError } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Everything except the landing page loads on demand.
const Designs = lazy(() => import("./pages/Designs"));
const DesignDetail = lazy(() => import("./pages/DesignDetail"));
const Packages = lazy(() => import("./pages/Packages"));
const Estimate = lazy(() => import("./pages/Estimate"));
const Contact = lazy(() => import("./pages/Contact"));
const Legal = lazy(() => import("./pages/Legal"));
const SharedEstimate = lazy(() => import("./pages/SharedEstimate"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const DashboardOverview = lazy(() => import("./pages/dashboard/Overview"));
const MyEstimates = lazy(() => import("./pages/dashboard/Estimates"));
const EstimateDetail = lazy(() => import("./pages/dashboard/EstimateDetail"));
const SavedDesigns = lazy(() => import("./pages/dashboard/SavedDesigns"));
const Consultations = lazy(() => import("./pages/dashboard/Consultations"));
const Profile = lazy(() => import("./pages/dashboard/Profile"));
const StaffOverview = lazy(() => import("./pages/staff/Overview"));
const StaffLeads = lazy(() => import("./pages/staff/Leads"));
const StaffConsultations = lazy(() => import("./pages/staff/Consultations"));
const StaffMessages = lazy(() => import("./pages/staff/Messages"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Don't retry "not found" or "forbidden" style errors.
      retry: (count, error) => count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider delayDuration={200}>
        <Toaster />
        <BrowserRouter>
          <ScrollManager />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<Home />} />
                <Route path="designs" element={<Designs />} />
                <Route path="designs/:slug" element={<DesignDetail />} />
                <Route path="packages" element={<Packages />} />
                <Route path="estimate" element={<Estimate />} />
                <Route path="contact" element={<Contact />} />
                <Route path="privacy" element={<Legal page="privacy" />} />
                <Route path="terms" element={<Legal page="terms" />} />
                <Route path="shared/:token" element={<SharedEstimate />} />

                <Route
                  path="dashboard"
                  element={
                    <RequireAuth>
                      <DashboardLayout variant="customer" />
                    </RequireAuth>
                  }
                >
                  <Route index element={<DashboardOverview />} />
                  <Route path="estimates" element={<MyEstimates />} />
                  <Route path="estimates/:id" element={<EstimateDetail />} />
                  <Route path="saved" element={<SavedDesigns />} />
                  <Route path="consultations" element={<Consultations />} />
                  <Route path="profile" element={<Profile />} />
                </Route>

                <Route
                  path="staff"
                  element={
                    <RequireAuth staff>
                      <DashboardLayout variant="staff" />
                    </RequireAuth>
                  }
                >
                  <Route index element={<StaffOverview />} />
                  <Route path="leads" element={<StaffLeads />} />
                  <Route path="consultations" element={<StaffConsultations />} />
                  <Route path="messages" element={<StaffMessages />} />
                </Route>

                {/* Old URLs from earlier versions of the site */}
                <Route path="estimate-survey" element={<Navigate to="/estimate" replace />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
