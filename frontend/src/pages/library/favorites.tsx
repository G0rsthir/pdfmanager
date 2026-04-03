import { listFilesOptions } from "@/api/@tanstack/react-query.gen";
import type { FileResponse } from "@/api/types.gen";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import { Heading, Stack } from "@chakra-ui/react";
import { LuStar } from "react-icons/lu";
import { Empty } from "./shared/common";
import { FileCard } from "./shared/file";

export function FavoritesPage() {
  const query = useAPIQuery({
    ...listFilesOptions({
      query: {
        is_favorite: true,
      },
    }),
  });

  return (
    <QueryView query={query}>
      {(data) => <FavoriteFileView files={data} />}
    </QueryView>
  );
}

function FavoriteFileView({ files }: { files: FileResponse[] }) {
  return (
    <Stack gap={6}>
      <Heading size="3xl" fontWeight="normal">
        Favorites
      </Heading>

      {files.length == 0 && (
        <Empty
          icon={<LuStar />}
          title="No favorites yet. Star a file to quickly find it here."
        />
      )}

      {files.map((file) => (
        <FileCard file={file} key={file.id} />
      ))}
    </Stack>
  );
}
