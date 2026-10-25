import { useEffect, useMemo, useState, type ReactNode } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import QuantityStepper from "@/components/common/QuantityStepper";
import { ErrorState, PageLoader, Spinner } from "@/components/common/States";
import EstimateBreakdown from "@/components/estimate/EstimateBreakdown";
import {
  FURNITURE_GROUPS,
  MAX_AREA,
  MIN_AREA,
  PROJECT_OPTIONS,
  PROPERTY_OPTIONS,
  SCOPE_OPTIONS,
  STEPS,
  areaValue,
  freshState,
  furnitureBlocker,
  loadDraft,
  presetFor,
  recommendedFurniture,
  saveDraft,
  sizeDefaults,
  stateFromEstimate,
  toPayload,
  visibleFurniture,
  visibleServices,
  type WizardState,
} from "@/components/estimate/wizard";
import { IconArrowLeft, IconArrowRight, IconCheck } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatINR, formatNumber } from "@/lib/format";
import { queryKeys, useCatalog } from "@/lib/queries";
import type { Catalog, Estimate as SavedEstimate, EstimateInput, EstimateResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/usePageTitle";

const OTHER_CITY = "__other";

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
}

function OptionCard({ selected, onSelect, title, description, children }: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "relative flex w-full flex-col justify-start rounded-lg border bg-card p-4 text-left transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground/30",
      )}
    >
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <IconCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
      )}
      <p className="pr-6 font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {children}
    </button>
  );
}

function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-serif text-2xl text-foreground md:text-3xl">{title}</h2>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}

const Estimate = () => {
  usePageTitle("Cost estimator");
  const { data: catalog, isLoading, error, refetch } = useCatalog();
  const [params] = useSearchParams();
  const editId = Number(params.get("edit")) || null;
  const { user } = useAuth();

  const existing = useQuery({
    queryKey: queryKeys.estimate(editId ?? 0),
    queryFn: () => api.get<SavedEstimate>(`/estimates/${editId}/`),
    enabled: Boolean(editId && user),
  });

  if (editId && !user) {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-muted-foreground">Sign in to edit a saved estimate.</p>
        <Button asChild className="mt-4">
          <Link to={`/login?next=${encodeURIComponent(`/estimate?edit=${editId}`)}`}>Sign in</Link>
        </Button>
      </div>
    );
  }
  if (isLoading || (editId && existing.isLoading)) return <PageLoader label="Loading prices" />;
  if (error || !catalog || existing.error) {
    return (
      <div className="container-page py-16">
        <ErrorState error={error ?? existing.error} onRetry={() => (error ? refetch() : existing.refetch())} />
      </div>
    );
  }

  let initial: WizardState;
  const draft = loadDraft();
  const fromEntryPoint = ["property", "scope", "package"].some((key) => params.has(key));
  if (existing.data) initial = stateFromEstimate(catalog, existing.data);
  else if (draft && !fromEntryPoint && !draft.editId) initial = draft;
  else initial = freshState(catalog, params);

  return <Wizard key={editId ?? "new"} catalog={catalog} initial={initial} />;
};

function Wizard({ catalog, initial }: { catalog: Catalog; initial: WizardState }) {
  const [state, setState] = useState<WizardState>(initial);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  useEffect(() => saveDraft(state), [state]);

  // Entry links (e.g. ?scope=kitchen) only seed the wizard. Drop them so a
  // refresh resumes the saved draft instead of starting over.
  useEffect(() => {
    const next = new URLSearchParams(params);
    ["property", "scope", "package"].forEach((key) => next.delete(key));
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));
  const goTo = (step: number) => {
    update({ step });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Compare by value so moving between steps doesn't trigger a recalculation.
  const payloadJson = useMemo(() => JSON.stringify(toPayload(catalog, state)), [catalog, state]);
  const debouncedJson = useDebounced(payloadJson, 350);
  const payload = useMemo(() => JSON.parse(payloadJson) as EstimateInput | null, [payloadJson]);
  const debouncedPayload = useMemo(() => JSON.parse(debouncedJson) as EstimateInput | null, [debouncedJson]);
  const preview = useQuery({
    queryKey: ["estimate-preview", debouncedPayload],
    queryFn: () => api.post<EstimateResult>("/estimates/preview/", debouncedPayload),
    enabled: Boolean(debouncedPayload),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const result = preview.data;
  const updating = preview.isFetching || payloadJson !== debouncedJson;

  const save = useMutation({
    mutationFn: () =>
      state.editId
        ? api.put<SavedEstimate>(`/estimates/${state.editId}/`, payload)
        : api.post<SavedEstimate>("/estimates/", payload),
    onSuccess: (estimate) => {
      saveDraft(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.estimates });
      queryClient.setQueryData(queryKeys.estimate(estimate.id), estimate);
      toast.success(state.editId ? "Estimate updated" : `Estimate ${estimate.reference} saved`);
      navigate(`/dashboard/estimates/${estimate.id}`);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const handleSave = () => {
    if (!payload) return;
    if (!user) {
      saveDraft({ ...state, step: STEPS.length - 1 });
      toast("Sign in to save your estimate", { description: "Your answers are kept, you won't lose anything." });
      navigate(`/login?next=${encodeURIComponent("/estimate")}`);
      return;
    }
    save.mutate();
  };

  const startOver = () => {
    saveDraft(null);
    setState(freshState(catalog, new URLSearchParams()));
    window.scrollTo({ top: 0 });
  };

  const area = areaValue(state);
  const stepValid = [
    true,
    Boolean(area && state.rooms >= 1),
    Boolean(state.package_tier),
    true,
    true,
    Boolean(payload),
  ];
  const canContinue = stepValid[state.step];
  const isLast = state.step === STEPS.length - 1;
  const furnitureCount = Object.values(state.furniture).filter((q) => q > 0).length;

  return (
    <div className="container-page pb-28 pt-8 lg:pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{state.editId ? "Edit estimate" : "Cost estimator"}</p>
          <h1 className="mt-1 font-serif text-3xl text-foreground md:text-4xl">
            {state.editId ? state.title || "Update your estimate" : "Estimate your interior"}
          </h1>
        </div>
        {!state.editId && (
          <button type="button" onClick={startOver} className="text-sm text-muted-foreground hover:text-foreground">
            Start over
          </button>
        )}
      </div>

      <ol className="mt-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="Steps">
        {STEPS.map((label, index) => {
          const reachable = index <= state.step || stepValid.slice(0, index).every(Boolean);
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => goTo(index)}
                aria-current={index === state.step ? "step" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  index === state.step
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    index < state.step ? "bg-primary text-primary-foreground" : "border border-current",
                  )}
                >
                  {index < state.step ? <IconCheck className="h-3 w-3" strokeWidth={2.4} /> : index + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {state.step === 0 && <SpaceStep catalog={catalog} state={state} setState={setState} />}
          {state.step === 1 && <SizeStep catalog={catalog} state={state} setState={setState} />}
          {state.step === 2 && <PackageStep catalog={catalog} state={state} update={update} />}
          {state.step === 3 && <FurnitureStep catalog={catalog} state={state} setState={setState} />}
          {state.step === 4 && <ServicesStep catalog={catalog} state={state} setState={setState} />}
          {state.step === 5 && (
            <ReviewStep
              catalog={catalog}
              state={state}
              update={update}
              goTo={goTo}
              result={result}
              updating={updating}
            />
          )}

          <div className="mt-10 hidden items-center justify-between border-t border-border pt-6 lg:flex">
            <Button variant="ghost" onClick={() => goTo(state.step - 1)} disabled={state.step === 0}>
              <IconArrowLeft /> Back
            </Button>
            {isLast ? (
              <Button size="lg" onClick={handleSave} disabled={!payload || save.isPending}>
                {save.isPending
                  ? "Saving..."
                  : user
                    ? state.editId
                      ? "Update estimate"
                      : "Save estimate"
                    : "Sign in to save"}
              </Button>
            ) : (
              <Button size="lg" onClick={() => goTo(state.step + 1)} disabled={!canContinue}>
                {state.step === 3 && furnitureCount === 0 ? "Skip furniture" : "Continue"} <IconArrowRight />
              </Button>
            )}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <LiveSummary catalog={catalog} state={state} result={result} updating={updating} error={preview.error} />
          </div>
        </aside>
      </div>

      {/* Mobile: running total and navigation */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 py-3 lg:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo(state.step - 1)}
            disabled={state.step === 0}
            aria-label="Back"
          >
            <IconArrowLeft />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Estimated total</p>
            <p className="truncate font-medium tabular-nums">{result ? formatINR(result.total) : "—"}</p>
          </div>
          {isLast ? (
            <Button onClick={handleSave} disabled={!payload || save.isPending}>
              {save.isPending ? "Saving..." : user ? "Save" : "Sign in to save"}
            </Button>
          ) : (
            <Button onClick={() => goTo(state.step + 1)} disabled={!canContinue}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

type SetState = React.Dispatch<React.SetStateAction<WizardState>>;

function SpaceStep({ catalog, state, setState }: { catalog: Catalog; state: WizardState; setState: SetState }) {
  const presets = catalog.space_presets[state.property_type];

  const chooseProperty = (property_type: WizardState["property_type"]) =>
    setState((s) => {
      if (s.property_type === property_type) return s;
      const preset_id = catalog.space_presets[property_type][0].id;
      const scope = property_type === "residential" ? s.scope : "full";
      const size = sizeDefaults(catalog, { property_type, preset_id, scope });
      return { ...s, property_type, preset_id, scope, area: String(size.area), rooms: size.rooms, furniture: {} };
    });

  const choosePreset = (preset_id: string) =>
    setState((s) => {
      const size = sizeDefaults(catalog, { ...s, preset_id });
      return { ...s, preset_id, area: String(size.area), rooms: size.rooms };
    });

  return (
    <div className="space-y-10">
      <section>
        <StepHeading title="What are we designing?" description="Pick the type of space. You can change this later." />
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
          {PROPERTY_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              selected={state.property_type === option.value}
              onSelect={() => chooseProperty(option.value)}
              title={option.label}
              description={option.description}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-sans text-base font-medium text-foreground">
          {state.property_type === "residential" ? "Home size" : "Type of space"}
        </h3>
        <div role="radiogroup" className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={state.preset_id === preset.id}
              onClick={() => choosePreset(preset.id)}
              className={cn(
                "rounded-md border px-4 py-2.5 text-sm transition-colors",
                state.preset_id === preset.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:border-foreground/30",
              )}
            >
              {preset.label}
              <span
                className={cn(
                  "ml-2 text-xs",
                  state.preset_id === preset.id ? "text-background/70" : "text-muted-foreground",
                )}
              >
                ~{formatNumber(preset.area)} sq.ft
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-sans text-base font-medium text-foreground">New interior or renovation?</h3>
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
          {PROJECT_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              selected={state.project_type === option.value}
              onSelect={() => setState((s) => ({ ...s, project_type: option.value }))}
              title={option.label}
              description={option.description}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SizeStep({ catalog, state, setState }: { catalog: Catalog; state: WizardState; setState: SetState }) {
  const preset = presetFor(catalog, state);
  const area = areaValue(state);
  const showAreaError = state.area !== "" && !area;

  const chooseScope = (scope: WizardState["scope"]) =>
    setState((s) => {
      if (s.scope === scope) return s;
      const size = sizeDefaults(catalog, { ...s, scope });
      return { ...s, scope, area: String(size.area), rooms: size.rooms };
    });

  return (
    <div className="space-y-10">
      {state.property_type === "residential" && (
        <section>
          <StepHeading
            title="What's included?"
            description="Estimate the whole home, or just the kitchen or wardrobes."
          />
          <div role="radiogroup" className="grid gap-3 sm:grid-cols-3">
            {SCOPE_OPTIONS.map((option) => (
              <OptionCard
                key={option.value}
                selected={state.scope === option.value}
                onSelect={() => chooseScope(option.value)}
                title={option.label}
                description={option.description}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        {state.property_type === "residential" ? (
          <h3 className="mb-4 font-sans text-base font-medium text-foreground">Size of the area</h3>
        ) : (
          <StepHeading
            title="How big is the space?"
            description="Use the carpet area, not the built-up or super built-up area."
          />
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="area" className="mb-1.5 block text-sm font-medium">
              Carpet area (sq.ft)
            </Label>
            <Input
              id="area"
              type="number"
              inputMode="numeric"
              min={MIN_AREA}
              max={MAX_AREA}
              value={state.area}
              onChange={(e) => setState((s) => ({ ...s, area: e.target.value }))}
              aria-invalid={showAreaError}
              aria-describedby="area-help"
            />
            <p
              id="area-help"
              className={cn("mt-1 text-xs", showAreaError ? "text-destructive" : "text-muted-foreground")}
            >
              {showAreaError
                ? `Enter a whole number between ${MIN_AREA} and ${formatNumber(MAX_AREA)}.`
                : state.scope === "full" || state.property_type !== "residential"
                  ? `A typical ${preset.label} is about ${formatNumber(preset.area)} sq.ft.`
                  : "Only the area being worked on."}
            </p>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Number of rooms</Label>
            <QuantityStepper
              label="rooms"
              value={state.rooms}
              min={1}
              max={50}
              onChange={(rooms) => setState((s) => ({ ...s, rooms }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {state.property_type === "residential"
                ? "Bedrooms, living, kitchen and dining together."
                : "Cabins, zones and meeting rooms."}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function PackageStep({
  catalog,
  state,
  update,
}: {
  catalog: Catalog;
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
}) {
  const area = areaValue(state) ?? 0;
  return (
    <section>
      <StepHeading
        title="Choose a package"
        description="Packages set the finish quality and the rate for design, civil and finishing work."
      />
      <div role="radiogroup" className="grid gap-4 md:grid-cols-3">
        {catalog.packages.map((pkg) => (
          <OptionCard
            key={pkg.tier}
            selected={state.package_tier === pkg.tier}
            onSelect={() => update({ package_tier: pkg.tier })}
            title={pkg.title}
            description={pkg.tagline}
          >
            <p className="mt-4 font-serif text-2xl text-foreground">
              {formatINR(pkg.rate_per_sqft)}
              <span className="font-sans text-sm text-muted-foreground"> / sq.ft</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {formatINR(pkg.rate_per_sqft * area)} for {formatNumber(area)} sq.ft
            </p>
            <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
              {pkg.inclusions.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              From {pkg.base_timeline_weeks} weeks · {pkg.warranty_years}-year warranty
            </p>
          </OptionCard>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Not sure?{" "}
        <Link to="/packages" target="_blank" className="text-primary hover:underline">
          Compare packages side by side
        </Link>
        .
      </p>
    </section>
  );
}

function FurnitureStep({ catalog, state, setState }: { catalog: Catalog; state: WizardState; setState: SetState }) {
  const items = visibleFurniture(catalog, state);
  const pkg = catalog.packages.find((p) => p.tier === state.package_tier);
  const multiplier = pkg?.furniture_multiplier ?? 1;
  const groups = Object.entries(FURNITURE_GROUPS)
    .map(([key, label]) => ({ key, label, items: items.filter((item) => item.category === key) }))
    .filter((group) => group.items.length);

  const setQuantity = (id: number, quantity: number) =>
    setState((s) => ({ ...s, furniture: { ...s.furniture, [id]: quantity } }));

  const applyRecommended = () => setState((s) => ({ ...s, furniture: recommendedFurniture(catalog, s) }));
  const hasSelection = Object.values(state.furniture).some((q) => q > 0);

  return (
    <section>
      <StepHeading
        title="Furniture & modular units"
        description={`Prices are at ${pkg?.title ?? "package"} grade. Add what you need, or skip this step.`}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={applyRecommended}>
          Use recommended set
        </Button>
        {hasSelection && (
          <Button variant="ghost" size="sm" onClick={() => setState((s) => ({ ...s, furniture: {} }))}>
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-8">
        {groups.map((group) => (
          <div key={group.key}>
            <h3 className="mb-2 font-sans text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h3>
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {group.items.map((item) => {
                const blocker = furnitureBlocker(item, state);
                const quantity = state.furniture[item.id] ?? 0;
                return (
                  <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                        {item.name}
                        {item.is_ready_made && <Badge variant="neutral">Ready-made</Badge>}
                        {blocker && <Badge variant="warning">{blocker}</Badge>}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatINR(item.unit_price * multiplier)}
                        {item.price_type === "sqft" ? " / sq.ft" : " each"}
                      </p>
                      <QuantityStepper
                        label={item.name}
                        value={blocker ? 0 : quantity}
                        disabled={Boolean(blocker)}
                        onChange={(q) => setQuantity(item.id, q)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServicesStep({ catalog, state, setState }: { catalog: Catalog; state: WizardState; setState: SetState }) {
  const services = visibleServices(catalog, state);
  const area = areaValue(state) ?? 0;
  const selectedCity = catalog.cities.find((c) => c.city === state.city);

  const setQuantity = (id: number, quantity: number) =>
    setState((s) => ({ ...s, services: { ...s.services, [id]: quantity } }));

  return (
    <div className="space-y-10">
      <section>
        <StepHeading
          title={state.project_type === "renovation" ? "Services & renovation work" : "Add-on services"}
          description={
            state.project_type === "renovation"
              ? "Pick the civil, electrical and plumbing work your space needs."
              : "Optional upgrades. Renovation work like flooring and rewiring appears for renovation projects."
          }
        />
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {services.map((service) => {
            const quantity = state.services[service.id] ?? 0;
            const checked = quantity > 0;
            const perSqft = service.price_type === "sqft";
            return (
              <li key={service.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={checked}
                    onCheckedChange={(value) =>
                      setQuantity(
                        service.id,
                        value === true ? (!perSqft && /per room/i.test(service.description) ? state.rooms : 1) : 0,
                      )
                    }
                  />
                  <span>
                    <span className="block font-medium text-foreground">{service.name}</span>
                    <span className="block text-sm text-muted-foreground">{service.description}</span>
                  </span>
                </label>
                <div className="flex items-center justify-between gap-4 pl-7 sm:justify-end sm:pl-0">
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {perSqft
                      ? `${formatINR(service.unit_price)} / sq.ft · ${formatINR(service.unit_price * area)}`
                      : `${formatINR(service.unit_price)} each`}
                  </p>
                  {!perSqft && checked && (
                    <QuantityStepper
                      label={service.name}
                      value={quantity}
                      min={1}
                      onChange={(q) => setQuantity(service.id, q)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-sans text-base font-medium text-foreground">Where is the project?</h3>
        <p className="mb-3 text-sm text-muted-foreground">Labour and material costs vary by city.</p>
        <div className="max-w-sm">
          <Select
            value={state.city || OTHER_CITY}
            onValueChange={(value) => setState((s) => ({ ...s, city: value === OTHER_CITY ? "" : value }))}
          >
            <SelectTrigger aria-label="City">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {catalog.cities.map((city) => (
                <SelectItem key={city.id} value={city.city}>
                  {city.city}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_CITY}>Other city</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {selectedCity
              ? selectedCity.multiplier === 1
                ? "Base pricing applies."
                : `Prices in ${selectedCity.city} are ${Math.abs(Math.round((selectedCity.multiplier - 1) * 100))}% ${selectedCity.multiplier > 1 ? "above" : "below"} base.`
              : "Base pricing applies. We'll confirm local rates after a site visit."}
          </p>
        </div>
      </section>
    </div>
  );
}

interface ReviewStepProps {
  catalog: Catalog;
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
  goTo: (step: number) => void;
  result?: EstimateResult;
  updating: boolean;
}

function ReviewStep({ catalog, state, update, goTo, result, updating }: ReviewStepProps) {
  const preset = presetFor(catalog, state);
  const pkg = catalog.packages.find((p) => p.tier === state.package_tier);
  const scopeLabel = SCOPE_OPTIONS.find((o) => o.value === state.scope)?.label;
  const defaultTitle = [
    preset.label,
    state.property_type === "residential" && state.scope !== "full" ? scopeLabel?.toLowerCase() : "",
    state.city ? `in ${state.city}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const facts = [
    {
      label: "Space",
      value: `${PROPERTY_OPTIONS.find((o) => o.value === state.property_type)?.label} · ${preset.label}`,
      step: 0,
    },
    { label: "Project", value: PROJECT_OPTIONS.find((o) => o.value === state.project_type)?.label, step: 0 },
    {
      label: "Area",
      value: `${formatNumber(areaValue(state) ?? 0)} sq.ft · ${state.rooms} rooms${state.property_type === "residential" ? ` · ${scopeLabel}` : ""}`,
      step: 1,
    },
    { label: "Package", value: pkg?.title, step: 2 },
    { label: "City", value: state.city || "Other city", step: 4 },
  ];

  return (
    <section>
      <StepHeading
        title="Review your estimate"
        description="Check the details, give it a name and save it to your account."
      />

      <div className="mb-8 max-w-md">
        <Label htmlFor="title" className="mb-1.5 block text-sm font-medium">
          Estimate name
        </Label>
        <Input
          id="title"
          value={state.title}
          maxLength={120}
          placeholder={defaultTitle}
          onChange={(e) => update({ title: e.target.value })}
        />
      </div>

      <dl className="mb-10 divide-y divide-border rounded-lg border border-border bg-card text-sm">
        {facts.map((fact) => (
          <div key={fact.label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="w-24 shrink-0 text-muted-foreground">{fact.label}</dt>
            <dd className="flex-1 text-foreground">{fact.value}</dd>
            <button type="button" onClick={() => goTo(fact.step)} className="text-primary hover:underline">
              Edit
            </button>
          </div>
        ))}
      </dl>

      {result ? (
        <div className={cn("transition-opacity", updating && "opacity-60")}>
          <EstimateBreakdown result={result} />
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner /> Calculating
        </div>
      )}
    </section>
  );
}

interface LiveSummaryProps {
  catalog: Catalog;
  state: WizardState;
  result?: EstimateResult;
  updating: boolean;
  error: unknown;
}

function LiveSummary({ catalog, state, result, updating, error }: LiveSummaryProps) {
  const preset = presetFor(catalog, state);
  const lines = result
    ? [
        { label: "Package work", amount: result.base.amount },
        { label: "Furniture", amount: result.furniture.amount },
        { label: "Services", amount: result.services.amount },
        { label: "City adjustment", amount: result.location.adjustment },
        { label: "GST (18%)", amount: result.gst.amount },
      ]
    : [];

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Estimated total</p>
          {updating && <Spinner className="h-4 w-4" />}
        </div>
        <p className="mt-1 font-serif text-3xl tabular-nums text-foreground">
          {result ? formatINR(result.total) : "—"}
        </p>
        {result && (
          <p className="mt-1 text-xs text-muted-foreground">
            Range {formatINR(result.range.low)} – {formatINR(result.range.high)}
          </p>
        )}
      </div>
      <div className="space-y-2 p-5 text-sm">
        {error && !result ? (
          <p className="text-destructive">{errorMessage(error)}</p>
        ) : (
          lines.map((line) => (
            <div key={line.label} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{line.label}</span>
              <span className="tabular-nums">{formatINR(line.amount)}</span>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-border p-5 text-xs leading-relaxed text-muted-foreground">
        <p>
          {preset.label} · {formatNumber(areaValue(state) ?? 0)} sq.ft ·{" "}
          {catalog.packages.find((p) => p.tier === state.package_tier)?.title}
        </p>
        {result && <p className="mt-1">About {result.timeline.weeks} weeks from design to handover.</p>}
      </div>
    </div>
  );
}

export default Estimate;
