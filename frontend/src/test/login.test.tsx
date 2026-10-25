import { fireEvent, screen } from "@testing-library/react";
import { Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "@/pages/auth/Login";
import { mockApi, renderRoutes } from "./render";

const user = {
  id: 1,
  email: "asha@example.com",
  name: "Asha Rao",
  phone: "",
  city: "",
  is_staff: false,
  date_joined: "2026-09-27T10:00:00Z",
};

function renderLogin() {
  renderRoutes(
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<p>Customer dashboard</p>} />
      <Route path="/staff" element={<p>Staff panel</p>} />
    </>,
    "/login",
  );
}

function submit(email = "asha@example.com", password = "Secret!2026") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("login page", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("shows the server message for a wrong password", async () => {
    mockApi({ "POST /api/auth/login/": { status: 401, body: { detail: "Incorrect email or password." } } });
    renderLogin();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(localStorage.getItem("interio.tokens")).toBeNull();
  });

  it("shows field errors next to the field", async () => {
    mockApi({ "POST /api/auth/login/": { status: 400, body: { email: ["Enter a valid email address."] } } });
    renderLogin();
    submit("not-an-email");
    expect(await screen.findByText("Enter a valid email address.")).toHaveAttribute("id", "email-error");
  });

  it("signs a customer in and opens the dashboard", async () => {
    const fetchMock = mockApi({
      "POST /api/auth/login/": { body: { access: "access-token", refresh: "refresh-token", user } },
    });
    renderLogin();
    submit();
    expect(await screen.findByText("Customer dashboard")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("interio.tokens")!)).toEqual({
      access: "access-token",
      refresh: "refresh-token",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      email: "asha@example.com",
      password: "Secret!2026",
    });
  });

  it("sends staff to the staff panel", async () => {
    mockApi({
      "POST /api/auth/login/": { body: { access: "a", refresh: "r", user: { ...user, is_staff: true } } },
    });
    renderLogin();
    submit();
    expect(await screen.findByText("Staff panel")).toBeInTheDocument();
  });
});
