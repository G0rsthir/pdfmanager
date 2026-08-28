import { getCollectionOptions } from "@/api/@tanstack/react-query.gen";
import type { FileResponse } from "@/api/types.gen";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatRelativeTime,
} from "@/common/format";
import { Section } from "@/components/ui/display";
import { useAPIQuery } from "@/hooks/query";
import {
  Badge,
  Link as ChakraLink,
  Code,
  DataList,
  Group,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { NavLink } from "react-router";
import { ReadingStatusSelect, SearchTag } from "../shared/file";
import { toFolderUrl } from "../shared/path";

export function FileMetadataPanel({ file }: { file: FileResponse }) {
  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
      <Section title="File">
        <DataList.Root orientation="horizontal" size="sm">
          <Row label="Format">
            <Badge variant="subtle" colorPalette="red">
              {file.content_type == "application/pdf"
                ? "PDF"
                : file.content_type}
            </Badge>
          </Row>
          <Row label="Size">{formatBytes(file.file_size)}</Row>
          <Row label="Pages">{file.page_count}</Row>
          <Row label="Original name">
            <Text truncate title={file.original_name}>
              {file.original_name}
            </Text>
          </Row>
          <Row label="Checksum">
            {file.file_hash && (
              <Code size="sm" truncate title={file.file_hash}>
                {file.file_hash}
              </Code>
            )}
          </Row>
        </DataList.Root>
      </Section>

      <Section title="Library">
        <DataList.Root orientation="horizontal" size="sm">
          <Row label="Folder">
            <FolderValue collectionId={file.collection_id} />
          </Row>
          <Row label="Authors">
            {file.authors?.length ? (
              <Text>
                {file.authors.map((author) => author.name).join(", ")}
              </Text>
            ) : null}
          </Row>
          <Row label="Published">{formatDate(file.published)}</Row>
          <Row label="Tags">
            {file.tags?.length ? (
              <Group gap={1} wrap="wrap">
                {file.tags.map((tag) => (
                  <SearchTag key={tag.id} tag={tag} />
                ))}
              </Group>
            ) : null}
          </Row>
          <Row
            label="Added"
            title={formatDateTime(file.created_at) ?? undefined}
          >
            {formatRelativeTime(file.created_at)}
          </Row>
          <Row
            label="Updated"
            title={formatDateTime(file.updated_at) ?? undefined}
          >
            {formatRelativeTime(file.updated_at)}
          </Row>
        </DataList.Root>
      </Section>

      <Section title="Reading">
        <DataList.Root orientation="horizontal" size="sm">
          <Row label="Status">
            <ReadingStatusSelect file={file} />
          </Row>
          <Row label="Current page">
            {file.state.current_page} of {file.page_count}
          </Row>
          <Row
            label="Last read"
            title={formatDateTime(file.state.last_read_at) ?? undefined}
          >
            {formatRelativeTime(file.state.last_read_at)}
          </Row>
          <Row label="Zoom">{file.state.scale}</Row>
        </DataList.Root>
      </Section>

      <Section title="Access">
        <DataList.Root orientation="horizontal" size="sm">
          <Row label="Your access">
            <Badge
              variant="subtle"
              colorPalette={
                file.is_read_only_by_current_user ? "gray" : "green"
              }
            >
              {file.is_read_only_by_current_user ? "Read only" : "Can modify"}
            </Badge>
          </Row>
          <Row label="Favorite">{file.state.is_favorite ? "Yes" : "No"}</Row>
        </DataList.Root>
      </Section>
    </SimpleGrid>
  );
}

function Row(props: {
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  const { label, title, children } = props;

  const isEmpty =
    children == null || children == false || children == "" || children == 0;

  return (
    <DataList.Item>
      <DataList.ItemLabel minW="32">{label}</DataList.ItemLabel>
      <DataList.ItemValue title={title}>
        {isEmpty ? <Text color="fg.subtle">&mdash;</Text> : children}
      </DataList.ItemValue>
    </DataList.Item>
  );
}

function FolderValue({ collectionId }: { collectionId: string }) {
  const query = useAPIQuery({
    ...getCollectionOptions({ path: { id: collectionId } }),
  });

  if (!query.data) return <Text color="fg.subtle">&mdash;</Text>;

  return (
    <ChakraLink asChild colorPalette="orange">
      <NavLink to={toFolderUrl(collectionId)}>{query.data.name}</NavLink>
    </ChakraLink>
  );
}
