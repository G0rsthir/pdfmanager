import type { FileClickAction } from "./file";

interface ToFileUrl {
  folderId: string;
  fileId: string;
  page?: number;
}

function toFileBaseUrl(folderId: string, fileId: string) {
  return `/folder/${folderId}/file/${fileId}`;
}

export function toFileReaderUrl({ folderId, fileId, page }: ToFileUrl) {
  const base = toFileBaseUrl(folderId, fileId);

  const params = new URLSearchParams();
  if (page != null) params.set("page", String(page));

  const query = params.toString();
  return query ? `${base}/reader?${query}` : `${base}/reader`;
}

export type FileDetailsTab = "details" | "edit" | "annotations";

export const DEFAULT_FILE_DETAILS_TAB: FileDetailsTab = "details";

export function toFileDetailsUrl({
  folderId,
  fileId,
  tab,
}: Omit<ToFileUrl, "page"> & { tab?: FileDetailsTab }) {
  const base = `${toFileBaseUrl(folderId, fileId)}/details`;
  if (!tab || tab == DEFAULT_FILE_DETAILS_TAB) return base;

  return `${base}?tab=${tab}`;
}

export function toFileUrl(
  params: Omit<ToFileUrl, "page"> & { action: FileClickAction },
) {
  const { action, ...target } = params;

  return action == "details"
    ? toFileDetailsUrl(target)
    : toFileReaderUrl(target);
}

export function toFolderUrl(folderId: string | null | undefined) {
  return folderId ? `/folder/${folderId}` : "/";
}
