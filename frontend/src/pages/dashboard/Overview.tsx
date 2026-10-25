import { Link } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import { EmptyState, PageLoader } from "@/components/common/States";
import { IconCalendar, IconDocument, IconHeart } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { formatDate, formatINR, formatTime, formatWeekdayDate, greeting, parseLocalDate } from "@/lib/format";
import { useConsultations, useEstimates, useSavedDesigns } from "@/lib/queries";
import { usePageTitle } from "@/lib/usePageTitle";

const Overview = () => {
  usePageTitle("Dashboard");
  const { user } = useAuth();
  const estimates = useEstimates();
  const saved = useSavedDesigns();
  const consultations = useConsultations();

  if (estimates.isLoading || saved.isLoading || consultations.isLoading) return <PageLoader />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = (consultations.data ?? []).filter(
    (c) => parseLocalDate(c.date) >= today && (c.status === "requested" || c.status === "confirmed"),
  );
  const next = upcoming[0];
  const recent = (estimates.data ?? []).slice(0, 4);

  const stats = [
    { label: "Saved estimates", value: estimates.data?.length ?? 0, to: "/dashboard/estimates", icon: IconDocument },
    { label: "Saved designs", value: saved.data?.length ?? 0, to: "/dashboard/saved", icon: IconHeart },
    { label: "Upcoming consultations", value: upcoming.length, to: "/dashboard/consultations", icon: IconCalendar },
  ];

  return (
    <div className="space-y-10">
      <PageHeader
        title={`${greeting()}, ${user?.name.split(" ")[0]}`}
        description="Pick up where you left off, or start something new."
        actions={
          <Button asChild>
            <Link to="/estimate">New estimate</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/30"
          >
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-4 font-serif text-3xl text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-sans text-base font-medium">Recent estimates</h2>
            <Link to="/dashboard/estimates" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-border">
              {recent.map((estimate) => (
                <li key={estimate.id}>
                  <Link
                    to={`/dashboard/estimates/${estimate.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{estimate.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {estimate.reference} · {estimate.package_title} · {formatDate(estimate.created_at)}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium tabular-nums">{formatINR(estimate.total)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="m-5 border-none bg-muted/40"
              title="No estimates yet"
              description="It takes about five minutes to price your space."
              action={
                <Button asChild variant="outline">
                  <Link to="/estimate">Start an estimate</Link>
                </Button>
              }
            />
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-sans text-base font-medium">Next consultation</h2>
          {next ? (
            <div className="mt-4">
              <p className="font-serif text-2xl text-foreground">{formatWeekdayDate(next.date)}</p>
              <p className="text-muted-foreground">
                {formatTime(next.time_slot)} · {next.mode_label}
              </p>
              <div className="mt-3">
                <StatusBadge status={next.status} label={next.status_label} />
              </div>
              {next.estimate_reference && (
                <p className="mt-3 text-sm text-muted-foreground">About estimate {next.estimate_reference}</p>
              )}
              <Button asChild variant="outline" size="sm" className="mt-5">
                <Link to="/dashboard/consultations">Manage bookings</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Meet a designer at the studio, on a video call or at your site to go over your estimate.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/dashboard/consultations?book=1">Book a consultation</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Overview;
