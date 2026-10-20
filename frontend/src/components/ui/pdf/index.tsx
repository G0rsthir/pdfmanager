import { Box, Center, Stack } from "@chakra-ui/react";
import * as pdfjsLib from "pdfjs-dist";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";
import "pdfjs-dist/web/pdf_viewer.css";
import {
  EventBus,
  PDFFindController,
  PDFHistory,
  PDFLinkService,
  PDFViewer,
} from "pdfjs-dist/web/pdf_viewer.mjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingError } from "../error";
import { ContentLoadingOverlay } from "../feedback";
import { PagePeekBar, SearchBar, Toolbar } from "./actions";
import { ANNOTATION_LABELS } from "./annotations";
import { Composer, type ComposerValue } from "./composer";
import { ContextToolbar } from "./context-toolbar";
import { normalizeOutline, useFullscreen, useSelectionAnchor } from "./hooks";
import { AnnotationLayers } from "./layer";
import { useViewerLayers } from "./layers";
import { SidePanel } from "./panel";
import { ViewerPortalProvider } from "./portal";
import "./style.css";
import { noteTool, useViewerTools } from "./tools";
import type {
  AnnotationDraft,
  AnnotationItem,
  AnnotationsApi,
  Bookmark,
  NormalizedRect,
  OutlineItem,
  SearchOptions,
  SidePanelTab,
} from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const VIEWER_TOOLS = [noteTool];

const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const ZOOM_PRESETS = [
  { label: "Auto", value: "auto" },
  { label: "Fit page", value: "page-fit" },
  { label: "Fit width", value: "page-width" },
  { label: "50%", value: "0.5" },
  { label: "75%", value: "0.75" },
  { label: "100%", value: "1" },
  { label: "125%", value: "1.25" },
  { label: "150%", value: "1.5 " },
  { label: "200%", value: "2" },
  { label: "300%", value: "3" },
];

interface ReactPDFViewerProps {
  file: string | DocumentInitParameters;
  intialPage: number;
  initialScaleValue: string;
  fileName?: string;
  startInPreviewPage?: number;
  onPageChange?: (value: number) => void;
  onScaleChange?: (value: string) => void;
  annotations: AnnotationsApi;
  canAnnotate?: boolean;
  canSaveProgress?: boolean;
}

export function ReactPDFViewer(props: ReactPDFViewerProps) {
  const {
    file,
    intialPage,
    initialScaleValue = "1",
    fileName = "document.pdf",
    canAnnotate = true,
    canSaveProgress = true,
    startInPreviewPage,
    annotations,
    onPageChange,
    onScaleChange,
  } = props;

  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(intialPage);
  const [pageInputValue, setPageInputValue] = useState(String(intialPage));
  const [scaleValue, setScaleValue] = useState(initialScaleValue);
  const [showSearch, setShowSearch] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    caseSensitive: false,
    entireWord: false,
  });
  const [matchCount, setMatchCount] = useState({ current: 0, total: 0 });
  const [outline, setOutline] = useState<OutlineItem[] | null>(null);
  const [rotation, setRotation] = useState(0);
  // Must be state, used by hooks
  const [eventBus, setEventBus] = useState<EventBus | null>(null);
  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>("annotations");
  const [draftAnnotation, setDraftAnnotation] =
    useState<AnnotationDraft | null>(null);
  // The existing annotation whose body is open in the composer
  const [editingId, setEditingId] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerDivRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pdfViewerRef = useRef<PDFViewer | null>(null);
  const eventBusRef = useRef<EventBus | null>(null);
  const findControllerRef = useRef<PDFFindController | null>(null);
  const isPeekingRef = useRef(false);
  const pdfHistoryRef = useRef<PDFHistory | null>(null);
  const linkServiceRef = useRef<PDFLinkService | null>(null);
  const lastLocationRef = useRef<Bookmark | null>(null);

  const { isFullscreen, toggleFullscreen } = useFullscreen(wrapperRef);

  const beginPeek = useCallback(() => {
    if (isPeekingRef.current) return;
    if (lastLocationRef.current) setBookmark(lastLocationRef.current);
    isPeekingRef.current = true;
  }, []);

  // Initialize PDFViewer
  useEffect(() => {
    const container = containerRef.current;
    const viewerDiv = viewerDivRef.current;
    if (!container || !viewerDiv) return;

    const eventBus = new EventBus();
    eventBusRef.current = eventBus;
    setTimeout(() => setEventBus(eventBus));

    const linkService = new PDFLinkService({
      eventBus,
      ignoreDestinationZoom: true,
    });

    linkServiceRef.current = linkService;

    const findController = new PDFFindController({ eventBus, linkService });
    findControllerRef.current = findController;

    const pdfViewer = new PDFViewer({
      container,
      viewer: viewerDiv,
      eventBus,
      linkService,
      findController,
      removePageBorders: false,
      textLayerMode: 1,
      annotationMode: 2,
    });
    pdfViewerRef.current = pdfViewer;

    linkService.setViewer(pdfViewer);

    const pdfHistory = new PDFHistory({ eventBus, linkService });
    pdfHistoryRef.current = pdfHistory;
    linkService.setHistory(pdfHistory);

    eventBus.on("pagesinit", () => {
      pdfViewer.currentScaleValue = initialScaleValue;
      if (intialPage > 1) {
        pdfViewer.currentPageNumber = intialPage;
      }
    });

    // Start in peeking mode once the first page is rendered
    const onFirstRender = () => {
      eventBus.off("pagerendered", onFirstRender);
      if (!startInPreviewPage) return;
      beginPeek();
      pdfViewer.scrollPageIntoView({ pageNumber: startInPreviewPage });
    };

    eventBus.on("pagerendered", onFirstRender);

    eventBus.on("pagechanging", (e: { pageNumber: number }) => {
      setCurrentPage(e.pageNumber);
      if (isPeekingRef.current !== true && canSaveProgress == true)
        onPageChange?.(e.pageNumber);
      setPageInputValue(String(e.pageNumber));
    });

    eventBus.on(
      "scalechanging",
      (e: { scale: number; presetValue?: string }) => {
        setScaleValue(e.presetValue ?? String(e.scale));
        if (canSaveProgress == true)
          onScaleChange?.(e.presetValue ?? String(e.scale));
      },
    );

    eventBus.on(
      "updatefindmatchescount",
      (e: { matchesCount: { current: number; total: number } }) => {
        setMatchCount(e.matchesCount);
      },
    );

    eventBus.on(
      "updatefindcontrolstate",
      (e: { matchesCount: { current: number; total: number } }) => {
        if (e.matchesCount) {
          setMatchCount(e.matchesCount);
        }
      },
    );

    eventBus.on("rotationchanging", (e: { pagesRotation: number }) => {
      setRotation(e.pagesRotation);
    });

    eventBus.on(
      "updateviewarea",
      (e: { location: { pageNumber: number; top: number; left: number } }) => {
        lastLocationRef.current = {
          page: e.location.pageNumber,
          anchor: { x: e.location.left, y: e.location.top },
        };
      },
    );

    // Load the PDF
    let aborted = false;
    const loadingTask = pdfjsLib.getDocument(file);
    loadingTask.promise
      .then((pdfDoc) => {
        if (aborted) {
          pdfDoc.destroy();
          return;
        }
        pdfViewer.setDocument(pdfDoc);
        linkService.setDocument(pdfDoc, null);
        pdfHistory.initialize({ fingerprint: pdfDoc.fingerprints[0] ?? "" });
        setNumPages(pdfDoc.numPages);
        pdfDoc.getOutline().then((nodes) => {
          setOutline(normalizeOutline(nodes));
        });
        setLoading(false);
      })
      .catch((err) => {
        if (aborted) return;
        setError(err?.message ?? "Failed to load PDF");
        setLoading(false);
      });

    return () => {
      aborted = true;
      setEventBus(null);
      pdfViewer.cleanup();
      loadingTask.destroy().catch(() => {});
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps, react-x/exhaustive-deps
  }, [file, onPageChange, onScaleChange]);

  const goToPage = useCallback(
    (page: number) => {
      const viewer = pdfViewerRef.current;
      if (!viewer) return;
      const clamped = Math.max(1, Math.min(page, numPages));
      viewer.currentPageNumber = clamped;
    },
    [numPages],
  );

  const handlePageInput = useCallback((value: string) => {
    setPageInputValue(value);
  }, []);

  const commitPageInput = useCallback(() => {
    const page = parseInt(pageInputValue, 10);
    if (page >= 1 && page <= numPages) {
      goToPage(page);
    } else {
      setPageInputValue(String(currentPage));
    }
  }, [pageInputValue, numPages, currentPage, goToPage]);

  const setZoom = useCallback((value: number | string) => {
    const viewer = pdfViewerRef.current;
    if (!viewer) return;
    if (typeof value === "string") {
      viewer.currentScaleValue = value;
    } else {
      viewer.currentScale = Math.max(MIN_ZOOM, Math.min(value, MAX_ZOOM));
    }
  }, []);

  const zoomIn = useCallback(() => {
    const viewer = pdfViewerRef.current;
    if (!viewer) return;
    setZoom(viewer.currentScale + ZOOM_STEP);
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    const viewer = pdfViewerRef.current;
    if (!viewer) return;
    setZoom(viewer.currentScale - ZOOM_STEP);
  }, [setZoom]);

  const rotateCW = useCallback(() => {
    const viewer = pdfViewerRef.current;
    if (!viewer) return;
    viewer.pagesRotation = (viewer.pagesRotation + 90) % 360;
  }, []);

  const rotateCCW = useCallback(() => {
    const viewer = pdfViewerRef.current;
    if (!viewer) return;
    viewer.pagesRotation = (viewer.pagesRotation + 270) % 360;
  }, []);

  const runFind = useCallback(
    (params: {
      type: string;
      query: string;
      options: SearchOptions;
      findPrevious?: boolean;
      highlightAll?: boolean;
    }) => {
      const {
        type,
        query,
        options,
        findPrevious = false,
        highlightAll = true,
      } = params;

      eventBusRef.current?.dispatch("find", {
        source: null,
        type,
        query,
        caseSensitive: options.caseSensitive,
        entireWord: options.entireWord,
        highlightAll,
        findPrevious,
      });
    },
    [],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (value) {
        runFind({ type: "", query: value, options: searchOptions });
      }
    },
    [runFind, searchOptions],
  );

  /**
   * Toggling an option re-runs the search with the new settings
   */
  const toggleSearchOption = useCallback(
    (option: keyof SearchOptions) => {
      const next = { ...searchOptions, [option]: !searchOptions[option] };
      setSearchOptions(next);

      if (searchQuery) {
        runFind({ type: "", query: searchQuery, options: next });
      }
    },
    [runFind, searchOptions, searchQuery],
  );

  const returnFromPeek = useCallback(() => {
    if (bookmark == null) return;
    isPeekingRef.current = false;
    setBookmark(null);

    pdfViewerRef.current?.scrollPageIntoView({
      pageNumber: bookmark.page,
      destArray: [
        null,
        { name: "XYZ" },
        bookmark.anchor.x,
        bookmark.anchor.y,
        null,
      ],
    });
  }, [bookmark]);

  const continueFromPeek = useCallback(() => {
    isPeekingRef.current = false;
    setBookmark(null);
    if (canSaveProgress == true) onPageChange?.(currentPage);
  }, [onPageChange, currentPage, canSaveProgress]);

  const handleDownload = useCallback(async () => {
    const pdfDoc = pdfViewerRef.current?.pdfDocument;
    if (!pdfDoc) return;
    const data = await pdfDoc.getData();
    const blob = new Blob([new Uint8Array(data)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [fileName]);

  const findNext = useCallback(() => {
    runFind({ type: "again", query: searchQuery, options: searchOptions });
  }, [runFind, searchQuery, searchOptions]);

  const findPrev = useCallback(() => {
    runFind({
      type: "again",
      query: searchQuery,
      options: searchOptions,
      findPrevious: true,
    });
  }, [runFind, searchQuery, searchOptions]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery("");
    setMatchCount({ current: 0, total: 0 });
    runFind({
      type: "",
      query: "",
      options: searchOptions,
      highlightAll: false,
    });
  }, [runFind, searchOptions]);

  const toggleShowSearch = useCallback(() => {
    setShowSearch((v) => !v);
  }, []);

  const toggleAnnotations = useCallback(() => {
    setShowAnnotations((v) => !v);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      } else if (ctrl && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomIn();
      } else if (ctrl && e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if (ctrl && e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [zoomIn, zoomOut, setZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const viewer = pdfViewerRef.current;
        if (!viewer) return;
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const newScale = Math.max(
          MIN_ZOOM,
          Math.min(viewer.currentScale + delta, MAX_ZOOM),
        );
        viewer.currentScale = newScale;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [showSearch]);

  // Peek on PDFHistory navigation
  useEffect(() => {
    const onPop = () => {
      if (isPeekingRef.current) return;
      beginPeek();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [beginPeek]);

  const { create: createAnnotation } = annotations;

  const layerRoots = useViewerLayers({ viewerRef: viewerDivRef, eventBus });

  // One composer at a time: starting a draft closes an edit, and back
  const startDraft = useCallback((draft: AnnotationDraft) => {
    setDraftAnnotation(draft);
    setEditingId(null);
  }, []);

  const {
    activeTool,
    setTool,
    resetTool,
    selection,
    select,
    clearSelection,
    allowTextSelection,
    cursor,
  } = useViewerTools({
    containerRef,
    annotations,
    rotation,
    onDraft: startDraft,
    tools: VIEWER_TOOLS,
  });

  const anchor = useSelectionAnchor({
    containerRef,
    viewerRef: viewerDivRef,
    selection,
    rotation,
    revision: scaleValue,
  });

  const draftAnchor = useSelectionAnchor({
    containerRef,
    viewerRef: viewerDivRef,
    selection: draftAnnotation,
    rotation,
    revision: scaleValue,
  });

  const editingAnnotation = editingId
    ? (annotations.items.find((item) => item.id == editingId) ?? null)
    : null;

  const editAnchor = useSelectionAnchor({
    containerRef,
    viewerRef: viewerDivRef,
    selection: editingAnnotation,
    rotation,
    revision: scaleValue,
  });

  const handleSubmitDraft = useCallback(
    ({ body, label }: ComposerValue) => {
      if (!draftAnnotation) return;
      createAnnotation({ ...draftAnnotation, body, label, color: "gray" });
      setDraftAnnotation(null);
    },
    [createAnnotation, draftAnnotation],
  );

  const handleCancelDraft = useCallback(() => {
    setDraftAnnotation(null);
    resetTool();
  }, [resetTool]);

  const handleSubmitEdit = useCallback(
    ({ body, label }: ComposerValue) => {
      if (editingId) annotations.update(editingId, { body, label });
      setEditingId(null);
    },
    [annotations, editingId],
  );

  const selectedAnnotation =
    selection?.kind == "element"
      ? (annotations.items.find((item) => item.id == selection.id) ?? null)
      : null;

  const openAnnotationsPanel = useCallback(() => {
    setSidePanelTab("annotations");
    setShowAnnotations(true);
  }, []);

  const handleOpenAnnotation = useCallback(
    (annotation: AnnotationItem) => {
      select({
        kind: "element",
        id: annotation.id,
        page: annotation.page,
        rects: annotation.rects,
      });
      openAnnotationsPanel();
    },
    [select, openAnnotationsPanel],
  );

  const handleHighlight = useCallback(
    (color: string) => {
      if (selection?.kind != "text") return;

      createAnnotation({
        geometry: { type: "highlight" },
        page: selection.page,
        excerpt: selection.text,
        color,
        rects: selection.rects,
        body: "",
      });
      openAnnotationsPanel();
      clearSelection();
    },
    [selection, createAnnotation, clearSelection, openAnnotationsPanel],
  );

  /**
   * Text gets a new draft; an annotation gets its body opened for editing.
   */
  const handleComment = useCallback(() => {
    if (selection?.kind == "text") {
      startDraft({
        page: selection.page,
        excerpt: selection.text,
        rects: selection.rects,
        geometry: { type: "highlight" },
      });
      clearSelection();
    } else if (selectedAnnotation) {
      setDraftAnnotation(null);
      setEditingId(selectedAnnotation.id);
    }
  }, [selection, selectedAnnotation, startDraft, clearSelection]);

  const handleChangeColor = useCallback(
    (color: string) => {
      if (selectedAnnotation)
        annotations.update(selectedAnnotation.id, { color });
    },
    [annotations, selectedAnnotation],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedAnnotation) return;
    annotations.delete(selectedAnnotation.id);
    clearSelection();
  }, [annotations, selectedAnnotation, clearSelection]);

  const jumpToAnchor = useCallback(
    async (anchor: { page: number; rects: NormalizedRect[] }) => {
      const viewer = pdfViewerRef.current;
      const pdfDoc = viewer?.pdfDocument;
      if (!viewer || !pdfDoc || anchor.rects.length === 0) return;

      const page = await pdfDoc.getPage(anchor.page);
      const viewport = page.getViewport({ scale: 1 });
      const r = anchor.rects[0];

      // Land the anchor ~25% down the visible viewport so it isn't
      // pinned to the very top edge.
      const containerH = containerRef.current?.clientHeight ?? 800;
      const offsetCssPx = containerH * 0.25;
      const offsetPdfUnits = offsetCssPx / viewer.currentScale;

      const pdfX = r.left * viewport.width;
      const pdfY = viewport.height - r.top * viewport.height + offsetPdfUnits;

      beginPeek();
      viewer.scrollPageIntoView({
        pageNumber: anchor.page,
        destArray: [null, { name: "XYZ" }, pdfX, pdfY, null],
      });
    },
    [beginPeek],
  );

  const handleJumpToOutlineItem = (dest: OutlineItem["dest"]) => {
    if (!dest) return;
    beginPeek();
    linkServiceRef.current?.goToDestination(dest);
  };

  return (
    <ViewerPortalProvider container={wrapperRef}>
      <Stack ref={wrapperRef} gap="0" h="full" bg="bg">
        <Toolbar
          currentPage={currentPage}
          numPages={numPages}
          pageInputValue={pageInputValue}
          handlePageInput={handlePageInput}
          commitPageInput={commitPageInput}
          goToPage={goToPage}
          setZoom={setZoom}
          rotateCCW={rotateCCW}
          rotateCW={rotateCW}
          zoomIn={zoomIn}
          zoomOut={zoomOut}
          zoomPresets={ZOOM_PRESETS}
          scaleValue={scaleValue}
          toggleShowSearch={toggleShowSearch}
          toggleAnnotations={toggleAnnotations}
          showAnnotations={showAnnotations}
          activeTool={activeTool}
          setTool={setTool}
          canAnnotate={canAnnotate}
          handleDownload={handleDownload}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
        />

        {showSearch && (
          <SearchBar
            ref={searchInputRef}
            searchQuery={searchQuery}
            matchCount={matchCount}
            handleSearchChange={handleSearchChange}
            closeSearch={closeSearch}
            findNextMatch={findNext}
            findPrevMatch={findPrev}
            searchOptions={searchOptions}
            onToggleSearchOption={toggleSearchOption}
          />
        )}

        <Box flex="1" display="flex" minH={0}>
          {/* PDFViewer requires absolute positioning */}
          <Box flex="1" position="relative" minW={0}>
            {loading && (
              <Center position="absolute" inset="0">
                <ContentLoadingOverlay />
              </Center>
            )}
            {error && (
              <Box position="absolute" inset="0" p="4">
                <LoadingError>{error}</LoadingError>
              </Box>
            )}
            <Box
              ref={containerRef}
              position="absolute"
              inset="0"
              overflow="auto"
              cursor={cursor}
            >
              <div
                ref={viewerDivRef}
                className={
                  allowTextSelection ? "pdfViewer" : "pdfViewer no-text-select"
                }
              />
              <AnnotationLayers
                roots={layerRoots}
                annotations={annotations.items}
                selectedId={selection?.kind == "element" ? selection.id : null}
                rotation={rotation}
                draft={draftAnnotation}
                onOpen={handleOpenAnnotation}
              />
              {/* The composer replaces the toolbar while it is open */}
              {!draftAnnotation && !editingAnnotation && (
                <ContextToolbar
                  anchor={anchor}
                  selection={selection}
                  annotation={selectedAnnotation}
                  readOnly={!canAnnotate}
                  onHighlight={handleHighlight}
                  onComment={handleComment}
                  onChangeColor={handleChangeColor}
                  onOpenDetails={openAnnotationsPanel}
                  onDelete={handleDeleteSelected}
                />
              )}
              {draftAnnotation && draftAnchor && (
                <Composer
                  // A new draft starts a fresh composer instead of inheriting the text
                  key={JSON.stringify([
                    draftAnnotation.page,
                    draftAnnotation.rects,
                  ])}
                  containerRef={containerRef}
                  anchor={draftAnchor}
                  title={
                    draftAnnotation.excerpt ||
                    `New ${ANNOTATION_LABELS[draftAnnotation.geometry.type]}`
                  }
                  submitLabel="Add"
                  labels={annotations.labels}
                  onSubmit={handleSubmitDraft}
                  onCancel={handleCancelDraft}
                />
              )}
              {editingAnnotation && editAnchor && (
                <Composer
                  key={editingAnnotation.id}
                  containerRef={containerRef}
                  anchor={editAnchor}
                  title={
                    editingAnnotation.excerpt ||
                    ANNOTATION_LABELS[editingAnnotation.geometry.type]
                  }
                  initial={{
                    body: editingAnnotation.body,
                    label: editingAnnotation.label ?? "",
                  }}
                  submitLabel="Save"
                  labels={annotations.labels}
                  onSubmit={handleSubmitEdit}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </Box>
            <PagePeekBar
              open={bookmark ? true : false}
              currentPage={currentPage}
              bookmark={bookmark}
              onReturn={returnFromPeek}
              onContinue={continueFromPeek}
            />
          </Box>
          {showAnnotations && (
            <SidePanel
              canAnnotate={canAnnotate}
              annotations={annotations}
              currentPage={currentPage}
              tab={sidePanelTab}
              outline={outline}
              onTabChange={setSidePanelTab}
              onClose={toggleAnnotations}
              onJumpToAnnotation={jumpToAnchor}
              onJumpToOutlineItem={handleJumpToOutlineItem}
            />
          )}
        </Box>
      </Stack>
    </ViewerPortalProvider>
  );
}
