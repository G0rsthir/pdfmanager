import { useEffect, useState } from "react";
import type {
  NormalizedRect,
  OutlineItem,
  OutlineRawItem,
  SelectionPopoverState,
} from "./types";

/**
 * Walk up to PDF.js's per-page wrapper.
 * The text layer lives inside .page[data-page-number].
 */
function findPage(
  node: Node | null,
): { number: number; el: HTMLElement } | null {
  while (node) {
    if (node instanceof HTMLElement && node.dataset.pageNumber) {
      const n = parseInt(node.dataset.pageNumber, 10);
      return Number.isNaN(n) ? null : { number: n, el: node };
    }
    node = node.parentNode;
  }
  return null;
}

export function useSelectionPopover(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const [popover, setPopover] = useState<SelectionPopoverState | null>(null);
  const dismiss = () => setPopover(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setPopover(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) {
        setPopover(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text) {
        setPopover(null);
        return;
      }

      // Reject multi-page selections
      if (sel.rangeCount > 1) {
        setPopover(null);
        return;
      }

      const page = findPage(range.startContainer);
      if (page == null) {
        setPopover(null);
        return;
      }

      const pageRect = page.el.getBoundingClientRect();
      const lineRects = Array.from(range.getClientRects());

      const rects: NormalizedRect[] = lineRects.map((cr) => ({
        top: (cr.top - pageRect.top) / pageRect.height,
        left: (cr.left - pageRect.left) / pageRect.width,
        width: cr.width / pageRect.width,
        height: cr.height / pageRect.height,
      }));

      const lastRect =
        lineRects[lineRects.length - 1] ?? range.getBoundingClientRect();
      const containerRect = root.getBoundingClientRect();

      // Anchor to the END of the last line of the selection
      const anchor = {
        x: lastRect.right - containerRect.left + root.scrollLeft,
        y: lastRect.bottom - containerRect.top + root.scrollTop,
      };

      setPopover({ anchor: anchor, text, page: page.number, rects });
    };

    const selectionCleanup = () => {
      if (window.getSelection()?.toString().trim() == "" && popover != null)
        setPopover(null);
    };

    document.addEventListener("mouseup", handler);
    document.addEventListener("keyup", handler);
    document.addEventListener("selectionchange", selectionCleanup);

    return () => {
      document.removeEventListener("mouseup", handler);
      document.removeEventListener("keyup", handler);
      document.removeEventListener("selectionchange", selectionCleanup);
    };
  }, [containerRef, popover]);

  return [popover, dismiss] as const;
}

export function normalizeOutline(
  nodes: OutlineRawItem[] | null,
): OutlineItem[] {
  if (!nodes) return [];
  return nodes.map((n) => ({
    id: crypto.randomUUID(),
    title: n.title ?? "",
    bold: n.bold,
    italic: n.italic,
    dest: n.dest ?? null,
    url: n.url ?? null,
    children: normalizeOutline(n.items),
  }));
}
