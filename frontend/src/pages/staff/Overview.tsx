import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import { ErrorState, PageLoader } from "@/components/common/States";
import { api } from "@/lib/api";
import { formatDate, formatINR, formatINRShort, formatTime, formatWeekdayDate } from "@/lib/format";
import type { StaffOverview } from "@/lib/types";
import { usePageTitle } from "@/lib/usePageTitle";

const Overview = () => {
  usePageTitle("Studio overview");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["staff", "overview"],
    queryFn: () => api.get<StaffOverview>("/staff/overview/"),
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) return <ErrorState error={error} onRetry={() => refetch()} />;

  const tiles = [
    { label: "Customers", value: data.customers, note: `${data.new_customers_30d} new in 30 days` },
    { label: "Estimates (30 days)", value: data.estimates_30d, note: `${data.estimates} all time` },
    {
      label: "Pipeline value (30 days)",
      value: formatINRShort(data.pipeline_value_30d),
      note: "Sum of saved estimates",
    },
    {
      label: "Bookings to confirm",
      value: data.consultations.requested,
      note: `${data.consultations.confirmed} confirmed`,
      to: "/staff/consultations",
    },
    { label: "Open messages", value: data.open_messages, note: "From the contact form", to: "/staff/messages" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Studio overview" description="Leads, bookings and messages at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((tile) => {
          const body = (
            <>
              <p className="text-sm text-muted-foreground">{tile.label}</p>
              <p className="mt-2 font-serif text-3xl text-foreground">{tile.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{tile.note}</p>
            </>
          );
          return tile.to ? (
            <Link
              key={tile.label}
              to={tile.to}
              className="rounded-lg border border-border bg-card p-5 hover:border-foreground/30"
            >
              {body}
            </Link>
          ) : (
            <div key={tile.label} className="rounded-lg border border-border bg-card p-5">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-sans text-base font-medium">Upcoming consultations</h2>
            <Link to="/staff/consultations" className="text-sm text-primary hover:underline">
              Manage
            </Link>
          </div>
          {data.upcoming_consultations.length ? (
            <ul className="divide-y divide-border">
              {data.upcoming_consultations.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{c.customer_name || c.customer_email}</p>
                    <p className="text-muted-foreground">
                      {formatWeekdayDate(c.date)}, {formatTime(c.time_slot)} · {c.mode_label}
                    </p>
                  </div>
                  <StatusBadge status={c.status} label={c.status_label} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-muted-foreground">No upcoming bookings.</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-sans text-base font-medium">Latest estimates</h2>
            <Link to="/staff/leads" className="text-sm text-primary hover:underline">
              All leads
            </Link>
          </div>
          {data.latest_estimates.length ? (
            <ul className="divide-y divide-border">
              {data.latest_estimates.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="text-muted-foreground">
                      {e.customer_name} · {e.package_title} · {formatDate(e.created_at)}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums">{formatINR(e.total)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-muted-foreground">No estimates saved yet.</p>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-sans text-base font-medium">Estimates by package</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 font-normal">Package</th>
                <th className="pb-2 text-right font-normal">Estimates</th>
                <th className="pb-2 text-right font-normal">Total value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.by_package.map((row) => (
                <tr key={row.package}>
                  <td className="py-2">{row.package}</td>
                  <td className="py-2 text-right tabular-nums">{row.count}</td>
                  <td className="py-2 text-right tabular-nums">{formatINR(row.value)}</td>
                </tr>
              ))}
              {!data.by_package.length && (
                <tr>
                  <td colSpan={3} className="py-4 text-muted-foreground">
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-sans text-base font-medium">Top cities</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 font-normal">City</th>
                <th className="pb-2 text-right font-normal">Estimates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.by_city.map((row) => (
                <tr key={row.city}>
                  <td className="py-2">{row.city}</td>
                  <td className="py-2 text-right tabular-nums">{row.count}</td>
                </tr>
              ))}
              {!data.by_city.length && (
                <tr>
                  <td colSpan={2} className="py-4 text-muted-foreground">
                    No data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

export default Overview;
