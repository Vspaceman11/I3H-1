import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number, locale: string = "de"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

export function severityColor(severity: number): string {
  if (severity >= 8) return "text-red-600 bg-red-100";
  if (severity >= 5) return "text-amber-600 bg-amber-100";
  return "text-emerald-600 bg-emerald-100";
}

export function severityLabel(severity: number): string {
  if (severity >= 8) return "critical";
  if (severity >= 5) return "moderate";
  return "low";
}
