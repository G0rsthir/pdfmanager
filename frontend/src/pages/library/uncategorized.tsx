import { listUncategorizedFilesOptions } from "@/api/@tanstack/react-query.gen";
import type { FileResponse } from "@/api/types.gen";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import { Heading, Icon, Stack, Text } from "@chakra-ui/react";
import { LuFileText } from "react-icons/lu";
import { CardEmpty } from "./shared/common";
import { FileCard } from "./shared/file";

export function UncategorizedPage() {
  const query = useAPIQuery({
    ...listUncategorizedFilesOptions(),
  });

  return (
    <QueryView query={query}>
      {(data) => <UncategorizedFileView files={data} />}
    </QueryView>
  );
}

function UncategorizedFileView({ files }: { files: FileResponse[] }) {
  return (
    <Stack gap={6}>
      <Heading size="3xl" fontWeight="normal">
        Uncategorized files
      </Heading>

      {files.length === 0 && (
        <CardEmpty>
          <Icon size="xl" color="fg.muted">
            <LuFileText />
          </Icon>
          <Text color="fg.muted" textStyle="sm">
            No uncategorized files. Files not assigned to a folder will appear
            here.
          </Text>
        </CardEmpty>
      )}

      {files.map((file) => (
        <FileCard file={file} key={file.id} />
      ))}
    </Stack>
  );
}
