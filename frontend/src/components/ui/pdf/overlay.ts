import msgIcon from "@/assets/media/msg.svg?raw";
import { parseColor } from "@chakra-ui/react";
import type { CommentItem, HighlightItem } from "./types";

const COMMENT_OVERLAY_CLASS = "custom-comment-overlay";
const HIGHLIGHT_OVERLAY_CLASS = "custom-highlight-overlay";

// TODO improve annotations UI.
// Add: control bar (remove comment / highlight, change color)
// Add: label tree / trace

/**
 * Render a single comment's indicators
 */
export function renderComment(
  comment: CommentItem,
  overlay: HTMLElement,
  onOpen: (comment: CommentItem) => void,
) {
  for (const r of comment.rects) {
    const underline = document.createElement("div");
    Object.assign(underline.style, {
      position: "absolute",
      top: `calc(${(r.top + r.height) * 100}% - 2px)`,
      left: `${r.left * 100}%`,
      width: `${r.width * 100}%`,
      height: "0",
      borderBottom: "2px dashed rgb(255, 0, 0)",
      pointerEvents: "none",
    });
    overlay.appendChild(underline);
  }

  const r = comment.rects[0];
  if (!r) return;
  const marker = document.createElement("button");
  marker.type = "button";
  marker.title = comment.body;
  marker.setAttribute("aria-label", `Open comment: ${comment.body}`);

  Object.assign(marker.style, {
    position: "absolute",
    top: `${r.top * 100}%`,
    left: `calc(${(r.left + r.width) * 100}% + 4px)`,
    transform: "translateY(-2px)",
    pointerEvents: "auto",
    cursor: "pointer",
    border: "unset",
  });

  marker.innerHTML = msgIcon;

  const svg = marker.querySelector("svg");
  if (svg) {
    svg.setAttribute("width", "32");
    svg.setAttribute("height", "32");
    svg.style.color = "var(--chakra-colors-purple-solid, #805ad5)";
  }

  marker.onclick = (e) => {
    e.stopPropagation();
    onOpen(comment);
  };
  overlay.appendChild(marker);
}

export const renderPageComments = (
  viewer: HTMLDivElement,
  comments: CommentItem[],
  pageNumber: number,
  onOpen: (comment: CommentItem) => void,
) => {
  const pageEl = viewer.querySelector<HTMLElement>(
    `.page[data-page-number="${pageNumber}"]`,
  );
  if (!pageEl) return;
  pageEl.querySelector(`:scope > .${COMMENT_OVERLAY_CLASS}`)?.remove();
  const items = comments.filter((c) => c.page === pageNumber);
  if (items.length === 0) return;

  const overlay = document.createElement("div");
  overlay.className = COMMENT_OVERLAY_CLASS;
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "3",
  });

  for (const c of items) {
    renderComment(c, overlay, onOpen);
  }
  pageEl.appendChild(overlay);
};

/**
 * Render a single comment's indicators
 */
export function renderHighlight(
  highlight: HighlightItem,
  overlay: HTMLElement,
) {
  const color = parseColor(highlight.color)
    .withChannelValue("alpha", 0.3)
    .toString("rgba");

  for (const r of highlight.rects) {
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

export const renderPageHighlights = (
  viewer: HTMLDivElement,
  highlights: HighlightItem[],
  pageNumber: number,
) => {
  const pageEl = viewer.querySelector<HTMLElement>(
    `.page[data-page-number="${pageNumber}"]`,
  );
  if (!pageEl) return;
  pageEl.querySelector(`:scope > .${HIGHLIGHT_OVERLAY_CLASS}`)?.remove();
  const items = highlights.filter((h) => h.page === pageNumber);
  if (items.length === 0) return;

  const overlay = document.createElement("div");
  overlay.className = HIGHLIGHT_OVERLAY_CLASS;
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2",
  });

  for (const h of items) {
    renderHighlight(h, overlay);
  }
  pageEl.appendChild(overlay);
};
