import type {
  Catalog,
  Estimate,
  EstimateInput,
  FurnitureItem,
  PackageTier,
  ProjectType,
  PropertyType,
  Scope,
  Service,
  SpacePreset,
} from "@/lib/types";

export const STEPS = ["Space", "Size", "Package", "Furniture", "Services", "Review"] as const;
export const DRAFT_KEY = "interio.estimate-draft";
export const MIN_AREA = 50;
export const MAX_AREA = 100000;

export interface WizardState {
  step: number;
  editId: number | null;
  property_type: PropertyType;
  preset_id: string;
  project_type: ProjectType;
  scope: Scope;
  area: string;
  rooms: number;
  package_tier: PackageTier;
  furniture: Record<string, number>;
  services: Record<string, number>;
  city: string;
  title: string;
}

export const PROPERTY_OPTIONS: { value: PropertyType; label: string; description: string }[] = [
  { value: "residential", label: "Home", description: "Apartments, independent houses and villas" },
  { value: "commercial", label: "Commercial", description: "Shops, showrooms, cafés and restaurants" },
  { value: "office", label: "Office", description: "Startup studios and corporate floors" },
];

export const PROJECT_OPTIONS: { value: ProjectType; label: string; description: string }[] = [
  { value: "new", label: "New interior", description: "A new or bare space being fitted out for the first time" },
  {
    value: "renovation",
    label: "Renovation",
    description: "Updating a lived-in space, including civil work if needed",
  },
];

export const SCOPE_OPTIONS: { value: Scope; label: string; description: string }[] = [
  { value: "full", label: "Full interior", description: "Every room, with furniture and finishing" },
  { value: "kitchen", label: "Kitchen only", description: "Modular kitchen and related work" },
  { value: "wardrobe", label: "Wardrobes only", description: "Bedroom storage and wardrobes" },
];

export const FURNITURE_GROUPS: Record<string, string> = {
  kitchen: "Kitchen",
  wardrobe: "Wardrobes",
  living: "Living room",
  bedroom: "Bedroom & study",
  dining: "Dining",
  workspace: "Workspace",
  "front-of-house": "Front of house",
};

const SCOPE_CATEGORIES: Record<Scope, string[] | null> = {
  full: null,
  kitchen: ["kitchen"],
  wardrobe: ["wardrobe"],
};

const SCOPE_SIZES: Record<Scope, { area: number; rooms: number } | null> = {
  full: null,
  kitchen: { area: 120, rooms: 1 },
  wardrobe: { area: 180, rooms: 2 },
};

export function presetFor(catalog: Catalog, state: Pick<WizardState, "property_type" | "preset_id">): SpacePreset {
  const presets = catalog.space_presets[state.property_type];
  return presets.find((p) => p.id === state.preset_id) ?? presets[0];
}

/** Area and room defaults for the chosen preset and scope. */
export function sizeDefaults(catalog: Catalog, state: Pick<WizardState, "property_type" | "preset_id" | "scope">) {
  const scoped = state.property_type === "residential" ? SCOPE_SIZES[state.scope] : null;
  const preset = presetFor(catalog, state);
  return scoped ?? { area: preset.area, rooms: preset.rooms };
}

function isProperty(value: string | null): value is PropertyType {
  return value === "residential" || value === "commercial" || value === "office";
}

function isScope(value: string | null): value is Scope {
  return value === "full" || value === "kitchen" || value === "wardrobe";
}

function isTier(value: string | null): value is PackageTier {
  return value === "basic" || value === "standard" || value === "premium";
}

export function freshState(catalog: Catalog, params: URLSearchParams): WizardState {
  const property_type = isProperty(params.get("property")) ? (params.get("property") as PropertyType) : "residential";
  const presets = catalog.space_presets[property_type];
  const preset_id = presets.find((p) => p.id === "2bhk")?.id ?? presets[0].id;
  const scope =
    property_type === "residential" && isScope(params.get("scope")) ? (params.get("scope") as Scope) : "full";
  const size = sizeDefaults(catalog, { property_type, preset_id, scope });
  const tier = params.get("package");

  return {
    step: 0,
    editId: null,
    property_type,
    preset_id,
    project_type: "new",
    scope,
    area: String(size.area),
    rooms: size.rooms,
    package_tier: isTier(tier) ? tier : "standard",
    furniture: {},
    services: {},
    city: "",
    title: "",
  };
}

export function stateFromEstimate(catalog: Catalog, estimate: Estimate): WizardState {
  const presets = catalog.space_presets[estimate.property_type];
  const preset = presets.find((p) => p.label === estimate.property_subtype) ?? presets[0];
  const toMap = (lines: { id: number; quantity: number }[]) =>
    Object.fromEntries(lines.map((line) => [String(line.id), line.quantity]));

  return {
    step: 5,
    editId: estimate.id,
    property_type: estimate.property_type,
    preset_id: preset.id,
    project_type: estimate.project_type,
    scope: estimate.scope,
    area: String(estimate.area_sqft),
    rooms: estimate.room_count,
    package_tier: estimate.package_tier,
    furniture: toMap(estimate.selections.furniture ?? []),
    services: toMap(estimate.selections.services ?? []),
    city: estimate.city,
    title: estimate.title,
  };
}

export function loadDraft(): WizardState | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as WizardState) : null;
  } catch {
    return null;
  }
}

export function saveDraft(state: WizardState | null) {
  try {
    if (state) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Drafts are a convenience; ignore storage failures.
  }
}

export function areaValue(state: WizardState): number | null {
  const area = Number(state.area);
  return Number.isInteger(area) && area >= MIN_AREA && area <= MAX_AREA ? area : null;
}

/** Why an item can't be picked with the current choices, or null if it can. */
export function furnitureBlocker(item: FurnitureItem, state: WizardState): string | null {
  if (item.compatible_packages.length && !item.compatible_packages.includes(state.package_tier)) {
    const tiers = item.compatible_packages.map((t) => t[0].toUpperCase() + t.slice(1)).join(" & ");
    return `Available with ${tiers}`;
  }
  return null;
}

export function visibleFurniture(catalog: Catalog, state: WizardState): FurnitureItem[] {
  const categories = state.property_type === "residential" ? SCOPE_CATEGORIES[state.scope] : null;
  return catalog.furniture_items.filter(
    (item) =>
      (!item.property_types.length || item.property_types.includes(state.property_type)) &&
      (!categories || categories.includes(item.category)),
  );
}

export function visibleServices(catalog: Catalog, state: WizardState): Service[] {
  return catalog.services.filter(
    (service) =>
      !service.enabled_for_project_types.length || service.enabled_for_project_types.includes(state.project_type),
  );
}

export function toPayload(catalog: Catalog, state: WizardState): EstimateInput | null {
  const area = areaValue(state);
  if (!area || state.rooms < 1) return null;

  const furniture = visibleFurniture(catalog, state)
    .filter((item) => (state.furniture[item.id] ?? 0) > 0 && !furnitureBlocker(item, state))
    .map((item) => ({ id: item.id, quantity: state.furniture[item.id] }));
  const services = visibleServices(catalog, state)
    .filter((service) => (state.services[service.id] ?? 0) > 0)
    .map((service) => ({ id: service.id, quantity: service.price_type === "unit" ? state.services[service.id] : 1 }));

  return {
    title: state.title.trim() || undefined,
    property_type: state.property_type,
    property_subtype: presetFor(catalog, state).label,
    project_type: state.project_type,
    scope: state.property_type === "residential" ? state.scope : "full",
    area_sqft: area,
    room_count: state.rooms,
    package_tier: state.package_tier,
    city: state.city,
    furniture,
    services,
  };
}

/** A sensible starting set of furniture for the chosen space. */
export function recommendedFurniture(catalog: Catalog, state: WizardState): Record<string, number> {
  const area = areaValue(state) ?? 0;
  const bedrooms = Number(/^(\d)bhk$/.exec(state.preset_id)?.[1] ?? (state.preset_id === "villa" ? 5 : 2));
  const picks: [string, number][] = [];

  if (state.property_type === "residential") {
    if (state.scope === "kitchen") picks.push(["Modular Kitchen", 1], ["Kitchen Tall Unit", 1]);
    else if (state.scope === "wardrobe") picks.push(["Wardrobe", bedrooms]);
    else {
      picks.push(
        ["Modular Kitchen", 1],
        ["Wardrobe", bedrooms],
        ["Bed with Storage", bedrooms],
        ["TV Unit", 1],
        ["Sofa (3-seater)", 1],
        ["Shoe & Utility Cabinet", 1],
      );
      if (bedrooms >= 2) picks.push(["Dining Set (6-seater)", 1]);
    }
  } else if (state.property_type === "office") {
    const seats = Math.max(4, Math.round(area / 80));
    picks.push(
      ["Office Workstation", seats],
      ["Office Storage Cabinet", Math.ceil(seats / 8)],
      ["Reception Desk", 1],
      ["Pantry Unit", 1],
      ["Conference Table (8-seater)", 1],
    );
    if (state.preset_id === "corporate") picks.push(["Manager Cabin Set", 2]);
  } else if (state.preset_id === "cafe") {
    picks.push(["Service Counter", 1], ["Café Seating Set", Math.max(4, Math.round(area / 80))]);
  } else {
    picks.push(["Display Shelving", Math.max(2, Math.round(area / 150))], ["Service Counter", 1]);
  }

  const allowed = visibleFurniture(catalog, state);
  const result: Record<string, number> = {};
  for (const [name, quantity] of picks) {
    const item = allowed.find((i) => i.name === name);
    if (item && !furnitureBlocker(item, state)) result[item.id] = quantity;
  }
  return result;
}
