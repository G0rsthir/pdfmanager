import type { FileResponse } from "@/api/types.gen";
import { formatDateTime, formatRelativeTime } from "@/common/format";
import { useFileThumbnail } from "@/hooks/asset";
import { useFileClickAction } from "@/hooks/layout";
import {
  Box,
  Card,
  Checkbox,
  Grid,
  GridItem,
  Group,
  Image,
  Skeleton,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { NavLink } from "react-router";
import { FavoriteButton, GenericFileActions } from "./actions";
import { toFileUrl } from "./path";
import { ReadingStatusSelect } from "./status";
import { FilterTag, SearchTag } from "./tags";

export interface FileSelection {
  ids: ReadonlySet<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  setMany: (ids: string[], selected: boolean) => void;
  clear: () => void;
}

interface FileViewProps {
  selection?: FileSelection;
  files: FileResponse[];
  includeReadDate?: boolean;
  tagType?: "search" | "filter";
}

export function FileTable(props: FileViewProps) {
  const {
    files,
    includeReadDate = true,
    tagType = "search",
    selection,
  } = props;

  const [clickAction] = useFileClickAction();

  const indeterminate =
    selection && selection.ids.size > 0 && selection.ids.size < files.length;

  return (
    <Table.Root size="sm" variant="outline" interactive colorPalette="gray">
      <Table.Header>
        <Table.Row>
          {selection && (
            <Table.ColumnHeader w="6">
              <Checkbox.Root
                size="sm"
                mt="0.5"
                checked={
                  indeterminate ? "indeterminate" : selection.ids.size > 0
                }
                onCheckedChange={(changes) =>
                  selection.setMany(
                    files.map((item) => item.id),
                    Boolean(changes.checked),
                  )
                }
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control cursor="pointer" />
              </Checkbox.Root>
            </Table.ColumnHeader>
          )}
          <Table.ColumnHeader>Name</Table.ColumnHeader>
          <Table.ColumnHeader>Tags</Table.ColumnHeader>
          <Table.ColumnHeader>Status</Table.ColumnHeader>
          <Table.ColumnHeader>Progress</Table.ColumnHeader>
          {includeReadDate && <Table.ColumnHeader>Read</Table.ColumnHeader>}
          <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {files.map((file) => (
          <Table.Row key={file.id}>
            {selection && (
              <Table.Cell>
                <Checkbox.Root
                  size="sm"
                  mt="0.5"
                  checked={selection.isSelected(file.id)}
                  onCheckedChange={() => selection.toggle(file.id)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control cursor="pointer" />
                </Checkbox.Root>
              </Table.Cell>
            )}
            <Table.Cell>
              <Group gap={3}>
                <FileThumbnail fileId={file.id} height="32px" width="24px" />
                <Stack gap={0}>
                  <NavLink
                    to={toFileUrl({
                      folderId: file.collection_id,
                      fileId: file.id,
                      action: clickAction,
                    })}
                  >
                    <Text
                      truncate
                      fontWeight="medium"
                      _hover={{ color: "accent.fg" }}
                      transition="color 0.2s"
                    >
                      {file.name}
                    </Text>
                  </NavLink>
                  {file.description && (
                    <Text textStyle="xs" color="fg.muted" truncate>
                      {file.description}
                    </Text>
                  )}
                </Stack>
              </Group>
            </Table.Cell>
            <Table.Cell>
              <Group gap={1} wrap="wrap">
                {file.tags?.map((tag) =>
                  tagType == "search" ? (
                    <SearchTag key={tag.id} tag={tag} />
                  ) : (
                    <FilterTag key={tag.id} tag={tag} />
                  ),
                )}
              </Group>
            </Table.Cell>
            <Table.Cell>
              <ReadingStatusSelect file={file} />
            </Table.Cell>
            <Table.Cell whiteSpace="nowrap" color="fg.muted">
              {file.page_count != null &&
                `${file.state.current_page} / ${file.page_count}`}
            </Table.Cell>
            {includeReadDate && (
              <Table.Cell whiteSpace="nowrap" color="fg.muted">
                {file.state.last_read_at && (
                  <Text
                    textStyle="xs"
                    title={new Date(file.state.last_read_at).toLocaleString()}
                  >
                    {formatRelativeTime(file.state.last_read_at)}
                  </Text>
                )}
              </Table.Cell>
            )}
            <Table.Cell textAlign="end">
              <Group gap={0} justify="end">
                <FavoriteButton file={file} />
                <GenericFileActions file={file} />
              </Group>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

export function FileCard(props: {
  file: FileResponse;
  selection?: FileSelection;
  includeReadDate?: boolean;
  tagType?: "search" | "filter";
}) {
  const { file, selection, includeReadDate = true, tagType = "search" } = props;

  const [clickAction] = useFileClickAction();

  const fileUrl = toFileUrl({
    folderId: file.collection_id,
    fileId: file.id,
    action: clickAction,
  });

  const selected = selection?.isSelected(file.id) ?? false;

  return (
    <Card.Root
      className="group"
      variant="outline"
      borderColor={selected ? "colorPalette.solid" : undefined}
      _hover={{
        borderColor: selected ? "colorPalette.solid" : "border.emphasized",
      }}
      transition="border-color 0.2s"
      overflow="hidden"
      size="sm"
    >
      <Card.Body>
        <Grid templateColumns="auto 1fr" gap={5}>
          <GridItem position="relative">
            <NavLink to={fileUrl}>
              <FileThumbnail fileId={file.id} height="160px" width="120px" />
            </NavLink>
            {selection && (
              <CardSelectCheckbox selection={selection} fileId={file.id} />
            )}
          </GridItem>

          <GridItem minW={0}>
            <Stack gap={2} h="full">
              <Group>
                <ReadingStatusSelect file={file} />
                <Group gap={0} ms="auto">
                  <FavoriteButton file={file} />
                  <GenericFileActions file={file} />
                </Group>
              </Group>

              <NavLink to={fileUrl}>
                <Card.Title
                  lineClamp={1}
                  _hover={{ color: "colorPalette.fg" }}
                  transition="color 0.2s"
                >
                  {file.name}
                </Card.Title>
              </NavLink>

              <Text textStyle="sm" color="fg.muted" lineClamp={1}>
                {file.description}
              </Text>

              {file.tags && file.tags.length > 0 && (
                <Group gap={2} overflow="auto" h="2.0rem" align="start">
                  {file.tags.map((tag) =>
                    tagType == "search" ? (
                      <SearchTag key={tag.id} tag={tag} />
                    ) : (
                      <FilterTag key={tag.id} tag={tag} />
                    ),
                  )}
                </Group>
              )}
              <Group gap={3} justify="end" mt="auto">
                {includeReadDate && file.state.last_read_at && (
                  <Text
                    textStyle="xs"
                    color="fg.muted"
                    title={formatDateTime(file.state.last_read_at) ?? undefined}
                  >
                    Read {formatRelativeTime(file.state.last_read_at)}
                  </Text>
                )}
                <Text textStyle="xs" ms="auto">
                  Page {file.state.current_page} of {file.page_count}
                </Text>
              </Group>
            </Stack>
          </GridItem>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}

function CardSelectCheckbox(props: {
  selection: FileSelection;
  fileId: string;
}) {
  const { selection, fileId } = props;

  const selected = selection.isSelected(fileId);
  const pinned = selected || selection.ids.size > 0;

  return (
    <Box
      position="absolute"
      top="2"
      left="2"
      opacity={pinned ? 1 : 0}
      _groupHover={{ opacity: 1 }}
      css={{ "@media (hover: none)": { opacity: 1 } }}
      transition="opacity 0.15s"
    >
      <Checkbox.Root
        size="sm"
        checked={selected}
        onCheckedChange={() => selection.toggle(fileId)}
        rounded="sm"
        colorPalette="gray"
        variant="subtle"
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control cursor="pointer" />
      </Checkbox.Root>
    </Box>
  );
}

export function FileThumbnail(props: {
  fileId: string;
  width: string;
  height: string;
}) {
  const { fileId, width, height } = props;

  const thumbSrc = useFileThumbnail(fileId);

  return (
    <Box width={width} height={height}>
      {thumbSrc ? (
        <Image
          src={thumbSrc}
          rounded="md"
          width="full"
          height="full"
          objectFit="cover"
        />
      ) : (
        <Skeleton height={height} />
      )}
    </Box>
  );
}
