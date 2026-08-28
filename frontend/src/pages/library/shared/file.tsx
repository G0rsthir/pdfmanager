import {
  deleteFileMutation,
  listCollectionsOptions,
  patchFileStateMutation,
} from "@/api/@tanstack/react-query.gen";
import type { FileResponse, TagResponse } from "@/api/types.gen";
import { FileStatusEnum } from "@/api/types.gen";
import { parseAPIError } from "@/common/error";
import { formatDateTime, formatRelativeTime } from "@/common/format";
import { GenericIconButton } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/ui/toaster";
import { useFileThumbnail } from "@/hooks/asset";
import { useFileClickAction } from "@/hooks/layout";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import { useSearchParamMulti } from "@/hooks/url";
import {
  Badge,
  Box,
  Card,
  Combobox,
  createListCollection,
  Field,
  Grid,
  GridItem,
  Group,
  HStack,
  Icon,
  Image,
  Menu,
  Portal,
  RadioCard,
  Select,
  Skeleton,
  Span,
  Stack,
  Table,
  Text,
  useCombobox,
  useFilter,
  useListCollection,
  useSelectContext,
} from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  LuBookmark,
  LuBookOpen,
  LuCircleCheck,
  LuCircleDashed,
  LuCircleX,
  LuFileText,
  LuInfo,
  LuPause,
  LuStar,
} from "react-icons/lu";
import { NavLink } from "react-router";
import { toFileDetailsUrl, toFileReaderUrl, toFileUrl } from "./path";

/**
 * What opening a file from a library listing should do
 */
export type FileClickAction = "reader" | "details";

export const DEFAULT_FILE_CLICK_ACTION: FileClickAction = "details";

interface FileFolderSelectProps {
  onValueChange: (values: string) => void;
  defaultValue?: string;
  onBlur: () => void;
  required?: boolean;
  allowedFolderIds?: string[];
}

export function FileFolderSelect(props: FileFolderSelectProps) {
  const {
    onValueChange,
    defaultValue,
    required,
    allowedFolderIds = [],
    onBlur,
  } = props;

  const hydrated = useRef(false);

  const { contains } = useFilter({ sensitivity: "base" });

  const { collection, filter, set } = useListCollection<{
    label: string;
    value: string;
  }>({
    initialItems: [],
    filter: contains,
  });

  const combobox = useCombobox({
    collection,
    onInputValueChange: (e) =>
      filter(
        e.reason === "item-select" || e.reason === undefined
          ? ""
          : e.inputValue,
      ),
    onValueChange: ({ value }) => onValueChange(value[0] || ""),
    openOnClick: true,
    defaultValue: defaultValue ? [defaultValue] : [],
    onInteractOutside: () => onBlur(),
    required: required,
  });

  const query = useAPIQuery({
    ...listCollectionsOptions(),
  });

  useEffect(() => {
    if (query.isSuccess) {
      set(
        query.data
          .filter((item) => item.entity_type == "folder")
          .map((item) => ({
            label: item.name,
            value: item.id,
            disabled: !allowedFolderIds.includes(item.id),
          })),
      );
    }
  }, [query.data, query.isSuccess, set, allowedFolderIds]);

  useEffect(() => {
    if (combobox.value.length && collection.size && !hydrated.current) {
      combobox.syncSelectedItems();
      hydrated.current = true;
    }
  }, [combobox, collection.size]);

  return (
    <Combobox.RootProvider value={combobox}>
      <Combobox.Label>
        Folder {required && <Field.RequiredIndicator />}
      </Combobox.Label>
      <Combobox.Control>
        <Combobox.Input placeholder="Type to search" />
        <Combobox.IndicatorGroup>
          <Combobox.Trigger />
        </Combobox.IndicatorGroup>
      </Combobox.Control>
      <Portal>
        <Combobox.Positioner>
          <Combobox.Content maxH="300px" overflowY="auto">
            <Combobox.Empty>No items found</Combobox.Empty>
            {collection.items.map((item) => (
              <Combobox.Item item={item} key={item.value}>
                {item.label}
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.RootProvider>
  );
}

// Legacy
export function FileRow(props: {
  file: FileResponse;
  includeReadDate?: boolean;
  tagType?: "search" | "filter";
}) {
  const { file, includeReadDate = true, tagType = "search" } = props;

  return (
    <Card.Root
      variant="outline"
      _hover={{ borderColor: "border.emphasized" }}
      transition="border-color 0.2s"
    >
      <Card.Body>
        <Grid templateColumns="auto 1fr auto" templateRows="1fr auto" gap={4}>
          <GridItem>
            <Stack
              align="center"
              justify="center"
              bg="colorPalette.700"
              color="colorPalette.200"
              rounded="md"
              w="12"
              minH="12"
            >
              <LuFileText />
            </Stack>
          </GridItem>
          <GridItem>
            <Stack gap={1}>
              <NavLink
                to={toFileReaderUrl({
                  folderId: file.collection_id,
                  fileId: file.id,
                })}
              >
                <Card.Title
                  _hover={{ color: "colorPalette.fg" }}
                  transition="color 0.2s"
                >
                  {file.name}
                </Card.Title>
              </NavLink>
              {file.description && (
                <Text textStyle="xs" color="fg.muted" truncate>
                  {file.description}
                </Text>
              )}
            </Stack>
          </GridItem>
          <GridItem>
            <Group gap={0}>
              <FavoriteButton file={file} />
              <GenericFileActions file={file} />
            </Group>
          </GridItem>

          <GridItem />
          <GridItem colSpan={2} justifyContent="space-between">
            <Group justifyContent="space-between" grow>
              <Group gap={2}>
                {file.tags?.map((tag) =>
                  tagType == "search" ? (
                    <SearchTag key={tag.id} tag={tag} />
                  ) : (
                    <FilterTag key={tag.id} tag={tag} />
                  ),
                )}
              </Group>
              <Group gap={3} justifyContent="end">
                {includeReadDate && file.state.last_read_at && (
                  <Text
                    textStyle="xs"
                    color="fg.muted"
                    title={new Date(file.state.last_read_at).toLocaleString()}
                  >
                    Read {formatRelativeTime(file.state.last_read_at)}
                  </Text>
                )}
                {file.page_count != null && (
                  <Text textStyle="xs">
                    Page {file.state.current_page} of {file.page_count}
                  </Text>
                )}
              </Group>
            </Group>
          </GridItem>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}

export function FileTable(props: {
  files: FileResponse[];
  includeReadDate?: boolean;
  tagType?: "search" | "filter";
}) {
  const { files, includeReadDate = true, tagType = "search" } = props;

  const [clickAction] = useFileClickAction();

  return (
    <Table.Root size="sm" variant="outline" interactive colorPalette="gray">
      <Table.Header>
        <Table.Row>
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
  includeReadDate?: boolean;
  tagType?: "search" | "filter";
}) {
  const { file, includeReadDate = true, tagType = "search" } = props;

  const [clickAction] = useFileClickAction();

  const fileUrl = toFileUrl({
    folderId: file.collection_id,
    fileId: file.id,
    action: clickAction,
  });

  return (
    <Card.Root
      variant="outline"
      _hover={{ borderColor: "border.emphasized" }}
      transition="border-color 0.2s"
      overflow="hidden"
      size="sm"
    >
      <Card.Body>
        <Grid templateColumns="auto 1fr" gap={5}>
          <GridItem>
            <NavLink to={fileUrl}>
              <FileThumbnail fileId={file.id} height="160px" width="120px" />
            </NavLink>
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

export function SearchTag({ tag }: { tag: TagResponse }) {
  return (
    <NavLink to={`/search?tag=${tag.name}`}>
      <Badge
        key={tag.id}
        size="sm"
        colorPalette={tag.color}
        transition="background 0.15s, color 0.15s"
        _hover={{
          bg: "colorPalette.solid",
          color: "colorPalette.contrast",
        }}
      >
        {tag.name}
      </Badge>
    </NavLink>
  );
}

export function FilterTag({ tag }: { tag: TagResponse }) {
  const [searchParams, setSearchParams] = useSearchParamMulti({
    tag: { type: "array" },
  });

  return (
    <Badge
      onClick={() =>
        setSearchParams({ tag: [...new Set([...searchParams.tag, tag.name])] })
      }
      key={tag.id}
      size="sm"
      colorPalette={tag.color}
      transition="background 0.15s, color 0.15s"
      _hover={{
        bg: "colorPalette.solid",
        color: "colorPalette.contrast",
      }}
    >
      {tag.name}
    </Badge>
  );
}

export function FavoriteButton({ file }: { file: FileResponse }) {
  const { mutate } = useAPIMutation({
    ...patchFileStateMutation(),
    onError(error) {
      showErrorNotification(
        "Favorite update failed",
        parseAPIError(error).message,
      );
    },
  });

  return (
    <GenericIconButton
      variant="ghost"
      size="sm"
      color={file.state.is_favorite ? "yellow.400" : "fg.muted"}
      transition="color 0.2s"
      css={{
        "& svg": { fill: file.state.is_favorite ? "currentColor" : "none" },
        "&:hover": { color: "yellow.400" },
        "&:hover svg": { fill: "currentColor" },
      }}
      onClick={() =>
        mutate({
          body: {
            is_favorite: !file.state.is_favorite,
          },
          path: { id: file.id },
        })
      }
    >
      <LuStar />
    </GenericIconButton>
  );
}

type GenericFileActionDialog = "delete" | null;

export function GenericFileActions(props: { file: FileResponse }) {
  const { file } = props;

  const [dialog, setDialog] = useState<GenericFileActionDialog>(null);

  const target = { folderId: file.collection_id, fileId: file.id };

  return (
    <>
      <GenericFileActionsMenu>
        <Menu.Item value="details" asChild>
          <NavLink to={toFileDetailsUrl(target)}>Details</NavLink>
        </Menu.Item>
        <Menu.Item
          value="edit"
          asChild
          disabled={file.is_read_only_by_current_user}
        >
          <NavLink to={toFileDetailsUrl({ ...target, tab: "edit" })}>
            Edit
          </NavLink>
        </Menu.Item>
        <Menu.Item
          value="delete"
          color="fg.error"
          _hover={{ bg: "bg.error", color: "fg.error" }}
          onSelect={() => setDialog("delete")}
          disabled={file.is_read_only_by_current_user}
        >
          Delete
        </Menu.Item>
      </GenericFileActionsMenu>

      <DeleteFileDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        id={file.id}
      />
    </>
  );
}

export function GenericFileActionsMenu({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <GenericIconButton
          variant="ghost"
          size="sm"
          onClick={(e) => e.stopPropagation()}
        >
          <BsThreeDotsVertical />
        </GenericIconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>{children}</Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

export function DeleteFileDialog(props: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  id: string;
}) {
  const { open, onClose, onSuccess, id: fileId } = props;

  const { mutate: deleteRequest } = useAPIMutation({
    ...deleteFileMutation(),
    onSuccess() {
      showSuccessNotification(`File deleted successfully`);
      onClose();
      onSuccess?.();
    },
    onError(error) {
      showErrorNotification(
        "File deletion failed",
        parseAPIError(error).message,
      );
    },
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => deleteRequest({ path: { id: fileId } })}
      confirmBtnText="Delete"
      confirmBtnPalette="red"
    >
      This action cannot be undone. This will permanently delete this file.
    </ConfirmModal>
  );
}

interface StatusMeta {
  label: string;
  palette: string;
  icon: React.ReactNode;
}

const STATUS_META: Record<FileStatusEnum, StatusMeta> = {
  unread: { label: "Unread", palette: "gray", icon: <LuCircleDashed /> },
  want_to_read: {
    label: "Want to read",
    palette: "purple",
    icon: <LuBookmark />,
  },
  reading: { label: "Reading", palette: "blue", icon: <LuBookOpen /> },
  on_hold: { label: "On hold", palette: "orange", icon: <LuPause /> },
  read: { label: "Read", palette: "green", icon: <LuCircleCheck /> },
  dropped: { label: "Dropped", palette: "red", icon: <LuCircleX /> },
};

const STATUS_ORDER: FileStatusEnum[] = [
  FileStatusEnum.UNREAD,
  FileStatusEnum.WANT_TO_READ,
  FileStatusEnum.READING,
  FileStatusEnum.ON_HOLD,
  FileStatusEnum.READ,
  FileStatusEnum.DROPPED,
];

const statusCollection = createListCollection({
  items: STATUS_ORDER.map((status) => ({
    value: status,
    label: STATUS_META[status].label,
  })),
});

export function ReadingStatusSelect({ file }: { file: FileResponse }) {
  const { mutate } = useAPIMutation({
    ...patchFileStateMutation(),
    onError(error) {
      showErrorNotification(
        "Status update failed",
        parseAPIError(error).message,
      );
    },
  });

  return (
    <Select.Root
      collection={statusCollection}
      size="xs"
      width="150px"
      positioning={{ sameWidth: true }}
      value={[file.state.status]}
      onValueChange={({ value }) => {
        const next = value[0] as FileStatusEnum | undefined;
        if (!next || next == file.state.status) return;
        mutate({ body: { status: next }, path: { id: file.id } });
      }}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <SelectedStatusValue />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
            {statusCollection.items.map((item) => (
              <Select.Item item={item} key={item.value}>
                <StatusOption status={item.value} />
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}

function SelectedStatusValue() {
  const select = useSelectContext();
  const selected = select.selectedItems.at(0) as
    | { value: FileStatusEnum }
    | undefined;

  if (!selected) return <Select.ValueText placeholder="Select status" />;

  return (
    <Select.ValueText>
      <StatusOption status={selected.value} />
    </Select.ValueText>
  );
}

function StatusOption({ status }: { status: FileStatusEnum }) {
  const meta = STATUS_META[status];

  return (
    <Span
      display="flex"
      alignItems="center"
      gap={2}
      colorPalette={meta.palette}
    >
      <Icon color="colorPalette.fg">{meta.icon}</Icon>
      <Text color="colorPalette.fg">{meta.label}</Text>
    </Span>
  );
}

interface FileClickActionOption {
  value: FileClickAction;
  label: string;
  icon: React.ReactNode;
}

const FILE_CLICK_ACTIONS: FileClickActionOption[] = [
  { value: "reader", label: "Reader", icon: <LuBookOpen /> },
  { value: "details", label: "Details", icon: <LuInfo /> },
];

export function FileClickActionRadioCards(props: {
  value: FileClickAction;
  onChange: (value: FileClickAction) => void;
}) {
  const { value, onChange } = props;

  return (
    <RadioCard.Root
      value={value}
      onValueChange={({ value: next }) =>
        next && onChange(next as FileClickAction)
      }
      orientation="horizontal"
      maxW="sm"
    >
      <HStack align="stretch">
        {FILE_CLICK_ACTIONS.map((option) => (
          <RadioCard.Item
            key={option.value}
            value={option.value}
            cursor="pointer"
          >
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <Icon fontSize="xl" color="fg.subtle">
                {option.icon}
              </Icon>
              <RadioCard.ItemText>{option.label}</RadioCard.ItemText>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RadioCard.Item>
        ))}
      </HStack>
    </RadioCard.Root>
  );
}
