import msgIcon from "@/assets/media/msg.svg?raw";
import { parseColor } from "@chakra-ui/react";
import type { AnnotationItem } from "./types";

const ANNOTATION_OVERLAY_CLASS = "custom-annotation-overlay";

function createMarker(
  annotation: AnnotationItem,
  onOpen: (annotation: AnnotationItem) => void = () => {},
) {
  const r = annotation.rects[0];
  if (!r) return;
  const marker = document.createElement("button");
  marker.type = "button";
  marker.title = annotation.body;
  marker.setAttribute("aria-label", `Open annotation: ${annotation.body}`);

  Object.assign(marker.style, {
    position: "absolute",
    top: `${r.top * 100}%`,
    left: `calc(100% - 4rem)`,
    transform: "translateY(-2px)",
    pointerEvents: "auto",
    cursor: "pointer",
    border: "unset",
  });

  marker.innerHTML = msgIcon;

  const svg = marker.querySelector("svg");
  if (svg) {
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.style.color = "var(--chakra-colors-purple-solid, #805ad5)";
  }

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

    Object.assign(div.style, {
      position: "absolute",
      top: `${r.top * 100}%`,
      left: `${r.left * 100}%`,
      width: `${r.width * 100}%`,
      height: `${r.height * 100}%`,
      background: color,
      mixBlendMode: "multiply",
    });

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
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2",
  });

  for (const a of items) {
    renderAnnotation(a, overlay, onOpen);
  }
  pageEl.appendChild(overlay);
};
