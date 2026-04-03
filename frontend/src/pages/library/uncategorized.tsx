import { listUncategorizedFilesOptions } from "@/api/@tanstack/react-query.gen";
import type { FileResponse } from "@/api/types.gen";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import { Heading, Stack } from "@chakra-ui/react";
import { LuFileText } from "react-icons/lu";
import { Empty } from "./shared/common";
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
        <Empty
          icon={<LuFileText />}
          title="No uncategorized files. Files not assigned to a folder will appear here."
        />
      )}

      {files.map((file) => (
        <FileCard file={file} key={file.id} />
      ))}
    </Stack>
  );
}
