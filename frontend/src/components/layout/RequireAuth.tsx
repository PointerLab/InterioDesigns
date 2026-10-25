import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { PageLoader } from "@/components/common/States";
import { useAuth } from "@/lib/auth";
import NotFound from "@/pages/NotFound";

interface RequireAuthProps {
  children: ReactNode;
  staff?: boolean;
}

const RequireAuth = ({ children, staff }: RequireAuthProps) => {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <PageLoader label="Checking your session" />;
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (staff && !user.is_staff) return <NotFound />;
  return <>{children}</>;
};

export default RequireAuth;
