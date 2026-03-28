import { Box, Center, Stack } from "@chakra-ui/react";
import * as pdfjsLib from "pdfjs-dist";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";
import "pdfjs-dist/web/pdf_viewer.css";
import {
  EventBus,
  PDFFindController,
  PDFLinkService,
  PDFViewer,
} from "pdfjs-dist/web/pdf_viewer.mjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingError } from "../error";
import { ContentLoadingOverlay } from "../feedback";
import { SearchBar, Toolbar } from "./actions";
import "./style.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

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
  onPageChange?: (value: number) => void;
  onScaleChange?: (value: string) => void;
}

export function ReactPDFViewer(props: ReactPDFViewerProps) {
  const {
    file,
    intialPage,
    initialScaleValue = "1",
    fileName = "dokument.pdf",
    onPageChange,
    onScaleChange,
  } = props;

  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(intialPage);
  const [pageInputValue, setPageInputValue] = useState(String(intialPage));
  const [scaleValue, setScaleValue] = useState(initialScaleValue);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCount, setMatchCount] = useState({ current: 0, total: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerDivRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pdfViewerRef = useRef<PDFViewer | null>(null);
  const eventBusRef = useRef<EventBus | null>(null);
  const findControllerRef = useRef<PDFFindController | null>(null);

  // Initialize PDFViewer
  useEffect(() => {
    const container = containerRef.current;
    const viewerDiv = viewerDivRef.current;
    if (!container || !viewerDiv) return;

    const eventBus = new EventBus();
    eventBusRef.current = eventBus;

    const linkService = new PDFLinkService({ eventBus });

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

    eventBus.on("pagesinit", () => {
      pdfViewer.currentScaleValue = initialScaleValue;
      if (intialPage > 1) {
        pdfViewer.currentPageNumber = intialPage;
      }
    });

    eventBus.on("pagechanging", (e: { pageNumber: number }) => {
      setCurrentPage(e.pageNumber);
      onPageChange?.(e.pageNumber);
      setPageInputValue(String(e.pageNumber));
    });

    eventBus.on(
      "scalechanging",
      (e: { scale: number; presetValue?: string }) => {
        setScaleValue(e.presetValue ?? String(e.scale));
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
        setNumPages(pdfDoc.numPages);
        setLoading(false);
      })
      .catch((err) => {
        if (aborted) return;
        setError(err?.message ?? "Failed to load PDF");
        setLoading(false);
      });

    return () => {
      aborted = true;
      pdfViewer.cleanup();
      loadingTask.destroy().catch(() => {});
    };

    // initialScaleValue and intialPage are only used on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const dispatchFind = useCallback((type: string, query: string) => {
    eventBusRef.current?.dispatch("find", {
      source: null,
      type,
      query,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
    });
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (value) {
        dispatchFind("", value);
      }
    },
    [dispatchFind],
  );

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
    eventBusRef.current?.dispatch("find", {
      source: null,
      type: "again",
      query: searchQuery,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: false,
    });
  }, [searchQuery]);

  const findPrev = useCallback(() => {
    eventBusRef.current?.dispatch("find", {
      source: null,
      type: "again",
      query: searchQuery,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: true,
    });
  }, [searchQuery]);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery("");
    setMatchCount({ current: 0, total: 0 });
    eventBusRef.current?.dispatch("find", {
      source: null,
      type: "",
      query: "",
      caseSensitive: false,
      entireWord: false,
      highlightAll: false,
      findPrevious: false,
    });
  }, []);

  const toggleShowSearch = useCallback(() => {
    setShowSearch((v) => !v);
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

  return (
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
        handleDownload={handleDownload}
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
        />
      )}

      {/* PDFViewer requires absolute positioning */}
      <Box flex="1" position="relative">
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
        <Box ref={containerRef} position="absolute" inset="0" overflow="auto">
          <div ref={viewerDivRef} className="pdfViewer" />
        </Box>
      </Box>
    </Stack>
  );
}
