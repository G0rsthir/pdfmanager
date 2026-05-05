import { listFilesOptions } from "@/api/@tanstack/react-query.gen";
import type { FileResponse } from "@/api/types.gen";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import { Group, Heading, Stack } from "@chakra-ui/react";
import { LuStar } from "react-icons/lu";
import { Empty } from "./shared/common";
import { FileList, LayoutSwitch } from "./shared/layout";

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
      <Group justify="space-between" align="center">
        <Heading size="3xl" fontWeight="normal">
          Favorites
        </Heading>

        <LayoutSwitch layoutKey="favorites" />
      </Group>

      {files.length == 0 && (
        <Empty
          icon={<LuStar />}
          title="No favorites yet. Star a file to quickly find it here."
        />
      )}

      {files && <FileList files={files} layoutKey="favorites" />}
    </Stack>
  );
}
