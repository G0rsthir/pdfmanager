import type {
  CommentResponse,
  CreateCommentRequest,
  CreateHighlightRequest,
  HighlightResponse,
  NormalizedRect,
  PatchCommentRequest,
  PatchHighlightRequest,
} from "@/api/types.gen";
export type { NormalizedRect } from "@/api/types.gen";

export type HighlightItem = HighlightResponse;
export type CreateHighlight = CreateHighlightRequest;
export type PatchHighlight = PatchHighlightRequest;

export type CommentItem = CommentResponse;
export type CommentDraft = Pick<CommentItem, "page" | "excerpt" | "rects">;
export type CreateComment = CreateCommentRequest;
export type PatchComment = PatchCommentRequest;

export interface HighlightsApi {
  items: HighlightItem[];
  create: (input: CreateHighlight) => void;
  update: (id: string, patch: PatchHighlight) => void;
  delete: (id: string) => void;
  error?: Error | null;
}

export interface CommentsApi {
  items: CommentItem[];
  create: (input: CreateComment) => void;
  update: (id: string, patch: PatchCommentRequest) => void;
  delete: (id: string) => void;
  error?: Error | null;
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

export type AnnotationTab = "comments" | "highlights";

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
