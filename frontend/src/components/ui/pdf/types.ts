import type {
  AnnotationResponse,
  CreateAnnotationRequest,
  NormalizedRect,
  PatchAnnotationRequest,
} from "@/api/types.gen";
export type { NormalizedRect } from "@/api/types.gen";

export type AnnotationItem = AnnotationResponse;
export type AnnotationDraft = Pick<
  AnnotationItem,
  "page" | "excerpt" | "rects"
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

export type PopoverAction = "comment" | "highlight";

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
 * The processed outline item used in the UI.
 */
export interface OutlineItem {
  id: string;
  title: string;
  bold?: boolean;
  italic?: boolean;
  /**
   * PDF.js destination - pass back to linkService.goToDestination(dest).
   * */
  dest: string | unknown[] | null;
  url?: string | null;
  children: OutlineItem[];
}

export interface Bookmark {
  page: number;
  /**
   * PDF user-space coords, which is scale / rotation-independent and feeds directly back into scrollPageIntoView.
   */
  anchor: {
    x: number;
    y: number;
  };
}
