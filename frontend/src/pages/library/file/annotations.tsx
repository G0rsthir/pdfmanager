import { listAnnotationsOptions } from "@/api/@tanstack/react-query.gen";
import type { AnnotationResponse, FileResponse } from "@/api/types.gen";
import { formatDateTime, formatRelativeTime } from "@/common/format";
import { QueryView } from "@/components/ui/feedback";
import { useAPIQuery } from "@/hooks/query";
import { Empty } from "@/pages/shared/common";
import {
  Badge,
  Box,
  Group,
  Input,
  InputGroup,
  Separator,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { LuHighlighter, LuSearch } from "react-icons/lu";
import { NavLink } from "react-router";
import { toFileReaderUrl } from "../shared/path";

export function FileAnnotationsPanel({ file }: { file: FileResponse }) {
  const query = useAPIQuery({
    ...listAnnotationsOptions({ path: { id: file.id } }),
  });

  return (
    <QueryView query={query}>
      {(annotations) => (
        <AnnotationsView annotations={annotations} file={file} />
      )}
    </QueryView>
  );
}

function AnnotationsView(props: {
  annotations: AnnotationResponse[];
  file: FileResponse;
}) {
  const { annotations, file } = props;

  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const sorted = [...annotations].sort((a, b) => a.page - b.page);
    if (!needle) return sorted;

    return annotations.filter(
      (item) =>
        item.body.toLowerCase().includes(needle) ||
        item.excerpt.toLowerCase().includes(needle) ||
        item.label?.toLowerCase().includes(needle),
    );
  }, [annotations, filter]);

  if (annotations.length == 0)
    return (
      <Empty
        icon={<LuHighlighter />}
        title="No annotations yet. Highlight text while reading to add one"
      />
    );

  return (
    <Stack gap={4}>
      <Group justify="space-between">
        <Text color="fg.muted" fontSize="sm">
          {visible.length} of {annotations.length}{" "}
          {annotations.length == 1 ? "annotation" : "annotations"}
        </Text>
        <InputGroup startElement={<LuSearch />} width="xs">
          <Input
            size="sm"
            placeholder="Filter annotations.."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </InputGroup>
      </Group>

      {visible.length == 0 ? (
        <Empty icon={<LuSearch />} title="No annotations match your filter" />
      ) : (
        <Stack gap={2}>
          {visible.map((annotation) => (
            <AnnotationItem
              key={annotation.id}
              annotation={annotation}
              file={file}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function AnnotationItem(props: {
  annotation: AnnotationResponse;
  file: FileResponse;
}) {
  const { annotation, file } = props;

  return (
    <NavLink
      to={toFileReaderUrl({
        folderId: file.collection_id,
        fileId: file.id,
        page: annotation.page,
      })}
    >
      <Stack
        direction="row"
        gap={3}
        p={3}
        rounded="md"
        transition="background 0.15s"
        _hover={{ bg: "bg.subtle" }}
      >
        <Box
          w="1"
          rounded="full"
          flexShrink={0}
          style={{ background: annotation.color }}
        />

        <Stack align="center" justify="center" minW="12" gap={0} flexShrink={0}>
          <Text textStyle="xs" color="fg.muted" letterSpacing="wider">
            PAGE
          </Text>
          <Text textStyle="sm" fontWeight="semibold" lineHeight={1}>
            {annotation.page}
          </Text>
        </Stack>

        <Separator orientation="vertical" />

        <Stack gap={1.5}>
          {annotation.excerpt && (
            <Text
              textStyle="xs"
              color="fg.muted"
              fontStyle="italic"
              lineClamp={2}
              borderLeftWidth="2px"
              borderColor="border"
              pl={2}
            >
              "{annotation.excerpt}"
            </Text>
          )}

          <Text textStyle="sm" lineClamp={3}>
            {annotation.body}
          </Text>

          <Group gap={2} wrap="wrap">
            {annotation.label && (
              <Badge size="xs" variant="surface">
                {annotation.label}
              </Badge>
            )}
            {annotation.author_name && (
              <Text textStyle="xs" color="fg.muted">
                {annotation.author_name}
              </Text>
            )}
            <Text
              textStyle="xs"
              color="fg.subtle"
              title={formatDateTime(annotation.created_at) ?? undefined}
            >
              {formatRelativeTime(annotation.created_at)}
            </Text>
          </Group>
        </Stack>
      </Stack>
    </NavLink>
  );
}
