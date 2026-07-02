import {
  deleteFileMutation,
  listAuthorsOptions,
  listCollectionsOptions,
  listFileMoveTargetsOptions,
  listTagsOptions,
  patchFileStateMutation,
  updateFileMutation,
} from "@/api/@tanstack/react-query.gen";
import type { FileResponse, TagResponse } from "@/api/types.gen";
import { formatRelativeTime } from "@/common/date";
import { parseAPIError } from "@/common/error";
import { GenericIconButton } from "@/components/ui/button";
import { FormError } from "@/components/ui/error";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/ui/toaster";
import { useFileThumbnail } from "@/hooks/asset";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import { useSearchParamMulti } from "@/hooks/url";
import { TokensInput } from "@/pages/shared/input";
import { DateSelect } from "@/pages/shared/selects";
import {
  Badge,
  Box,
  Card,
  Combobox,
  Field,
  Grid,
  GridItem,
  Group,
  Image,
  Input,
  Menu,
  parseDate,
  Portal,
  Skeleton,
  Stack,
  Tabs,
  Text,
  useCombobox,
  useFilter,
  useListCollection,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { LuFileText, LuStar } from "react-icons/lu";
import { NavLink } from "react-router";
import { toFileUrl } from "./path";

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
                to={toFileUrl({
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
              <FileCardActions file={file} />
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

export function FileCard(props: {
  file: FileResponse;
  includeReadDate?: boolean;
  tagType?: "search" | "filter";
}) {
  const { file, includeReadDate = true, tagType = "search" } = props;

  const fileUrl = toFileUrl({
    folderId: file.collection_id,
    fileId: file.id,
  });

  const thumbSrc = useFileThumbnail(file.id);

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
              <Box width="120px" height="160px">
                {thumbSrc ? (
                  <Image
                    src={thumbSrc}
                    rounded="md"
                    width="full"
                    height="full"
                    objectFit="cover"
                  />
                ) : (
                  <Skeleton height="160px" />
                )}
              </Box>
            </NavLink>
          </GridItem>

          <GridItem minW={0}>
            <Stack gap={2} h="full">
              <Group>
                {includeReadDate && file.state.last_read_at && (
                  <Text
                    textStyle="xs"
                    color="fg.muted"
                    title={new Date(file.state.last_read_at).toLocaleString()}
                  >
                    Read {formatRelativeTime(file.state.last_read_at)}
                  </Text>
                )}
                <Group gap={0} ms="auto">
                  <FavoriteButton file={file} />
                  <FileCardActions file={file} />
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
                {file.page_count != null && (
                  <Text textStyle="xs" ms="auto">
                    Page {file.state.current_page} of {file.page_count}
                  </Text>
                )}
              </Group>
            </Stack>
          </GridItem>
        </Grid>
      </Card.Body>
    </Card.Root>
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

type FileDialog = "edit" | "delete" | null;

export function FileCardActions(props: { file: FileResponse }) {
  const { file } = props;

  const [dialog, setDialog] = useState<FileDialog>(null);

  return (
    <>
      <FileCardActionsMenu>
        <Menu.Item value="edit" onClick={() => setDialog("edit")}>
          Edit
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
      </FileCardActionsMenu>

      <EditFileDialog
        open={dialog === "edit"}
        onClose={() => setDialog(null)}
        file={file}
      />

      <DeleteFileDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        id={file.id}
      />
    </>
  );
}

function FileCardActionsMenu({ children }: { children: React.ReactNode }) {
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

function EditFileDialog(props: {
  open: boolean;
  onClose: () => void;
  file: FileResponse;
}) {
  const { open, onClose, file } = props;

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: file.name,
        collection_id: file.collection_id ?? "",
        description: file.description ?? "",
        tags: file.tags?.map((item) => item.name),
        authors: file.authors?.map((item) => item.name),
        published: file.published
          ? [parseDate(file.published.toISOString().slice(0, 10))]
          : undefined,
      },
    },
    mutationOptions: updateFileMutation,
    onMutate: (value) => ({
      body: {
        ...value,
        published: value.published?.[0]?.toDate("UTC"),
      },
      path: { id: file.id },
    }),
    successMessage: "File updated successfully",
    onSuccess: onClose,
  });

  const moveTargetsQ = useAPIQuery({
    ...listFileMoveTargetsOptions({
      path: {
        id: file.id,
      },
    }),
    enabled: open,
  });

  const handleClose = useCallback(() => {
    form.reset();
    onClose();
  }, [onClose, form]);

  const listTagsQ = useAPIQuery({
    ...listTagsOptions(),
  });

  const listAuthorsQ = useAPIQuery({
    ...listAuthorsOptions(),
  });

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Edit file"
      onSubmit={() => form.handleSubmit()}
      confirmBtnText="Update"
      disabled={file.is_read_only_by_current_user}
    >
      <Tabs.Root defaultValue="details" variant="line">
        <Tabs.List mb={1}>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="metadata">Metadata</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="details" px={0}>
          <Stack gap={4}>
            <form.Field
              name="name"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root
                  invalid={!fieldState.meta.isValid}
                  required
                  disabled={file.is_read_only_by_current_user}
                >
                  <Field.Label>
                    Name <Field.RequiredIndicator />
                  </Field.Label>
                  <Input
                    value={fieldState.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
            />
            <form.Field
              name="description"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root
                  invalid={!fieldState.meta.isValid}
                  disabled={file.is_read_only_by_current_user}
                >
                  <Field.Label>Description</Field.Label>
                  <Input
                    value={fieldState.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
            />
            <form.Field
              name="collection_id"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Folder is required" : undefined,
              }}
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root
                  invalid={!fieldState.meta.isValid}
                  required
                  disabled={file.is_read_only_by_current_user}
                >
                  <FileFolderSelect
                    defaultValue={fieldState.value ?? ""}
                    allowedFolderIds={moveTargetsQ.data?.map((c) => c.id)}
                    onValueChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
            />
            <form.Field
              name="tags"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root
                  invalid={!fieldState.meta.isValid}
                  disabled={file.is_read_only_by_current_user}
                >
                  <Field.Label>Tags</Field.Label>
                  <TokensInput
                    defaultValue={fieldState.value ?? []}
                    onValueChange={handleChange}
                    onBlur={handleBlur}
                    suggestions={listTagsQ.data?.map((item) => item.name)}
                    description="Press Enter or Return to add tag"
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
            />
          </Stack>
        </Tabs.Content>

        <Tabs.Content value="metadata" px={0}>
          <Stack gap={4}>
            <form.Field
              name="authors"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root
                  invalid={!fieldState.meta.isValid}
                  disabled={file.is_read_only_by_current_user}
                >
                  <Field.Label>Authors</Field.Label>
                  <TokensInput
                    defaultValue={fieldState.value ?? []}
                    onValueChange={handleChange}
                    onBlur={handleBlur}
                    description="Press Enter or Return to add author"
                    suggestions={listAuthorsQ.data?.map((item) => item.name)}
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
            />
            <form.Field
              name="published"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root
                  invalid={!fieldState.meta.isValid}
                  disabled={file.is_read_only_by_current_user}
                >
                  <Field.Label>Published</Field.Label>
                  <Field.Context>
                    {(ctx) => (
                      <DateSelect
                        onValueChange={(details) => handleChange(details.value)}
                        onBlur={handleBlur}
                        required
                        value={fieldState.value}
                        invalid={ctx.invalid}
                        ids={{
                          label: () => ctx.ids.label,
                          input: () => ctx.ids.control,
                        }}
                      />
                    )}
                  </Field.Context>
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
            />
          </Stack>
        </Tabs.Content>
      </Tabs.Root>

      <FormError errors={form.state.errorMap.onSubmit} />
    </FormModal>
  );
}

function DeleteFileDialog(props: {
  open: boolean;
  onClose: () => void;
  id: string;
}) {
  const { open, onClose, id: fileId } = props;

  const { mutate: deleteRequest } = useAPIMutation({
    ...deleteFileMutation(),
    onSuccess() {
      showSuccessNotification(`File deleted successfully`);
      onClose();
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
