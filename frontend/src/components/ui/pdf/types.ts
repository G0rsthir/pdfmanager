import type {
  CreateAnnotationRequest,
  ListAnnotationsResponse,
  NormalizedRect,
  PatchAnnotationRequest,
} from "@/api/types.gen";
export type { NormalizedPoint, NormalizedRect } from "@/api/types.gen";

export type AnnotationItem = ListAnnotationsResponse[number];

/**
 * Discriminated by type: highlight, note, ink or shape
 */
export type AnnotationGeometry = AnnotationItem["geometry"];
export type AnnotationType = AnnotationGeometry["type"];

export type GeometryOf<T extends AnnotationType> = Extract<
  AnnotationGeometry,
  { type: T }
>;

export type AnnotationDraft = Pick<
  AnnotationItem,
  "page" | "excerpt" | "rects" | "geometry"
>;
export type CreateAnnotation = CreateAnnotationRequest;
export type PatchAnnotation = PatchAnnotationRequest;

export interface AnnotationsApi {
  items: AnnotationItem[];
  create: (input: CreateAnnotation) => void;
  update: (id: string, patch: PatchAnnotation) => void;
  delete: (id: string) => void;
  error?: Error | null;
  labels?: string[];
}

export interface ZoomPreset {
  label: string;
  value: string;
}

/**
 * A point in page: fractions (0..1), the same as NormalizedRect
 */
export interface PagePoint {
  x: number;
  y: number;
}

/**
 * A PDF.js page wrapper (.page[data-page-number])
 */
export interface PageElement {
  number: number;
  el: HTMLElement;
}

export type ToolId = "select" | AnnotationType;

export type ToolResult = "committed" | "cancelled";

/**
 * Text user selected in the PDF.js
 */
export interface TextSelection {
  kind: "text";
  page: number;
  text: string;
  rects: NormalizedRect[];
}

/**
 * An existing annotation picked by user
 */
export interface ElementSelection {
  kind: "element";
  id: string;
  page: number;
  rects: NormalizedRect[];
}

export type ViewerSelection = TextSelection | ElementSelection | null;

export interface ToolContext {
  event: PointerEvent;
  /**
   * Scroll container
   */
  container: HTMLElement;
  /**
   * Null when pointer is not over a page (margins between pages)
   */
  page: PageElement | null;
  point: PagePoint | null;
  /**
   * Viewer rotation, for converting between stored and rendered space
   */
  rotation: number;
  /**
   * Distance in px from where the gesture started, to tell a click from a drag
   */
  moved: number;
  /**
   * Client rects of the text selection that existed when the gesture started
   */
  priorSelectionRects: DOMRect[];
  annotations: AnnotationsApi;
  selection: ViewerSelection;
  select: (next: ViewerSelection) => void;
  draft: (draft: AnnotationDraft) => void;
  finish: (result: ToolResult) => void;
}

export interface ViewerTool {
  id: ToolId;
  /**
   * CSS cursor for the scroll container while this tool is active
   */
  cursor?: string;
  /**
   * False for the drawing tools, so a drag draws instead of selecting text
   */
  allowTextSelection: boolean;
  /**
   * Return to "select" after the tool commits or cancels
   */
  oneShot?: boolean;
  onPointerDown?: (ctx: ToolContext) => void;
  onPointerMove?: (ctx: ToolContext) => void;
  onPointerUp?: (ctx: ToolContext) => void;
  /**
   * Drop any in-progress drawing (Escape, or the pointer was cancelled)
   */
  onCancel?: () => void;
}

/**
 * Where a popover attaches to something on a page
 */
export interface PopoverAnchor {
  x: number;
  y: number;
}

export interface SelectionPopoverState {
  text: string;
  page: number;

  /**
   * Per-line rects in normalized 0..1 coords of the page, ready to feed into HighlightItem.
   */
  rects: NormalizedRect[];
  /**
   * Coordinates relative to the scroll container's content (not viewport),
   * anchored to the bottom-right corner of the selection.
   */
  anchor: { x: number; y: number };
}

export type SidePanelTab = "annotations" | "outline";

/**
 * The raw outline item as provided by PDF.js
 */
export interface OutlineRawItem {
  title: string;
  bold: boolean;
  italic: boolean;
  color: Uint8ClampedArray;
  dest: string | unknown[] | null;
  url: string | null;
  unsafeUrl: string | undefined;
  newWindow: boolean | undefined;
  count: number | undefined;
  items: OutlineRawItem[];
}

/**
 * The processed outline item used in the UI
 */
export interface OutlineItem {
  id: string;
  title: string;
  bold?: boolean;
  italic?: boolean;
  /**
   * PDF.js destination - pass back to linkService.goToDestination(dest)
   * */
  dest: string | unknown[] | null;
  url?: string | null;
  children: OutlineItem[];
}

export interface Bookmark {
  page: number;
  /**
   * PDF user-space coords, which is scale / rotation-independent and feeds directly back into scrollPageIntoView
   */
  anchor: {
    x: number;
    y: number;
  };
}

/**
 * PDF.js find options
 */
export interface SearchOptions {
  caseSensitive: boolean;
  entireWord: boolean;
}
