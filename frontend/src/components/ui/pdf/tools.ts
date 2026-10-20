import { useCallback, useEffect, useRef, useState } from "react";
import { hitTestAnnotations, noteRects } from "./annotations";
import {
  currentSelectionClientRects,
  findPageElement,
  pointInClientRects,
  readTextSelection,
  toPagePoint,
} from "./geometry";
import type {
  AnnotationDraft,
  AnnotationsApi,
  ToolContext,
  ToolId,
  ToolResult,
  ViewerSelection,
  ViewerTool,
} from "./types";

/**
 * Pointer travel that still counts as a click rather than a drag
 */
const CLICK_SLOP_PX = 4;
const HIT_SLOP_PX = 2;

/**
 * Elements that handle their own clicks
 */
const IGNORED_TARGETS =
  ".annotationLayer, .custom-annotation-marker, .custom-context-toolbar, .custom-draft-composer";

const NO_EXTRA_TOOLS: ViewerTool[] = [];

export const selectTool: ViewerTool = {
  id: "select",
  allowTextSelection: true,

  onPointerUp(ctx) {
    if (
      ctx.event.target instanceof Element &&
      ctx.event.target.closest(IGNORED_TARGETS)
    ) {
      return;
    }

    // text select
    const text = readTextSelection(ctx.container, ctx.rotation);
    if (text) {
      ctx.select(text);
      return;
    }

    // A drag that selected nothing is not a pick either
    if (ctx.moved > CLICK_SLOP_PX) return;

    // clicking inside a selection dismisses it
    if (
      pointInClientRects(
        ctx.priorSelectionRects,
        ctx.event.clientX,
        ctx.event.clientY,
      )
    ) {
      ctx.select(null);
      return;
    }

    if (!ctx.page || !ctx.point) {
      ctx.select(null);
      return;
    }

    const pageWidth = ctx.page.el.getBoundingClientRect().width;
    const hit = hitTestAnnotations(
      ctx.annotations.items,
      ctx.page.number,
      ctx.point,
      {
        slop: HIT_SLOP_PX / pageWidth,
        // Clicking the same spot again cycles through overlapping annotations
        after: ctx.selection?.kind == "element" ? ctx.selection.id : null,
      },
    );

    ctx.select(
      hit
        ? { kind: "element", id: hit.id, page: hit.page, rects: hit.rects }
        : null,
    );
  },
};

export const noteTool: ViewerTool = {
  id: "note",
  oneShot: true,
  allowTextSelection: false,
  cursor: "crosshair",

  onPointerUp(ctx) {
    if (ctx.moved > CLICK_SLOP_PX) return;
    if (!ctx.page || !ctx.point) return;

    const box = ctx.page.el.getBoundingClientRect();

    ctx.draft({
      page: ctx.page.number,
      excerpt: "",
      rects: noteRects(ctx.point, box.width / box.height),
      geometry: { type: "note", point: ctx.point },
    });

    ctx.finish("committed");
  },
};

interface ToolsState {
  activeTool: ToolId;
  selection: ViewerSelection;
  annotations: AnnotationsApi;
  tools: ViewerTool[];
  rotation: number;
  onDraft: (draft: AnnotationDraft) => void;
}

interface Gesture {
  x: number;
  y: number;
  priorSelectionRects: DOMRect[];
}

export function useViewerTools(options: {
  containerRef: React.RefObject<HTMLElement | null>;
  annotations: AnnotationsApi;
  rotation: number;
  onDraft: (draft: AnnotationDraft) => void;
  tools?: ViewerTool[];
  enabled?: boolean;
}) {
  const {
    containerRef,
    annotations,
    rotation,
    onDraft,
    tools = NO_EXTRA_TOOLS,
    enabled = true,
  } = options;

  const [activeTool, setActiveTool] = useState<ToolId>("select");
  const [selection, setSelection] = useState<ViewerSelection>(null);

  const current =
    [selectTool, ...tools].find((tool) => tool.id == activeTool) ?? selectTool;

  // Ref is required to track pointer movement
  const stateRef = useRef<ToolsState>({
    activeTool,
    selection,
    annotations,
    tools: [selectTool, ...tools],
    rotation,
    onDraft,
  });

  // Synchronize ref
  useEffect(() => {
    stateRef.current = {
      activeTool,
      selection,
      annotations,
      tools: [selectTool, ...tools],
      rotation,
      onDraft,
    };
  }, [activeTool, selection, annotations, tools, rotation, onDraft]);

  const getTool = useCallback((id: ToolId): ViewerTool => {
    return stateRef.current.tools.find((tool) => tool.id == id) ?? selectTool;
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const setTool = useCallback((id: ToolId) => {
    setActiveTool(id);

    if (id != "select") {
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  const finishTool = useCallback(
    (result: ToolResult) => {
      const tool = getTool(stateRef.current.activeTool);
      if (result == "cancelled") tool.onCancel?.();
      if (tool.oneShot) setActiveTool("select");
    },
    [getTool],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    let gesture: Gesture | null = null;

    const buildContext = (event: PointerEvent): ToolContext => {
      const page = findPageElement(event.target as Node | null);
      const { rotation: currentRotation } = stateRef.current;

      return {
        event,
        container,
        page,
        point: page
          ? toPagePoint(page.el, event.clientX, event.clientY, currentRotation)
          : null,
        rotation: currentRotation,
        moved: gesture
          ? Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y)
          : 0,
        priorSelectionRects: gesture?.priorSelectionRects ?? [],
        annotations: stateRef.current.annotations,
        selection: stateRef.current.selection,
        select: setSelection,
        draft: (draft) => stateRef.current.onDraft(draft),
        finish: finishTool,
      };
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button != 0) return;

      gesture = {
        x: event.clientX,
        y: event.clientY,
        // Read before browser collapses it on mousedown
        priorSelectionRects: currentSelectionClientRects(),
      };
      const ctx = buildContext(event);
      getTool(stateRef.current.activeTool).onPointerDown?.(ctx);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!gesture) return;

      const ctx = buildContext(event);
      getTool(stateRef.current.activeTool).onPointerMove?.(ctx);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!gesture) return;

      const ctx = buildContext(event);
      gesture = null;
      getTool(stateRef.current.activeTool).onPointerUp?.(ctx);
    };

    const handlePointerCancel = () => {
      if (!gesture) return;
      gesture = null;
      finishTool("cancelled");
    };

    container.addEventListener("pointerdown", handlePointerDown);
    // On window, so drag that ends outside the viewer still completes
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      container.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [containerRef, enabled, finishTool, getTool]);

  // selection using keyboard
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const publishKeyboardSelection = () => {
      if (stateRef.current.activeTool != "select") return;

      const text = readTextSelection(container, stateRef.current.rotation);
      if (text) setSelection(text);
    };

    const dropStaleTextSelection = () => {
      if (stateRef.current.selection?.kind != "text") return;

      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim()) return;

      setSelection(null);
    };

    document.addEventListener("keyup", publishKeyboardSelection);
    document.addEventListener("selectionchange", dropStaleTextSelection);

    return () => {
      document.removeEventListener("keyup", publishKeyboardSelection);
      document.removeEventListener("selectionchange", dropStaleTextSelection);
    };
  }, [containerRef, enabled]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Remove one tool at time using ESCAPE

      if (event.key != "Escape") return;
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (stateRef.current.activeTool !== "select") {
        finishTool("cancelled");
        return;
      }

      if (stateRef.current.selection) {
        setSelection(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [finishTool]);

  const resetTool = () => setActiveTool("select");

  return {
    activeTool,
    setTool,
    resetTool,
    selection,
    select: setSelection,
    clearSelection,
    allowTextSelection: current.allowTextSelection,
    cursor: current.cursor,
  };
}
