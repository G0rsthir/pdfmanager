import {
  distanceToSegment,
  rectContains,
  rectFromPoints,
  rectsArea,
} from "./geometry";
import type {
  AnnotationItem,
  AnnotationType,
  NormalizedRect,
  PagePoint,
} from "./types";

export const NOTE_RADIUS = 0.012;

export const ANNOTATION_LABELS: Record<AnnotationType, string> = {
  highlight: "Highlight",
  note: "Note",
  ink: "Drawing",
  shape: "Shape",
};

function isOnAnnotation(
  annotation: AnnotationItem,
  point: PagePoint,
  slop: number,
): boolean {
  const geometry = annotation.geometry;

  switch (geometry.type) {
    case "highlight":
      return annotation.rects.some((rect) => rectContains(rect, point, slop));

    case "note":
      return (
        Math.hypot(point.x - geometry.point.x, point.y - geometry.point.y) <=
        NOTE_RADIUS + slop
      );

    case "ink": {
      const reach = geometry.width / 2 + slop;
      return geometry.paths.some((path) =>
        path.some((from, index) => {
          const to = path[index + 1];
          return to
            ? distanceToSegment(point, from, to) <= reach
            : Math.hypot(point.x - from.x, point.y - from.y) <= reach;
        }),
      );
    }

    case "shape": {
      const { start, end, width, fill } = geometry;
      const box = rectFromPoints(start, end);
      const reach = width / 2 + slop;

      switch (geometry.shape) {
        case "line":
        case "arrow":
          return distanceToSegment(point, start, end) <= reach;

        case "rect":
          if (fill) return rectContains(box, point, slop);
          return (
            rectContains(box, point, reach) && !rectContains(box, point, -reach)
          );

        case "ellipse": {
          const rx = box.width / 2;
          const ry = box.height / 2;
          if (rx == 0 || ry == 0)
            return distanceToSegment(point, start, end) <= reach;

          const cx = box.left + rx;
          const cy = box.top + ry;
          const outer =
            ((point.x - cx) / (rx + reach)) ** 2 +
            ((point.y - cy) / (ry + reach)) ** 2;
          if (outer > 1) return false;
          if (fill) return true;

          const inner =
            ((point.x - cx) / Math.max(rx - reach, 0.0001)) ** 2 +
            ((point.y - cy) / Math.max(ry - reach, 0.0001)) ** 2;
          return inner >= 1;
        }
      }
    }
  }
}

export function noteRects(point: PagePoint, aspect: number): NormalizedRect[] {
  const radiusY = NOTE_RADIUS * aspect;

  return [
    {
      left: Math.max(0, point.x - NOTE_RADIUS),
      top: Math.max(0, point.y - radiusY),
      width: NOTE_RADIUS * 2,
      height: radiusY * 2,
    },
  ];
}

export function hitTestAnnotations(
  items: AnnotationItem[],
  page: number,
  point: PagePoint,
  options: { slop?: number; after?: string | null } = {},
): AnnotationItem | null {
  const { slop = 0, after = null } = options;

  const hits = items
    .filter(
      (item) =>
        item.page == page &&
        item.rects.some((rect) => rectContains(rect, point, slop)) &&
        isOnAnnotation(item, point, slop),
    )
    .sort((a, b) => rectsArea(a.rects) - rectsArea(b.rects));

  if (hits.length == 0) return null;

  const current = after ? hits.findIndex((item) => item.id == after) : -1;
  return hits[(current + 1) % hits.length] ?? null;
}
