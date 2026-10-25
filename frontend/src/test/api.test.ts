import { describe, expect, it } from "vitest";
import { toApiError } from "@/lib/api";

describe("toApiError", () => {
  it("uses detail as the message", () => {
    const error = toApiError(401, { detail: "Incorrect email or password." });
    expect(error.message).toBe("Incorrect email or password.");
    expect(error.status).toBe(401);
  });

  it("collects field errors and uses the first as the message", () => {
    const error = toApiError(400, { email: ["An account with this email already exists."], password: ["Too short."] });
    expect(error.fieldErrors).toEqual({ email: "An account with this email already exists.", password: "Too short." });
    expect(error.message).toBe("An account with this email already exists.");
  });

  it("flattens nested errors", () => {
    const error = toApiError(400, {
      furniture: [{}, { quantity: ["Ensure this value is greater than or equal to 1."] }],
    });
    expect(error.fieldErrors.furniture).toBe("Ensure this value is greater than or equal to 1.");
  });

  it("falls back to a friendly message", () => {
    expect(toApiError(500, null).message).toMatch(/something went wrong/i);
    expect(toApiError(429, null).message).toMatch(/too many/i);
  });
});
