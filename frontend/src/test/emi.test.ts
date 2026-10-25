import { describe, expect, it } from "vitest";
import { monthlyEmi } from "@/lib/emi";

describe("monthlyEmi", () => {
  it("uses the standard reducing-balance formula", () => {
    expect(monthlyEmi(100000, 12, 12)).toBeCloseTo(8884.88, 2);
  });

  it("splits evenly at zero interest and handles empty loans", () => {
    expect(monthlyEmi(120000, 0, 12)).toBe(10000);
    expect(monthlyEmi(0, 11, 36)).toBe(0);
  });
});
