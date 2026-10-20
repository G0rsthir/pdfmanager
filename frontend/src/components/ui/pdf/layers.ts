import type { EventBus } from "pdfjs-dist/web/pdf_viewer.mjs";
import { useEffect, useRef, useState } from "react";
import { getPageElement, PAGE_SELECTOR } from "./geometry";

export const LAYER_ROOT_CLASS = "custom-layer-root";

type PageRoots = Record<number, HTMLElement>;

/**
 * per page layers, reattached when PDF.js rerenders a page
 */
export function useViewerLayers(options: {
  viewerRef: React.RefObject<HTMLElement | null>;
  eventBus: EventBus | null;
}): PageRoots {
  const { viewerRef, eventBus } = options;

  const rootsRef = useRef<PageRoots>({});
  const [roots, setRoots] = useState<PageRoots>({});

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !eventBus) return;

    const attach = (pageNumber: number) => {
      const pageEl = getPageElement(viewer, pageNumber);

      if (!pageEl) return;

      let root = rootsRef.current?.[pageNumber];
      if (!root) {
        root = document.createElement("div");
        root.className = LAYER_ROOT_CLASS;
      }

      if (root.parentElement !== pageEl) pageEl.appendChild(root);

      return root;
    };

    const publish = (pageNumber: number, root: HTMLElement) => {
      const prev = rootsRef.current;

      const next: PageRoots = {};
      for (const [key, el] of Object.entries(prev)) {
        if (el.isConnected) next[Number(key)] = el;
      }
      next[pageNumber] = root;

      const keys = Object.keys(next);
      if (
        keys.length == Object.keys(prev).length &&
        keys.every((key) => prev[Number(key)] === next[Number(key)])
      ) {
        return;
      }

      rootsRef.current = next;
      setRoots(next);
    };

    const handlePageRendered = (e: { pageNumber: number }) => {
      const root = attach(e.pageNumber);
      if (!root) return;
      publish(e.pageNumber, root);
    };

    const handlePagesDestroy = () => {
      rootsRef.current = {};
      setRoots({});
    };

    // Pages already on screen when this hook mounts
    setTimeout(() => {
      viewer.querySelectorAll<HTMLElement>(PAGE_SELECTOR).forEach((pageEl) => {
        const pageNumber = parseInt(pageEl.dataset.pageNumber!, 10);
        if (Number.isNaN(pageNumber)) return;
        const root = attach(pageNumber);
        if (root) publish(pageNumber, root);
      });
    });

    eventBus.on("pagerendered", handlePageRendered);
    eventBus.on("textlayerrendered", handlePageRendered);
    eventBus.on("pagesdestroy", handlePagesDestroy);

    return () => {
      eventBus.off("pagerendered", handlePageRendered);
      eventBus.off("textlayerrendered", handlePageRendered);
      eventBus.off("pagesdestroy", handlePagesDestroy);
    };
  }, [viewerRef, eventBus]);

  return roots;
}
