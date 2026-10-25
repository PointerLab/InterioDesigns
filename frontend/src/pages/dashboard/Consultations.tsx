import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import Field from "@/components/common/Field";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import { EmptyState, ErrorState, PageLoader, Spinner } from "@/components/common/States";
import { IconHome, IconPin, IconVideo } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatINR, formatTime, formatWeekdayDate, parseLocalDate, toISODate } from "@/lib/format";
import { queryKeys, useConsultations, useEstimates } from "@/lib/queries";
import { SITE } from "@/lib/site";
import type { Consultation, ConsultationMode, SlotAvailability } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/usePageTitle";

const MODES: { value: ConsultationMode; label: string; description: string; icon: typeof IconHome }[] = [
  { value: "studio", label: "Studio visit", description: "See materials and samples in person", icon: IconHome },
  { value: "video", label: "Video call", description: "A link is emailed once confirmed", icon: IconVideo },
  { value: "site", label: "Site visit", description: "A designer measures your space", icon: IconPin },
];

const NO_ESTIMATE = "none";

function firstBookableDate(): string {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  if (day.getDay() === 0) day.setDate(day.getDate() + 1);
  return toISODate(day);
}

function dateBounds() {
  const min = new Date();
  min.setDate(min.getDate() + 1);
  const max = new Date();
  max.setDate(max.getDate() + 60);
  return { min: toISODate(min), max: toISODate(max) };
}

interface BookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEstimate: string;
}

function BookDialog({ open, onOpenChange, defaultEstimate }: BookDialogProps) {
  const queryClient = useQueryClient();
  const estimates = useEstimates(open);
  const [date, setDate] = useState(firstBookableDate);
  const [slot, setSlot] = useState("");
  const [mode, setMode] = useState<ConsultationMode>("studio");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [estimate, setEstimate] = useState(defaultEstimate);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => setEstimate(defaultEstimate), [defaultEstimate]);

  const slots = useQuery({
    queryKey: ["slots", date],
    queryFn: () => api.get<SlotAvailability>(`/consultations/slots/?date=${date}`),
    enabled: open && /^\d{4}-\d{2}-\d{2}$/.test(date),
  });

  const book = useMutation({
    mutationFn: () =>
      api.post<Consultation>("/consultations/", {
        date,
        time_slot: slot,
        mode,
        address: mode === "site" ? address : "",
        notes,
        estimate: estimate === NO_ESTIMATE ? null : Number(estimate),
      }),
    onSuccess: (booking) => {
      toast.success("Consultation requested", {
        description: `${formatWeekdayDate(booking.date)} at ${formatTime(booking.time_slot)}. We'll confirm shortly.`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      onOpenChange(false);
      setSlot("");
      setNotes("");
      setErrors({});
    },
    onError: (err) => {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      toast.error(errorMessage(err));
      queryClient.invalidateQueries({ queryKey: ["slots", date] });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!slot) {
      setErrors({ time_slot: "Pick a time slot." });
      return;
    }
    if (mode === "site" && !address.trim()) {
      setErrors({ address: "Add the site address for a site visit." });
      return;
    }
    book.mutate();
  };

  const bounds = dateBounds();
  const linked = estimates.data?.find((item) => String(item.id) === estimate);
  const estimateLabel = linked
    ? `${linked.reference} · ${linked.title} (${formatINR(linked.total)})`
    : estimate === NO_ESTIMATE || estimates.data
      ? "No estimate, just ideas"
      : "Loading...";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal">Book a consultation</DialogTitle>
          <DialogDescription>45 minutes with a designer. Free, and no obligation. {SITE.hours}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <p className="mb-2 text-sm font-medium">How would you like to meet?</p>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
              {MODES.map(({ value, label, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    mode === value ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/30",
                  )}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-2 text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </button>
              ))}
            </div>
          </div>

          {mode === "site" && (
            <Field id="address" label="Site address" error={errors.address}>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Flat, building, area, city"
              />
            </Field>
          )}

          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <Field id="date" label="Date" error={errors.date}>
              <Input
                id="date"
                type="date"
                min={bounds.min}
                max={bounds.max}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSlot("");
                }}
              />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium">Time</p>
              {slots.isLoading ? (
                <Spinner className="mt-2" />
              ) : slots.data?.closed_reason ? (
                <p className="mt-2 text-sm text-muted-foreground">{slots.data.closed_reason}</p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.data?.slots.map((option) => (
                    <button
                      key={option.time}
                      type="button"
                      disabled={!option.available}
                      onClick={() => {
                        setSlot(option.time);
                        setErrors((e) => ({ ...e, time_slot: "" }));
                      }}
                      className={cn(
                        "rounded-md border px-2 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted-foreground/60 disabled:line-through",
                        slot === option.time
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground/30",
                      )}
                    >
                      {formatTime(option.time)}
                    </button>
                  ))}
                </div>
              )}
              {errors.time_slot && <p className="field-error">{errors.time_slot}</p>}
            </div>
          </div>

          <Field id="estimate" label="Discuss an estimate" optional error={errors.estimate}>
            <Select value={estimate} onValueChange={setEstimate}>
              <SelectTrigger id="estimate">
                {/* Label set explicitly: the options load after the preselected value. */}
                <SelectValue>{estimateLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ESTIMATE}>No estimate, just ideas</SelectItem>
                {estimates.data?.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.reference} · {item.title} ({formatINR(item.total)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="notes" label="Anything we should know?" optional error={errors.notes}>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rooms you want to focus on, style references, budget..."
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={book.isPending}>
              {book.isPending ? "Booking..." : "Request booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConsultationCard({ consultation, canCancel }: { consultation: Consultation; canCancel: boolean }) {
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api.post<Consultation>(`/consultations/${consultation.id}/cancel/`),
    onSuccess: () => {
      toast.success("Booking cancelled");
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <li className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-start">
      <div className="w-full shrink-0 sm:w-40">
        <p className="font-serif text-xl text-foreground">{formatWeekdayDate(consultation.date)}</p>
        <p className="text-sm text-muted-foreground">{formatTime(consultation.time_slot)}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{consultation.mode_label}</p>
          <StatusBadge status={consultation.status} label={consultation.status_label} />
        </div>
        {consultation.address && <p className="text-muted-foreground">{consultation.address}</p>}
        {consultation.estimate && (
          <p className="text-muted-foreground">
            Estimate:{" "}
            <Link to={`/dashboard/estimates/${consultation.estimate}`} className="text-primary hover:underline">
              {consultation.estimate_reference} {consultation.estimate_title}
            </Link>
          </p>
        )}
        {consultation.notes && <p className="text-muted-foreground">"{consultation.notes}"</p>}
        {consultation.staff_note && (
          <p className="rounded-md bg-muted px-3 py-2 text-foreground">
            <span className="font-medium">Note from the studio:</span> {consultation.staff_note}
          </p>
        )}
      </div>
      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={cancel.isPending}>
              Cancel booking
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this consultation?</AlertDialogTitle>
              <AlertDialogDescription>
                {formatWeekdayDate(consultation.date)} at {formatTime(consultation.time_slot)} will be released for
                others to book.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep booking</AlertDialogCancel>
              <AlertDialogAction onClick={() => cancel.mutate()}>Cancel booking</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </li>
  );
}

const Consultations = () => {
  usePageTitle("Consultations");
  const { data, isLoading, error, refetch } = useConsultations();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [defaultEstimate, setDefaultEstimate] = useState(NO_ESTIMATE);

  // Links like ?book=1&estimate=12 open the booking dialog.
  useEffect(() => {
    if (params.get("book")) {
      setDefaultEstimate(params.get("estimate") ?? NO_ESTIMATE);
      setOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isActive = (c: Consultation) =>
    parseLocalDate(c.date) >= today && (c.status === "requested" || c.status === "confirmed");
  const upcoming = (data ?? []).filter(isActive);
  const past = (data ?? []).filter((c) => !isActive(c)).reverse();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Consultations"
        description="Meet a designer to review your estimate, see materials and plan the work."
        actions={<Button onClick={() => setOpen(true)}>Book a consultation</Button>}
      />

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState
          title="No bookings yet"
          description="Book a free studio visit, video call or site visit. Attach a saved estimate so we come prepared."
          action={<Button onClick={() => setOpen(true)}>Book a consultation</Button>}
        />
      ) : (
        <>
          <section>
            <h2 className="mb-3 font-sans text-base font-medium">Upcoming</h2>
            {upcoming.length ? (
              <ul className="space-y-3">
                {upcoming.map((c) => (
                  <ConsultationCard key={c.id} consultation={c} canCancel />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
            )}
          </section>
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 font-sans text-base font-medium">Past and cancelled</h2>
              <ul className="space-y-3 opacity-80">
                {past.map((c) => (
                  <ConsultationCard key={c.id} consultation={c} canCancel={false} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <BookDialog open={open} onOpenChange={setOpen} defaultEstimate={defaultEstimate} />
    </div>
  );
};

export default Consultations;
