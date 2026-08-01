import { parseColor } from "@chakra-ui/react";
import type { AnnotationItem } from "./types";

const ANNOTATION_OVERLAY_CLASS = "custom-annotation-overlay";
const ANNOTATION_MARKER_CLASS = "custom-annotation-marker";
const ANNOTATION_HIGHLIGHT_CLASS = "custom-annotation-highlight";

function createMarker(
  annotation: AnnotationItem,
  onOpen: (annotation: AnnotationItem) => void = () => {},
) {
  const first = annotation.rects[0];
  if (!first) return;
  const last = annotation.rects.at(-1) ?? first;

  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = ANNOTATION_MARKER_CLASS;
  marker.title = annotation.body;
  marker.setAttribute("aria-label", `Open annotation: ${annotation.body}`);

  marker.style.top = `${first.top * 100}%`;
  marker.style.height = `${(last.top + last.height - first.top) * 100}%`;
  marker.style.background = annotation.color;

  marker.onclick = (e) => {
    e.stopPropagation();
    onOpen(annotation);
  };

  return marker;
}

export function renderAnnotation(
  annotation: AnnotationItem,
  overlay: HTMLElement,
  onOpen: (annotation: AnnotationItem) => void,
) {
  const marker = createMarker(annotation, onOpen);
  if (marker) {
    overlay.appendChild(marker);
  }

  const color = parseColor(annotation.color)
    .withChannelValue("alpha", 0.3)
    .toString("rgba");

  for (const r of annotation.rects) {
    const div = document.createElement("div");
    div.className = ANNOTATION_HIGHLIGHT_CLASS;

    div.style.top = `${r.top * 100}%`;
    div.style.left = `${r.left * 100}%`;
    div.style.width = `${r.width * 100}%`;
    div.style.height = `${r.height * 100}%`;
    div.style.background = color;

    overlay.appendChild(div);
  }
}

export const renderPageAnnotations = (
  viewer: HTMLDivElement,
  annotations: AnnotationItem[],
  pageNumber: number,
  onOpen: (annotation: AnnotationItem) => void,
) => {
  const pageEl = viewer.querySelector<HTMLElement>(
    `.page[data-page-number="${pageNumber}"]`,
  );
  if (!pageEl) return;
  pageEl.querySelector(`:scope > .${ANNOTATION_OVERLAY_CLASS}`)?.remove();
  const items = annotations.filter((a) => a.page === pageNumber);
  if (items.length === 0) return;

  const overlay = document.createElement("div");
  overlay.className = ANNOTATION_OVERLAY_CLASS;

  for (const a of items) {
    renderAnnotation(a, overlay, onOpen);
  }
  pageEl.appendChild(overlay);
};
