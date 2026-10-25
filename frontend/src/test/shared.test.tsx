import { screen } from "@testing-library/react";
import { Route } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatINR } from "@/lib/format";
import type { SharedEstimate } from "@/lib/types";
import SharedEstimatePage from "@/pages/SharedEstimate";
import { previewResult } from "./fixtures";
import { mockApi, renderRoutes } from "./render";

const shared: SharedEstimate = {
  reference: "EST-00012",
  title: "2 BHK in Pune",
  property_type: "residential",
  property_type_label: "Residential",
  property_subtype: "2 BHK",
  project_type: "new",
  project_type_label: "New Interior",
  scope: "full",
  scope_label: "Full interior",
  area_sqft: 800,
  room_count: 4,
  package_tier: "standard",
  package_title: "Standard Package",
  city: "Pune",
  result: previewResult,
  total: previewResult.total,
  created_at: "2026-10-20T10:00:00Z",
  updated_at: "2026-10-21T10:00:00Z",
};

const renderShared = () =>
  renderRoutes(<Route path="/shared/:token" element={<SharedEstimatePage />} />, "/shared/abc123");

describe("shared estimate page", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the shared estimate and its breakdown", async () => {
    mockApi({ "GET /api/shared/abc123/": { body: shared } });
    renderShared();
    expect(await screen.findByRole("heading", { name: "2 BHK in Pune" })).toBeInTheDocument();
    expect(screen.getByText("Shared estimate · EST-00012")).toBeInTheDocument();
    expect(screen.getAllByText(formatINR(previewResult.total)).length).toBeGreaterThan(0);
  });

  it("explains when the link has been turned off", async () => {
    mockApi({ "GET /api/shared/abc123/": { status: 404, body: { detail: "Not found." } } });
    renderShared();
    expect(await screen.findByText("This link isn't shared any more")).toBeInTheDocument();
  });
});
