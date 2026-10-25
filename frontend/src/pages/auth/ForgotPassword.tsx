import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Field from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError, errorMessage } from "@/lib/api";
import AuthLayout from "./AuthLayout";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/auth/password-reset/", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors.email ?? err.message) : errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      image="/images/login-bg.jpg"
      quote="Unlock your home's true potential."
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send you a reset link."
    >
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm text-foreground">
            If an account exists for <strong>{email}</strong>, a reset link is on its way. The link works once.
          </p>
          {import.meta.env.DEV && (
            <p className="text-xs text-muted-foreground">
              Development mode: emails are printed in the terminal running the Django server.
            </p>
          )}
          <Link to="/login" className="inline-block text-sm font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Field id="email" label="Email" error={error}>
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
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending..." : "Send reset link"}
          </Button>
          <Link to="/login" className="inline-block text-sm text-primary hover:underline">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
