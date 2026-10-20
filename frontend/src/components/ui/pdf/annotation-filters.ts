import { ANNOTATION_LABELS } from "./annotations";
import { HighlightColors } from "./colors";
import type { AnnotationItem, AnnotationType } from "./types";

export type AnnotationScope = "all" | "page";

export type GroupBy = "page" | "label" | "color" | "type" | "none";

export const GROUP_BY_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "page", label: "Page" },
  { value: "label", label: "Label" },
  { value: "color", label: "Color" },
  { value: "type", label: "Type" },
  { value: "none", label: "No grouping" },
];

export const NO_LABEL = "";

/**
 * Empty value means - any
 */
export interface AnnotationFilters {
  query: string;
  scope: AnnotationScope;
  types: AnnotationType[];
  colors: string[];
  labels: string[];
}

export const EMPTY_FILTERS: AnnotationFilters = {
  query: "",
  scope: "all",
  types: [],
  colors: [],
  labels: [],
};

export function countActiveFilters(filters: AnnotationFilters): number {
  return (
    (filters.scope == "page" ? 1 : 0) +
    filters.types.length +
    filters.colors.length +
    filters.labels.length
  );
}

export function isFiltering(filters: AnnotationFilters): boolean {
  return filters.query.trim() != "" || countActiveFilters(filters) > 0;
}

function matchesQuery(annotation: AnnotationItem, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length == 0) return true;

  const haystack = [
    annotation.excerpt,
    annotation.body,
    annotation.label ?? "",
    annotation.author_name ?? "",
  ]
    .join("\n")
    .toLowerCase();

  return words.every((word) => haystack.includes(word));
}

function includesOrAny<T>(selected: T[], value: T): boolean {
  return selected.length == 0 || selected.includes(value);
}

export function filterAnnotations(
  items: AnnotationItem[],
  filters: AnnotationFilters,
  currentPage: number,
): AnnotationItem[] {
  return items
    .filter(
      (item) =>
        (filters.scope == "all" || item.page == currentPage) &&
        includesOrAny(filters.types, item.geometry.type) &&
        includesOrAny(filters.colors, item.color) &&
        includesOrAny(filters.labels, item.label ?? NO_LABEL) &&
        matchesQuery(item, filters.query),
    )
    .sort(compareByPosition);
}

export function compareByPosition(
  a: AnnotationItem,
  b: AnnotationItem,
): number {
  // Reading order: by page, then top to bottom on the page
  if (a.page != b.page) return a.page - b.page;

  const top = (item: AnnotationItem) =>
    item.rects.length ? Math.min(...item.rects.map((r) => r.top)) : 0;
  return top(a) - top(b) || a.created_at.getTime() - b.created_at.getTime();
}

export interface AnnotationGroup {
  key: string;

  title: string | null;
  color?: string;
  items: AnnotationItem[];
}

interface GroupSpec {
  keyOf: (item: AnnotationItem) => string;
  titleOf: (key: string) => string;
  compare: (a: string, b: string) => number;
}

const TYPE_ORDER = Object.keys(ANNOTATION_LABELS);
const COLOR_ORDER = HighlightColors.map((color) => color.value);

function byKnownOrder(order: string[]) {
  return (a: string, b: string) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia != -1 && ib != -1) return ia - ib;
    if (ia != -1) return -1;
    if (ib != -1) return 1;
    return a.localeCompare(b);
  };
}

const GROUP_SPECS: Record<Exclude<GroupBy, "none">, GroupSpec> = {
  page: {
    keyOf: (item) => String(item.page),
    titleOf: (key) => `Page ${key}`,
    compare: (a, b) => Number(a) - Number(b),
  },
  label: {
    keyOf: (item) => item.label ?? NO_LABEL,
    titleOf: (key) => key || "No label",
    // Unlabeled last
    compare: (a, b) => (!a ? 1 : !b ? -1 : a.localeCompare(b)),
  },
  color: {
    keyOf: (item) => item.color,
    titleOf: capitalize,
    compare: byKnownOrder(COLOR_ORDER),
  },
  type: {
    keyOf: (item) => item.geometry.type,
    titleOf: (key) => ANNOTATION_LABELS[key as AnnotationType] ?? key,
    compare: byKnownOrder(TYPE_ORDER),
  },
};

export function groupAnnotations(
  items: AnnotationItem[],
  groupBy: GroupBy,
): AnnotationGroup[] {
  if (groupBy == "none") return [{ key: "all", title: null, items }];

  const spec = GROUP_SPECS[groupBy];
  const groups = new Map<string, AnnotationItem[]>();

  for (const item of items) {
    const key = spec.keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => spec.compare(a, b))
    .map(([key, groupItems]) => ({
      key,
      title: spec.titleOf(key),
      color: groupBy == "color" ? key : undefined,
      items: groupItems,
    }));
}

export function availableFilterValues(items: AnnotationItem[]) {
  const types = new Set<string>();
  const colors = new Set<string>();
  const labels = new Set<string>();

  for (const item of items) {
    types.add(item.geometry.type);
    colors.add(item.color);
    labels.add(item.label ?? NO_LABEL);
  }

  return {
    types: [...types].sort(byKnownOrder(TYPE_ORDER)) as AnnotationType[],
    colors: [...colors].sort(byKnownOrder(COLOR_ORDER)),
    labels: [...labels].sort(GROUP_SPECS.label.compare),
  };
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
