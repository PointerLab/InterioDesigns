const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-IN");
const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const weekdayDate = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

export function formatINR(value: number): string {
  return inr.format(Math.round(value || 0));
}

/** ₹4.5 L, ₹1.2 Cr — used where space is tight. */
export function formatINRShort(value: number): string {
  const amount = Math.round(value || 0);
  const trim = (n: number) => n.toFixed(n >= 10 ? 0 : 1).replace(/\.0$/, "");
  if (amount >= 1_00_00_000) return `₹${trim(amount / 1_00_00_000)} Cr`;
  if (amount >= 1_00_000) return `₹${trim(amount / 1_00_000)} L`;
  if (amount >= 1_000) return `₹${trim(amount / 1_000)}k`;
  return formatINR(amount);
}

export function formatNumber(value: number): string {
  return number.format(value);
}

/** Parse "2026-10-03" as a local date (not UTC midnight). */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(value: string): string {
  return date.format(value.length === 10 ? parseLocalDate(value) : new Date(value));
}

export function formatWeekdayDate(value: string): string {
  return weekdayDate.format(parseLocalDate(value));
}

export function formatTime(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function toISODate(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function titleCase(value: string): string {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
