import { getFileThumbnail } from "@/api/sdk.gen";
import { useEffect, useState } from "react";

export function useFileThumbnail(fileId: string, enabled = true) {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadThumbnail() {
      const res = await getFileThumbnail({
        path: { id: fileId },
        parseAs: "blob",
      });
      if (cancelled || !res.data) return;
      objectUrl = URL.createObjectURL(res.data as Blob);
      setSrc(objectUrl);
    }

    loadThumbnail();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, enabled]);

  return src;
}
