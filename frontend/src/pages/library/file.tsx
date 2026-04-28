import { getFileDetailsOptions } from "@/api/@tanstack/react-query.gen";
import { client } from "@/api/client.gen";
import { patchFileState } from "@/api/sdk.gen";
import { parseAPIError } from "@/common/error";
import { QueryView } from "@/components/ui/feedback";
import { ReactPDFViewer } from "@/components/ui/pdf";
import { showErrorNotification } from "@/components/ui/toaster";
import { useAPIQuery } from "@/hooks/query";
import { useCallback } from "react";
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

  return (
    <QueryView query={query}>
      {(file) => (
        <ReactPDFViewer
          file={{
            url: `/api/v1/library/files/${file.id}/download`,
            httpHeaders: {
              authorization: `Bearer ${client.getConfig().auth}`,
            },
          }}
          fileName={file.name}
          initialScaleValue={file.state.scale}
          intialPage={file.state.current_page}
          onPageChange={handlePageChange}
          onScaleChange={handleScaleChange}
        />
      )}
    </QueryView>
  );
}
