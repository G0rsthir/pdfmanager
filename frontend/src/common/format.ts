import {
  getLocalTimeZone,
  today,
  type DateValue,
} from "@internationalized/date";

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export function formatBytes(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  if (value < 1024) return `${value} B`;

  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < BYTE_UNITS.length - 1) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(size < 10 ? 1 : 0)} ${BYTE_UNITS[unit]}`;
}

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const DATE_ONLY = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return DATE_TIME.format(date);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return DATE_ONLY.format(date);
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
  { unit: "second", ms: 1000 },
];

export function formatRelativeTime(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  for (const { unit, ms } of UNITS) {
    if (absMs >= ms || unit === "second") {
      return RELATIVE_TIME.format(Math.round(diffMs / ms), unit);
    }
  }
  return null;
}

const t = today(getLocalTimeZone());

export const expiryDatePresets: { label: string; value: DateValue[] }[] = [
  { label: "Tomorrow", value: [t.add({ days: 1 })] },
  { label: "Next week", value: [t.add({ weeks: 1 })] },
  { label: "Next month", value: [t.add({ months: 1 })] },
  { label: "In 6 months", value: [t.add({ months: 6 })] },
  { label: "Next year", value: [t.add({ years: 1 })] },
  { label: "In 2 years", value: [t.add({ years: 2 })] },
  { label: "In 3 years", value: [t.add({ years: 3 })] },
];
