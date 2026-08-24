/** Date helpers for the public site. Stop dates are stored as ISO midnight UTC; show the calendar day. */

const DAY_MS = 86400000;

export function dayOf(iso: string): Date {
  return new Date(iso.slice(0, 10) + "T12:00:00Z");
}

export function fmtDay(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  return dayOf(iso).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}

/** "Mar 14–29, 2022" / "Dec 30, 2020 – Feb 6, 2021" */
export function fmtRange(arrival: string, departure: string): string {
  const a = dayOf(arrival);
  const d = dayOf(departure);
  const sameYear = a.getUTCFullYear() === d.getUTCFullYear();
  const sameMonth = sameYear && a.getUTCMonth() === d.getUTCMonth();
  if (a.getTime() === d.getTime()) return fmtDay(arrival);
  if (sameMonth) return `${fmtDay(arrival, { month: "short", day: "numeric" })}–${d.getUTCDate()}, ${d.getUTCFullYear()}`;
  if (sameYear) return `${fmtDay(arrival, { month: "short", day: "numeric" })} – ${fmtDay(departure)}`;
  return `${fmtDay(arrival)} – ${fmtDay(departure)}`;
}

/** "December 2020" or "December 2020 – February 2021" */
export function fmtMonthRange(arrival: string, departure: string): string {
  const a = fmtDay(arrival, { month: "long", year: "numeric" });
  const d = fmtDay(departure, { month: "long", year: "numeric" });
  return a === d ? a : `${a} – ${d}`;
}

export function nights(arrival: string, departure: string): number {
  return Math.max(0, Math.round((dayOf(departure).getTime() - dayOf(arrival).getTime()) / DAY_MS));
}

export function fmtNights(arrival: string, departure: string): string {
  const n = nights(arrival, departure);
  return n === 0 ? "day visit" : n === 1 ? "1 night" : `${n} nights`;
}

import { RV_TRIP_START, RV_TRIP_END } from "@/lib/vehicles";

/** Was this stop part of the years living in the RV, or a trip from home? */
export function isRvEra(arrivalIso: string): boolean {
  const d = arrivalIso.slice(0, 10);
  return d >= RV_TRIP_START && d <= RV_TRIP_END;
}

export function yearOf(iso: string): number {
  return dayOf(iso).getUTCFullYear();
}

/** Post timestamps are real instants; show in US Eastern-ish local via the viewer's zone. */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
