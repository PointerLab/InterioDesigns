import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Field from "@/components/common/Field";
import PasswordInput from "@/components/common/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, errorMessage } from "@/lib/api";
import { safeNext, useAuth } from "@/lib/auth";
import AuthLayout from "./AuthLayout";

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={safeNext(next, user.is_staff ? "/staff" : "/dashboard")} replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");
    try {
      const signedIn = await login(email, password);
      toast.success(`Welcome back, ${signedIn.name.split(" ")[0]}`);
      navigate(safeNext(next, signedIn.is_staff ? "/staff" : "/dashboard"), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) setErrors(error.fieldErrors);
      else setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      image="/images/login-bg.jpg"
      quote="Unlock your home's true potential."
      title="Welcome back"
      subtitle="Sign in to see your saved estimates, designs and bookings."
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        )}
        <Field id="email" label="Email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </Field>
        <div>
          <Field id="password" label="Password" error={errors.password}>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          <Link to="/forgot-password" className="mt-2 inline-block text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        New to INTERIO?{" "}
        <Link
          to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>

      {import.meta.env.DEV && (
        <div className="mt-8 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            Demo accounts (from <code>manage.py seed</code>)
          </p>
          <p className="mt-1">Customer: demo@interio.local / InterioDemo@123</p>
          <p>Staff: admin@interio.local / InterioAdmin@123</p>
        </div>
      )}
    </AuthLayout>
  );
};

export default Login;
