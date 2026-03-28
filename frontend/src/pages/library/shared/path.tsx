export function toFileUrl({
  folderId,
  fileId,
}: {
  folderId?: string | null;
  fileId: string;
}) {
  if (folderId) return `/folder/${folderId}/file/${fileId}`;
  else return `/uncategorized/file/${fileId}`;
}
