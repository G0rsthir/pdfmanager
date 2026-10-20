import type {
  NormalizedRect,
  PageElement,
  PagePoint,
  PopoverAnchor,
  TextSelection,
} from "./types";

export const PAGE_SELECTOR = ".page[data-page-number]";

export function findPageElement(node: Node | null): PageElement | null {
  const start = node instanceof Element ? node : (node?.parentElement ?? null);
  const el = start?.closest<HTMLElement>(PAGE_SELECTOR);
  if (!el) return null;

  const number = parseInt(el.dataset.pageNumber!, 10);
  return Number.isNaN(number) ? null : { number, el };
}

export function getPageElement(
  viewer: HTMLElement,
  pageNumber: number,
): HTMLElement | null {
  return viewer.querySelector<HTMLElement>(
    `.page[data-page-number="${pageNumber}"]`,
  );
}

function normalizeRotation(rotation: number): 0 | 90 | 180 | 270 {
  const value = (((rotation % 360) + 360) % 360) as 0 | 90 | 180 | 270;
  return value == 90 || value == 180 || value == 270 ? value : 0;
}

/**
 * Keeps values inside the 0..1
 */
function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampRect(rect: NormalizedRect): NormalizedRect {
  const left = clamp(rect.left);
  const top = clamp(rect.top);
  return {
    left,
    top,
    width: clamp(Math.min(rect.width, 1 - left)),
    height: clamp(Math.min(rect.height, 1 - top)),
  };
}

export function toUnrotated(
  rect: NormalizedRect,
  rotation: number,
): NormalizedRect {
  switch (normalizeRotation(rotation)) {
    case 90:
      return clampRect({
        left: rect.top,
        top: 1 - rect.left - rect.width,
        width: rect.height,
        height: rect.width,
      });
    case 180:
      return clampRect({
        left: 1 - rect.left - rect.width,
        top: 1 - rect.top - rect.height,
        width: rect.width,
        height: rect.height,
      });
    case 270:
      return clampRect({
        left: 1 - rect.top - rect.height,
        top: rect.left,
        width: rect.height,
        height: rect.width,
      });
    default:
      return clampRect(rect);
  }
}

export function toRendered(
  rect: NormalizedRect,
  rotation: number,
): NormalizedRect {
  switch (normalizeRotation(rotation)) {
    case 90:
      return {
        left: 1 - rect.top - rect.height,
        top: rect.left,
        width: rect.height,
        height: rect.width,
      };
    case 180:
      return {
        left: 1 - rect.left - rect.width,
        top: 1 - rect.top - rect.height,
        width: rect.width,
        height: rect.height,
      };
    case 270:
      return {
        left: rect.top,
        top: 1 - rect.left - rect.width,
        width: rect.height,
        height: rect.width,
      };
    default:
      return rect;
  }
}

export function toRenderedRects(
  rects: NormalizedRect[],
  rotation: number,
): NormalizedRect[] {
  return normalizeRotation(rotation) == 0
    ? rects
    : rects.map((rect) => toRendered(rect, rotation));
}

export function toRenderedPoint(point: PagePoint, rotation: number): PagePoint {
  switch (normalizeRotation(rotation)) {
    case 90:
      return { x: 1 - point.y, y: point.x };
    case 180:
      return { x: 1 - point.x, y: 1 - point.y };
    case 270:
      return { x: point.y, y: 1 - point.x };
    default:
      return point;
  }
}

/**
 * Pointer position in stored space
 */
export function toPagePoint(
  pageEl: HTMLElement,
  clientX: number,
  clientY: number,
  rotation: number,
): PagePoint {
  const box = pageEl.getBoundingClientRect();
  const x = (clientX - box.left) / box.width;
  const y = (clientY - box.top) / box.height;

  switch (normalizeRotation(rotation)) {
    case 90:
      return { x: y, y: 1 - x };
    case 180:
      return { x: 1 - x, y: 1 - y };
    case 270:
      return { x: 1 - y, y: x };
    default:
      return { x, y };
  }
}

function isEmptyRect(rect: NormalizedRect): boolean {
  return rect.width <= 0 || rect.height <= 0;
}

/**
 * DOM rects -> stored rects
 */
export function toPageRects(
  rects: Iterable<DOMRect>,
  pageEl: HTMLElement,
  rotation: number,
): NormalizedRect[] {
  const box = pageEl.getBoundingClientRect();

  return Array.from(rects, (r) => ({
    top: (r.top - box.top) / box.height,
    left: (r.left - box.left) / box.width,
    width: r.width / box.width,
    height: r.height / box.height,
  }))
    .filter((rect) => !isEmptyRect(rect))
    .map((rect) => toUnrotated(rect, rotation))
    .filter((rect) => !isEmptyRect(rect));
}

export function boundingRect(rects: NormalizedRect[]): NormalizedRect | null {
  if (rects.length == 0) return null;

  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  const bottom = Math.max(...rects.map((r) => r.top + r.height));
  const right = Math.max(...rects.map((r) => r.left + r.width));

  return { top, left, width: right - left, height: bottom - top };
}

export function anchorFromRects(
  container: HTMLElement,
  pageEl: HTMLElement,
  rects: NormalizedRect[],
  rotation: number,
): PopoverAnchor | null {
  const last = toRenderedRects(rects, rotation).at(-1);
  if (!last) return null;

  const pageBox = pageEl.getBoundingClientRect();
  const containerBox = container.getBoundingClientRect();

  const pageLeft = pageBox.left - containerBox.left + container.scrollLeft;
  const pageTop = pageBox.top - containerBox.top + container.scrollTop;

  return {
    x: pageLeft + (last.left + last.width) * pageBox.width,
    y: pageTop + (last.top + last.height) * pageBox.height,
  };
}

export function rectContains(
  rect: NormalizedRect,
  point: PagePoint,
  slop: number,
): boolean {
  return (
    point.x >= rect.left - slop &&
    point.x <= rect.left + rect.width + slop &&
    point.y >= rect.top - slop &&
    point.y <= rect.top + rect.height + slop
  );
}

export function rectsArea(rects: NormalizedRect[]): number {
  return rects.reduce((total, r) => total + r.width * r.height, 0);
}

/**
 * Shortest distance from a point to the segment a-b, in page space
 */
export function distanceToSegment(
  point: PagePoint,
  a: PagePoint,
  b: PagePoint,
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared == 0) return Math.hypot(point.x - a.x, point.y - a.y);

  const t = Math.min(
    1,
    Math.max(0, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared),
  );

  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function rectFromPoints(a: PagePoint, b: PagePoint): NormalizedRect {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

export function pointInClientRects(
  rects: DOMRect[],
  clientX: number,
  clientY: number,
): boolean {
  return rects.some(
    (r) =>
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.bottom,
  );
}

export function currentSelectionClientRects(): DOMRect[] {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount == 0) return [];
  return Array.from(sel.getRangeAt(0).getClientRects());
}

export function readTextSelection(
  container: HTMLElement,
  rotation: number,
): TextSelection | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount == 0) return null;

  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const text = sel.toString().trim();
  if (!text) return null;

  const start = findPageElement(range.startContainer);
  const end = findPageElement(range.endContainer);

  // An annotation belongs to one page, so cross-page selections are dropped
  if (!start || !end || start.number !== end.number) return null;

  return {
    kind: "text",
    page: start.number,
    text,
    rects: toPageRects(range.getClientRects(), start.el, rotation),
  };
}
