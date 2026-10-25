import { fireEvent, screen } from "@testing-library/react";
import { Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DRAFT_KEY } from "@/components/estimate/wizard";
import { formatINR } from "@/lib/format";
import Estimate from "@/pages/Estimate";
import { catalog, previewResult } from "./fixtures";
import { mockApi, renderRoutes } from "./render";

function renderEstimate(path = "/estimate") {
  renderRoutes(
    <>
      <Route path="/estimate" element={<Estimate />} />
      <Route path="/login" element={<p>Login page</p>} />
    </>,
    path,
  );
}

// The desktop and mobile navigation are both in the DOM; use the first.
const continueButton = () => screen.getAllByRole("button", { name: /continue/i })[0];

describe("estimate wizard page", () => {
  let fetchMock: ReturnType<typeof mockApi>;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    fetchMock = mockApi({
      "GET /api/catalog/": { body: catalog },
      "POST /api/estimates/preview/": { body: previewResult },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loads prices and shows a live total", async () => {
    renderEstimate();
    expect(await screen.findByText("What are we designing?")).toBeInTheDocument();
    expect((await screen.findAllByText(formatINR(previewResult.total))).length).toBeGreaterThan(0);

    const previewCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/estimates/preview/"));
    expect(JSON.parse(String(previewCall?.[1]?.body))).toMatchObject({
      property_type: "residential",
      property_subtype: "2 BHK",
      area_sqft: 800,
      package_tier: "standard",
    });
  });

  it("switches the size presets when an office is chosen", async () => {
    renderEstimate();
    fireEvent.click(await screen.findByRole("radio", { name: /^Office/ }));
    expect(screen.getByRole("radio", { name: /^Startup office/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("radio", { name: /^2 BHK/ })).not.toBeInTheDocument();

    fireEvent.click(continueButton());
    expect(await screen.findByText("How big is the space?")).toBeInTheDocument();
    expect(screen.getByLabelText("Carpet area (sq.ft)")).toHaveValue(1200);
  });

  it("starts a kitchen-only estimate from an entry link", async () => {
    renderEstimate("/estimate?scope=kitchen");
    await screen.findByText("What are we designing?");
    fireEvent.click(continueButton());
    expect(await screen.findByRole("radio", { name: /^Kitchen only/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Carpet area (sq.ft)")).toHaveValue(120);
  });

  it("keeps the answers and asks a visitor to sign in to save", async () => {
    renderEstimate();
    await screen.findByText("What are we designing?");
    fireEvent.click(screen.getByRole("button", { name: /Review/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in to save" })[0]);

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY)!);
    expect(draft).toMatchObject({ step: 5, property_type: "residential", package_tier: "standard" });
  });
});
