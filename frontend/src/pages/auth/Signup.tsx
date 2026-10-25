import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Field from "@/components/common/Field";
import PasswordInput from "@/components/common/PasswordInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ApiError, errorMessage } from "@/lib/api";
import { safeNext, useAuth } from "@/lib/auth";
import { usePageTitle } from "@/lib/usePageTitle";
import AuthLayout from "./AuthLayout";

const Signup = () => {
  usePageTitle("Create account");
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={safeNext(next, "/dashboard")} replace />;

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: event.target.value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!agreed) {
      setErrors({ terms: "Please accept the terms to continue." });
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const created = await register(form);
      toast.success(`Welcome to INTERIO, ${created.name.split(" ")[0]}`);
      navigate(safeNext(next, "/dashboard"), { replace: true });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) setErrors(error.fieldErrors);
      else toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      image="/images/signup-bg.jpg"
      quote="Elevate your everyday. Plan it, price it, then build it with us."
      title="Create your account"
      subtitle="Save estimates, shortlist designs and book consultations."
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Field id="name" label="Full name" error={errors.name}>
          <Input id="name" autoComplete="name" value={form.name} onChange={update("name")} required autoFocus />
        </Field>
        <Field id="email" label="Email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" value={form.email} onChange={update("email")} required />
        </Field>
        <Field
          id="phone"
          label="Phone"
          optional
          error={errors.phone}
          hint="So a designer can call you about your project."
        >
          <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={update("phone")} />
        </Field>
        <Field
          id="password"
          label="Password"
          error={errors.password}
          hint="At least 8 characters. Avoid common passwords and all-number passwords."
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
            required
          />
        </Field>

        <div>
          <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Checkbox
              checked={agreed}
              onCheckedChange={(value) => {
                setAgreed(value === true);
                setErrors((e) => ({ ...e, terms: "" }));
              }}
              className="mt-0.5"
            />
            <span>
              I agree to the{" "}
              <Link to="/terms" target="_blank" className="text-primary hover:underline">
                terms of service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                privacy policy
              </Link>
              .
            </span>
          </label>
          {errors.terms && <p className="field-error">{errors.terms}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Signup;
