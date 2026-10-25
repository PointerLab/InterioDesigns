import { describe, expect, it } from "vitest";
import { freshState, recommendedFurniture, toPayload } from "@/components/estimate/wizard";
import { catalog } from "./fixtures";

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
