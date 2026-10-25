import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Field from "@/components/common/Field";
import PasswordInput from "@/components/common/PasswordInput";
import { Button } from "@/components/ui/button";
import { api, ApiError, errorMessage } from "@/lib/api";
import AuthLayout from "./AuthLayout";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setErrors({ confirm: "Passwords don't match." });
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      await api.post("/auth/password-reset/confirm/", { uid, token, password });
      setDone(true);
    } catch (error) {
      setErrors(
        error instanceof ApiError && error.fieldErrors.password
          ? { password: error.fieldErrors.password }
          : { form: errorMessage(error) },
      );
    } finally {
      setSubmitting(false);
    }
  };

  const invalidLink = !uid || !token;

  return (
    <AuthLayout image="/images/login-bg.jpg" quote="Unlock your home's true potential." title="Choose a new password">
      {done ? (
        <div className="space-y-4">
          <p className="rounded-md border border-success/30 bg-success/5 px-4 py-3 text-sm">
            Your password has been reset.
          </p>
          <Button asChild className="w-full">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      ) : invalidLink ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">This reset link is incomplete. Request a new one to continue.</p>
          <Button asChild>
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {errors.form && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {errors.form}{" "}
              <Link to="/forgot-password" className="underline">
                Request a new link
              </Link>
            </p>
          )}
          <Field id="password" label="New password" error={errors.password} hint="At least 8 characters.">
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field id="confirm" label="Confirm new password" error={errors.confirm}>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "Reset password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
