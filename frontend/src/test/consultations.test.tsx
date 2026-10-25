import { fireEvent, screen, within } from "@testing-library/react";
import { Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toISODate } from "@/lib/format";
import type { Consultation } from "@/lib/types";
import Consultations from "@/pages/dashboard/Consultations";
import { mockApi, renderRoutes } from "./render";

const inDays = (days: number) => {
  const day = new Date();
  day.setDate(day.getDate() + days);
  return toISODate(day);
};

const booking: Consultation = {
  id: 7,
  estimate: null,
  estimate_reference: null,
  estimate_title: null,
  date: inDays(3),
  time_slot: "11:00",
  mode: "studio",
  mode_label: "Studio visit",
  address: "",
  notes: "",
  status: "confirmed",
  status_label: "Confirmed",
  staff_note: "",
  created_at: "2026-10-20T10:00:00Z",
};

describe("consultations page", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("moves a booking to a new slot", async () => {
    const fetchMock = mockApi({
      "GET /api/consultations/": { body: [booking] },
      "GET /api/consultations/slots/": {
        body: {
          date: booking.date,
          closed_reason: null,
          slots: [
            { time: "11:00", available: false },
            { time: "15:00", available: true },
          ],
        },
      },
      "POST /api/consultations/7/reschedule/": (init) => ({
        body: { ...booking, ...JSON.parse(String(init.body)), status: "requested", status_label: "Requested" },
      }),
    });
    renderRoutes(<Route path="/dashboard/consultations" element={<Consultations />} />, "/dashboard/consultations");

    fireEvent.click(await screen.findByRole("button", { name: "Reschedule" }));
    const dialog = await screen.findByRole("dialog");
    // The current slot is taken (by this booking), so it can't be picked again.
    expect(await within(dialog).findByRole("button", { name: "11:00 am" })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Move booking" }));
    expect(await within(dialog).findByText("Pick a new time slot.")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "3:00 pm" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Move booking" }));

    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes("/reschedule/"));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ date: booking.date, time_slot: "15:00" });
  });

  it("only offers changes for upcoming bookings", async () => {
    mockApi({ "GET /api/consultations/": { body: [{ ...booking, status: "cancelled", status_label: "Cancelled" }] } });
    renderRoutes(<Route path="/dashboard/consultations" element={<Consultations />} />, "/dashboard/consultations");

    expect(await screen.findByText("Past and cancelled")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reschedule" })).not.toBeInTheDocument();
  });
});
