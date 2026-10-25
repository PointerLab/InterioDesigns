import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import Field from "@/components/common/Field";
import PageHeader from "@/components/common/PageHeader";
import PasswordInput from "@/components/common/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useCatalog } from "@/lib/queries";
import type { User } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";

function ProfileForm({ user }: { user: User }) {
  const { setUser } = useAuth();
  const { data: catalog } = useCatalog();
  const [form, setForm] = useState({ name: user.name, phone: user.phone, city: user.city });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = form.name !== user.name || form.phone !== user.phone || form.city !== user.city;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      setUser(await api.patch<User>("/auth/me/", form));
      toast.success("Profile updated");
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6" noValidate>
      <h2 className="font-sans text-base font-medium">Your details</h2>
      <p className="mt-1 text-sm text-muted-foreground">Designers use these to get in touch about bookings.</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={errors.name}>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
          />
        </Field>
        <Field id="email" label="Email" hint="Contact us to change your sign-in email.">
          <Input id="email" value={user.email} disabled />
        </Field>
        <Field id="phone" label="Phone" optional error={errors.phone}>
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
          />
        </Field>
        <Field id="city" label="City" optional error={errors.city}>
          <Input
            id="city"
            list="city-options"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            autoComplete="address-level2"
          />
          <datalist id="city-options">
            {catalog?.cities.map((city) => (
              <option key={city.id} value={city.city} />
            ))}
          </datalist>
        </Field>
      </div>
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-5">
        <p className="text-xs text-muted-foreground">Member since {formatDate(user.date_joined)}</p>
        <Button type="submit" disabled={!dirty || saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const empty = { current_password: "", new_password: "", confirm: "" };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.new_password !== form.confirm) {
      setErrors({ confirm: "Passwords don't match." });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await api.post("/auth/change-password/", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setForm(empty);
      toast.success("Password changed");
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length) setErrors(error.fieldErrors);
      else toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-6" noValidate>
      <h2 className="font-sans text-base font-medium">Change password</h2>
      <div className="mt-6 grid gap-5 sm:max-w-sm">
        <Field id="current_password" label="Current password" error={errors.current_password}>
          <PasswordInput
            id="current_password"
            autoComplete="current-password"
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
          />
        </Field>
        <Field id="new_password" label="New password" error={errors.new_password} hint="At least 8 characters.">
          <PasswordInput
            id="new_password"
            autoComplete="new-password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
          />
        </Field>
        <Field id="confirm" label="Confirm new password" error={errors.confirm}>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end border-t border-border pt-5">
        <Button type="submit" variant="dark" disabled={saving || !form.current_password || !form.new_password}>
          {saving ? "Updating..." : "Update password"}
        </Button>
      </div>
    </form>
  );
}

const Profile = () => {
  usePageTitle("Profile");
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-8">
      <PageHeader title="Profile" description="Manage your contact details and password." />
      <ProfileForm user={user} />
      <PasswordForm />
    </div>
  );
};

export default Profile;
