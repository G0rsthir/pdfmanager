interface ToFileUrl {
  folderId?: string | null;
  fileId: string;
  page?: number;
  preview?: boolean;
}

export function toFileUrl({ folderId, fileId, page, preview }: ToFileUrl) {
  const base = folderId
    ? `/folder/${folderId}/file/${fileId}`
    : `/uncategorized/file/${fileId}`;

  const params = new URLSearchParams();
  if (page != null) params.set("page", String(page));
  if (preview != null) params.set("preview", String(preview));

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
