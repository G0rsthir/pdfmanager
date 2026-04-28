interface ToFileUrl {
  folderId?: string | null;
  fileId: string;
  page?: number;
}

export function toFileUrl({ folderId, fileId, page }: ToFileUrl) {
  const base = folderId
    ? `/folder/${folderId}/file/${fileId}`
    : `/uncategorized/file/${fileId}`;

  const params = new URLSearchParams();
  if (page != null) params.set("page", String(page));

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
