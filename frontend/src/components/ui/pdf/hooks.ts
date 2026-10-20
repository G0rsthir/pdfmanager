import { useCallback, useEffect, useState } from "react";
import { anchorFromRects, getPageElement } from "./geometry";
import type {
  NormalizedRect,
  OutlineItem,
  OutlineRawItem,
  PopoverAnchor,
} from "./types";

export function useFullscreen(elementRef: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(
    () => document.fullscreenElement != null,
  );

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement != null);

    document.addEventListener("fullscreenchange", sync);

    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await elementRef.current?.requestFullscreen();
      }
    } catch {
      // Denied by the browser
    }
  }, [elementRef]);

  return { isFullscreen, toggleFullscreen };
}

/**
 * Where to place a popover for anything anchored on a page
 */
export function useSelectionAnchor(options: {
  containerRef: React.RefObject<HTMLElement | null>;
  viewerRef: React.RefObject<HTMLElement | null>;
  selection: { page: number; rects: NormalizedRect[] } | null;
  rotation: number;
  revision: string;
}) {
  const { containerRef, viewerRef, selection, rotation, revision } = options;
  const [anchor, setAnchor] = useState<PopoverAnchor | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const viewer = viewerRef.current;

    if (!container || !viewer || !selection) {
      setAnchor(null);
      return;
    }

    const pageEl = getPageElement(viewer, selection.page);

    if (!pageEl) {
      setAnchor(null);
      return;
    }

    setTimeout(() =>
      setAnchor(anchorFromRects(container, pageEl, selection.rects, rotation)),
    );
  }, [containerRef, viewerRef, selection, rotation, revision]);

  return anchor;
}

/**
 * Rendered size of an element in CSS px, tracked across zoom and rotation
 */
export function useElementSize(element: HTMLElement | null) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize((prev) =>
        prev.width === box.width && prev.height === box.height
          ? prev
          : { width: box.width, height: box.height },
      );
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return size;
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
