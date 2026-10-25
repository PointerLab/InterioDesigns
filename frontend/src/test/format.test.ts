import { describe, expect, it } from "vitest";
import { formatINR, formatINRShort, formatTime, parseLocalDate, toISODate } from "@/lib/format";

describe("format", () => {
  it("formats rupees with Indian digit grouping", () => {
    expect(formatINR(1234567)).toBe("₹12,34,567");
    expect(formatINR(0)).toBe("₹0");
  });

  it("shortens large amounts to lakh and crore", () => {
    expect(formatINRShort(450000)).toBe("₹4.5 L");
    expect(formatINRShort(1500000)).toBe("₹15 L");
    expect(formatINRShort(12000000)).toBe("₹1.2 Cr");
    expect(formatINRShort(90000)).toBe("₹90k");
  });

  it("formats 24h slot times", () => {
    expect(formatTime("10:00")).toBe("10:00 am");
    expect(formatTime("12:00")).toBe("12:00 pm");
    expect(formatTime("17:00")).toBe("5:00 pm");
  });

  it("round-trips local dates without timezone drift", () => {
    expect(toISODate(parseLocalDate("2026-10-03"))).toBe("2026-10-03");
  });
});
