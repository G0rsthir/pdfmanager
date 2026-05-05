import {
  createCommentMutation,
  createHighlightMutation,
  deleteCommentMutation,
  deleteHighlightMutation,
  getFileDetailsOptions,
  listFileCommentsOptions,
  listFileHighlightsOptions,
  patchCommentMutation,
  patchHighlightMutation,
} from "@/api/@tanstack/react-query.gen";
import { patchFileState } from "@/api/sdk.gen";
import { parseAPIError } from "@/common/error";
import { QueryView } from "@/components/ui/feedback";
import { ReactPDFViewer } from "@/components/ui/pdf";
import type {
  CommentsApi,
  CreateComment,
  CreateHighlight,
  HighlightsApi,
  PatchComment,
  PatchHighlight,
} from "@/components/ui/pdf/types";
import { showErrorNotification } from "@/components/ui/toaster";
import { getAccessToken } from "@/config/api";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import { useSearchParamMulti } from "@/hooks/url";
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";

async function saveReadingProgress(params: {
  fileId: string;
  currentPage?: number;
  scale?: string;
}) {
  const { fileId, currentPage, scale } = params;

  try {
    await patchFileState({
      path: {
        id: fileId,
      },
      body: {
        current_page: currentPage,
        scale: scale,
      },
      throwOnError: true,
    });
  } catch (e) {
    showErrorNotification(
      "Failed to save reading progress",
      parseAPIError(e).message,
    );
  }
}

export function FilePage() {
  const { fileid } = useParams();

  const [searchParams] = useSearchParamMulti({
    page: { type: "string" },
    preview: { type: "string" },
  });

  const [docParams, setDocParams] = useState<DocumentInitParameters>("");

  useEffect(() => {
    let cancelled = false;
    getAccessToken().then((token) => {
      if (cancelled || !token) return;
      setDocParams({
        url: `/api/v1/library/files/${fileid}/download`,
        httpHeaders: { authorization: `Bearer ${token}` },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [fileid]);

  const query = useAPIQuery({
    ...getFileDetailsOptions({
      path: {
        id: fileid!,
      },
    }),
    refetchOnWindowFocus: false,
    meta: {
      skipInvalidation: true,
    },
  });

  const highlights = useHighlights(fileid!);
  const comments = useComments(fileid!);

  const handlePageChange = useCallback(
    async (value: number) => {
      saveReadingProgress({
        fileId: fileid!,
        currentPage: value,
      });
    },
    [fileid],
  );

  const handleScaleChange = useCallback(
    async (value: string) => {
      saveReadingProgress({
        fileId: fileid!,
        scale: value,
      });
    },
    [fileid],
  );

  const intialPage = searchParams.page ? Number(searchParams.page) : undefined;
  const startInPreview = searchParams.preview
    ? searchParams.preview === "true"
    : undefined;

  return (
    <QueryView query={query}>
      {(file) => {
        return (
          <ReactPDFViewer
            file={docParams}
            fileName={file.name}
            initialScaleValue={file.state.scale}
            intialPage={intialPage ?? file.state.current_page}
            startInPreviewMode={startInPreview}
            comments={comments}
            highlights={highlights}
            onPageChange={handlePageChange}
            onScaleChange={handleScaleChange}
          />
        );
      }}
    </QueryView>
  );
}

function useHighlights(fileId: string): HighlightsApi {
  const highlightsQ = useAPIQuery({
    ...listFileHighlightsOptions({
      path: {
        id: fileId,
      },
    }),
  });

  const { mutate: createHighlightRequest } = useAPIMutation({
    ...createHighlightMutation(),
    onError(error) {
      showErrorNotification(
        "Couldn't save highlight",
        parseAPIError(error).message,
      );
    },
  });

  const { mutate: patchHighlightRequest } = useAPIMutation({
    ...patchHighlightMutation(),
    onError(error) {
      showErrorNotification(
        "Couldn't update highlight",
        parseAPIError(error).message,
      );
    },
  });

  const { mutate: deleteHighlightRequest } = useAPIMutation({
    ...deleteHighlightMutation(),
    onError(error) {
      showErrorNotification(
        "Couldn't delete highlight",
        parseAPIError(error).message,
      );
    },
  });

  const createHighlight = useCallback(
    (input: CreateHighlight) => {
      createHighlightRequest({
        path: { id: fileId },
        body: input,
      });
    },
    [createHighlightRequest, fileId],
  );

  const updateHighlight = useCallback(
    (id: string, patch: PatchHighlight) => {
      patchHighlightRequest({
        path: {
          file_id: fileId,
          id: id,
        },
        body: patch,
      });
    },
    [fileId, patchHighlightRequest],
  );

  const deleteHighlight = useCallback(
    (id: string) => {
      deleteHighlightRequest({
        path: { file_id: fileId, id: id },
      });
    },
    [deleteHighlightRequest, fileId],
  );

  return {
    items: highlightsQ.data ?? [],
    create: createHighlight,
    update: updateHighlight,
    delete: deleteHighlight,
    error: highlightsQ.apiError,
  };
}

function useComments(fileId: string): CommentsApi {
  const commentsQ = useAPIQuery({
    ...listFileCommentsOptions({
      path: {
        id: fileId,
      },
    }),
  });

  const { mutate: createCommentRequest } = useAPIMutation({
    ...createCommentMutation(),
    onError(error) {
      showErrorNotification(
        "Couldn't post comment",
        parseAPIError(error).message,
      );
    },
  });

  const { mutate: patchCommentRequest } = useAPIMutation({
    ...patchCommentMutation(),
    onError(error) {
      showErrorNotification(
        "Couldn't update comment",
        parseAPIError(error).message,
      );
    },
  });

  const { mutate: deleteCommentRequest } = useAPIMutation({
    ...deleteCommentMutation(),
    onError(error) {
      showErrorNotification(
        "Couldn't delete comment",
        parseAPIError(error).message,
      );
    },
  });

  const createComment = useCallback(
    (input: CreateComment) => {
      createCommentRequest({
        path: { id: fileId },
        body: input,
      });
    },
    [createCommentRequest, fileId],
  );

  const updateComment = useCallback(
    (id: string, patch: PatchComment) => {
      patchCommentRequest({
        path: {
          file_id: fileId,
          id: id,
        },
        body: patch,
      });
    },
    [fileId, patchCommentRequest],
  );

  const deleteComment = useCallback(
    (id: string) => {
      deleteCommentRequest({
        path: { file_id: fileId, id: id },
      });
    },
    [deleteCommentRequest, fileId],
  );

  return {
    items: commentsQ.data ?? [],
    create: createComment,
    update: updateComment,
    delete: deleteComment,
    error: commentsQ.apiError,
  };
}
