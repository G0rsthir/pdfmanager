import { listFilesOptions } from "@/api/@tanstack/react-query.gen";
import type { FileResponse } from "@/api/types.gen";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import { Heading, Icon, Stack, Text } from "@chakra-ui/react";
import { LuStar } from "react-icons/lu";
import { CardEmpty } from "./shared/common";
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

      {files.length === 0 && (
        <CardEmpty>
          <Icon size="xl" color="fg.muted">
            <LuStar />
          </Icon>
          <Text color="fg.muted" textStyle="sm">
            No favorites yet. Star a file to quickly find it here.
          </Text>
        </CardEmpty>
      )}

      {files.map((file) => (
        <FileCard file={file} key={file.id} />
      ))}
    </Stack>
  );
}
