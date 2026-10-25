import { describe, expect, it } from "vitest";
import { freshState, recommendedFurniture, toPayload } from "@/components/estimate/wizard";
import type { Catalog } from "@/lib/types";

const catalog: Catalog = {
  packages: [
    {
      id: 1,
      tier: "basic",
      title: "Basic Package",
      tagline: "",
      description: "",
      rate_per_sqft: 450,
      furniture_multiplier: 1,
      inclusions: [],
      base_timeline_weeks: 4,
      warranty_years: 1,
    },
    {
      id: 2,
      tier: "standard",
      title: "Standard Package",
      tagline: "",
      description: "",
      rate_per_sqft: 750,
      furniture_multiplier: 1.35,
      inclusions: [],
      base_timeline_weeks: 6,
      warranty_years: 5,
    },
  ],
  furniture_items: [
    {
      id: 10,
      name: "Modular Kitchen",
      category: "kitchen",
      description: "",
      price_type: "unit",
      unit_price: 160000,
      compatible_packages: [],
      property_types: ["residential"],
      is_ready_made: false,
    },
    {
      id: 11,
      name: "Wardrobe",
      category: "wardrobe",
      description: "",
      price_type: "unit",
      unit_price: 55000,
      compatible_packages: [],
      property_types: ["residential"],
      is_ready_made: false,
    },
    {
      id: 12,
      name: "Walk-in Wardrobe",
      category: "wardrobe",
      description: "",
      price_type: "unit",
      unit_price: 145000,
      compatible_packages: ["standard", "premium"],
      property_types: ["residential"],
      is_ready_made: false,
    },
    {
      id: 13,
      name: "Office Workstation",
      category: "workspace",
      description: "",
      price_type: "unit",
      unit_price: 18000,
      compatible_packages: [],
      property_types: ["office"],
      is_ready_made: false,
    },
  ],
  services: [
    {
      id: 20,
      name: "Flooring replacement",
      description: "",
      category: "civil",
      price_type: "sqft",
      unit_price: 180,
      enabled_for_project_types: ["renovation"],
    },
  ],
  cities: [{ id: 1, city: "Pune", multiplier: 1.05 }],
  space_presets: {
    residential: [{ id: "2bhk", label: "2 BHK", area: 800, rooms: 4 }],
    commercial: [{ id: "shop", label: "Shop", area: 400, rooms: 1 }],
    office: [{ id: "startup", label: "Startup office", area: 1200, rooms: 4 }],
  },
  scope_presets: { full: "Full interior", kitchen: "Kitchen only", wardrobe: "Wardrobes only" },
};

describe("estimate wizard", () => {
  it("starts from entry-point URL params", () => {
    const state = freshState(catalog, new URLSearchParams("scope=kitchen&package=basic"));
    expect(state.scope).toBe("kitchen");
    expect(state.area).toBe("120");
    expect(state.package_tier).toBe("basic");
  });

  it("rejects an invalid area", () => {
    const state = { ...freshState(catalog, new URLSearchParams()), area: "20" };
    expect(toPayload(catalog, state)).toBeNull();
  });

  it("drops furniture that the package, property type or scope doesn't allow", () => {
    const state = {
      ...freshState(catalog, new URLSearchParams("package=basic")),
      furniture: { "10": 1, "12": 1, "13": 5 },
      services: { "20": 1 },
    };
    const payload = toPayload(catalog, state)!;
    expect(payload.furniture).toEqual([{ id: 10, quantity: 1 }]);
    // Flooring is renovation-only; this is a new interior.
    expect(payload.services).toEqual([]);
  });

  it("recommends a starting set for a 2 BHK", () => {
    const state = freshState(catalog, new URLSearchParams());
    expect(recommendedFurniture(catalog, state)).toEqual({ "10": 1, "11": 2 });
  });
});
