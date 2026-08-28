import {
  getFileDetailsOptions,
  listAnnotationsOptions,
} from "@/api/@tanstack/react-query.gen";
import type { FileResponse } from "@/api/types.gen";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import { useSearchParamMulti } from "@/hooks/url";
import { DEFAULT_FILE_DETAILS_TAB } from "@/pages/library/shared/path";
import { Badge, Group, Stack, Tabs, Text } from "@chakra-ui/react";
import { LuChevronLeft } from "react-icons/lu";
import { useNavigate, useParams } from "react-router";
import { FileAnnotationsPanel } from "./annotations";
import { FileMetadataPanel } from "./details";
import { EditFilePanel } from "./edit";
import { FileHeader } from "./header";

export function FileDetailsPage() {
  const { fileid } = useParams();

  const query = useAPIQuery({
    ...getFileDetailsOptions({ path: { id: fileid! } }),
  });

  return (
    <QueryView query={query}>
      {(file) => <FileDetailsView file={file} />}
    </QueryView>
  );
}

function FileDetailsView({ file }: { file: FileResponse }) {
  return (
    <Stack gap={6}>
      <BackToFolderLink />
      <FileHeader file={file} />
      <FileDetailsTabs file={file} />
    </Stack>
  );
}

function BackToFolderLink() {
  const navigate = useNavigate();
  return (
    <Group
      gap={1}
      color="fg.muted"
      _hover={{ color: "fg" }}
      transition="color 0.2s"
      onClick={() => navigate(-1)}
      cursor="pointer"
    >
      <LuChevronLeft />
      <Text textStyle="sm">Back</Text>
    </Group>
  );
}

function FileDetailsTabs({ file }: { file: FileResponse }) {
  const annotationsQ = useAPIQuery({
    ...listAnnotationsOptions({ path: { id: file.id } }),
  });

  const annotationCount = annotationsQ.data?.length ?? 0;

  const [params, setParams] = useSearchParamMulti({ tab: { type: "string" } });

  return (
    <Tabs.Root
      value={params.tab ?? DEFAULT_FILE_DETAILS_TAB}
      onValueChange={({ value }) => setParams({ tab: value })}
    >
      <Tabs.List mb={4}>
        <Tabs.Trigger value="details">Details</Tabs.Trigger>
        <Tabs.Trigger value="edit">Edit</Tabs.Trigger>
        <Tabs.Trigger value="annotations">
          Annotations
          {annotationCount > 0 && (
            <Badge size="xs" variant="subtle" colorPalette="gray">
              {annotationCount}
            </Badge>
          )}
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="details">
        <FileMetadataPanel file={file} />
      </Tabs.Content>

      <Tabs.Content value="edit">
        <EditFilePanel file={file} />
      </Tabs.Content>

      <Tabs.Content value="annotations">
        <FileAnnotationsPanel file={file} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
