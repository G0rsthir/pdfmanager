import {
  createAnnotationMutation,
  deleteAnnotationMutation,
  getFileDetailsOptions,
  listAnnotationLabelsOptions,
  listAnnotationsOptions,
  patchAnnotationMutation,
} from "@/api/@tanstack/react-query.gen";
import { patchFileState } from "@/api/sdk.gen";
import { parseAPIError } from "@/common/error";
import { LoadingError } from "@/components/ui/error";
import { ContentLoadingOverlay } from "@/components/ui/feedback";
import { ReactPDFViewer } from "@/components/ui/pdf";
import type {
  AnnotationsApi,
  CreateAnnotation,
  PatchAnnotation,
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
    refetchOnMount: "always",
    meta: {
      skipInvalidation: true,
    },
  });

  const annotations = useAnnotations(fileid!);

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

  const previewPage = searchParams.page ? Number(searchParams.page) : undefined;

  if (query.isError)
    return <LoadingError>{query.apiError?.message}</LoadingError>;

  if (query.isFetching) return <ContentLoadingOverlay />;

  const file = query.data;

  return (
    file && (
      <ReactPDFViewer
        file={docParams}
        fileName={file.name}
        initialScaleValue={file.state.scale}
        intialPage={file.state.current_page}
        startInPreviewPage={previewPage}
        annotations={annotations}
        onPageChange={handlePageChange}
        onScaleChange={handleScaleChange}
        readOnly={file.is_read_only_by_current_user}
      />
    )
  );
}

function useAnnotations(fileId: string): AnnotationsApi {
  const annotationsQ = useAPIQuery({
    ...listAnnotationsOptions({
      path: {
        id: fileId,
      },
    }),
  });

  const labelsQ = useAPIQuery({
    ...listAnnotationLabelsOptions(),
  });

  const { mutate: createAnnotationRequest } = useAPIMutation({
    ...createAnnotationMutation(),
    onError(error) {
      showErrorNotification(
        "Couldn't post annotation",
        parseAPIError(error).message,
      );
    },
  });

  const { mutate: patchAnnotationRequest } = useAPIMutation({
    ...patchAnnotationMutation(),
    onError(error) {
      showErrorNotification(
        "Couldn't update annotation",
        parseAPIError(error).message,
      );
    },
  });

  const { mutate: deleteAnnotationRequest } = useAPIMutation({
    ...deleteAnnotationMutation(),
    onError(error) {
      showErrorNotification(
        "Couldn't delete annotation",
        parseAPIError(error).message,
      );
    },
  });

  const createAnnotation = useCallback(
    (input: CreateAnnotation) => {
      createAnnotationRequest({
        path: { id: fileId },
        body: input,
      });
    },
    [createAnnotationRequest, fileId],
  );

  const updateAnnotation = useCallback(
    (id: string, patch: PatchAnnotation) => {
      patchAnnotationRequest({
        path: {
          file_id: fileId,
          id: id,
        },
        body: patch,
      });
    },
    [fileId, patchAnnotationRequest],
  );

  const deleteAnnotation = useCallback(
    (id: string) => {
      deleteAnnotationRequest({
        path: { file_id: fileId, id: id },
      });
    },
    [deleteAnnotationRequest, fileId],
  );

  return {
    items: annotationsQ.data ?? [],
    create: createAnnotation,
    update: updateAnnotation,
    delete: deleteAnnotation,
    error: annotationsQ.apiError,
    labels: labelsQ.data,
  };
}
