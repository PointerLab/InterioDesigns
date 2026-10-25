import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Field from "@/components/common/Field";
import { IconCalendar, IconClock, IconMail, IconPhone, IconPin } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { SITE } from "@/lib/site";

const EMPTY = { name: "", email: "", phone: "", message: "" };

const Contact = () => {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user)
      setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone }));
  }, [user]);

  const update = (field: keyof typeof EMPTY) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      await api.post("/contact/", form);
      setSent(true);
      setForm({ ...EMPTY, name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fieldErrors);
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const details = [
    { icon: IconPin, label: "Studio", value: SITE.address.join(", ") },
    { icon: IconPhone, label: "Phone", value: SITE.phone, href: SITE.phoneHref },
    { icon: IconMail, label: "Email", value: SITE.email, href: `mailto:${SITE.email}` },
    { icon: IconClock, label: "Hours", value: SITE.hours },
  ];

  return (
    <div className="container-page py-14">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="eyebrow">Contact</p>
          <h1 className="mt-2 font-serif text-4xl text-foreground md:text-5xl">Let's talk about your space</h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Questions about packages, a project that doesn't fit the estimator, or feedback on a quote. Write to us and
            a designer will reply within one working day.
          </p>

          <dl className="mt-10 space-y-5">
            {details.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <dt className="text-sm font-medium text-foreground">{label}</dt>
                  <dd className="text-sm text-muted-foreground">
                    {href ? (
                      <a href={href} className="hover:text-foreground">
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="mt-10 rounded-lg border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <IconCalendar className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">Prefer to meet a designer?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Book a studio visit, video call or site visit from your dashboard. You can attach a saved estimate so
                  we come prepared.
                </p>
                <Link
                  to="/dashboard/consultations"
                  className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                >
                  Book a consultation
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 md:p-8">
          {sent ? (
            <div className="py-10 text-center">
              <p className="font-serif text-2xl text-foreground">Message sent</p>
              <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
                Thanks for writing to us. We usually reply within one working day.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <h2 className="font-serif text-2xl text-foreground">Send us a message</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="name" label="Name" error={errors.name}>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => update("name")(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </Field>
                <Field id="phone" label="Phone" optional error={errors.phone}>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone")(e.target.value)}
                    autoComplete="tel"
                  />
                </Field>
              </div>
              <Field id="email" label="Email" error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email")(e.target.value)}
                  required
                  autoComplete="email"
                />
              </Field>
              <Field id="message" label="How can we help?" error={errors.message}>
                <Textarea
                  id="message"
                  rows={6}
                  value={form.message}
                  onChange={(e) => update("message")(e.target.value)}
                  placeholder="Tell us about the space, your timeline and budget."
                  required
                />
              </Field>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending..." : "Send message"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;
