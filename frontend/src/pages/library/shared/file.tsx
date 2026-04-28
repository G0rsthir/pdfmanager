import {
  deleteFileMutation,
  listCollectionsOptions,
  listTagsOptions,
  patchFileStateMutation,
  updateFileMutation,
} from "@/api/@tanstack/react-query.gen";
import type { FileResponse, TagResponse } from "@/api/types.gen";
import { parseAPIError } from "@/common/error";
import { GenericIconButton } from "@/components/ui/button";
import { FormError } from "@/components/ui/error";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/ui/toaster";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import {
  Badge,
  Card,
  Combobox,
  Field,
  Grid,
  GridItem,
  Group,
  Input,
  Menu,
  Portal,
  Span,
  Stack,
  TagsInput,
  Text,
  useCombobox,
  useFilter,
  useListCollection,
  useTagsInput,
} from "@chakra-ui/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { LuFileText, LuStar } from "react-icons/lu";
import { NavLink } from "react-router";
import { toFileUrl } from "./path";

interface FileTagsInputProps {
  onValueChange: (values: string[]) => void;
  defaultValue: string[];
  onBlur: () => void;
}

export function FileTagsInput(props: FileTagsInputProps) {
  const { contains } = useFilter({ sensitivity: "base" });

  const { collection, filter, set } = useListCollection<string>({
    initialItems: [],
    filter: contains,
  });

  const query = useAPIQuery({
    ...listTagsOptions(),
  });

  useEffect(() => {
    if (query.isSuccess) set(query.data.map((item) => item.name));
  }, [query.data, query.isSuccess, set]);

  const uid = useId();
  const controlRef = useRef<HTMLDivElement | null>(null);

  const tags = useTagsInput({
    ids: { input: `input_${uid}`, control: `control_${uid}` },
    defaultValue: props.defaultValue,
    onValueChange(details) {
      props.onValueChange(details.value);
    },
  });

  const comobobox = useCombobox({
    ids: { input: `input_${uid}`, control: `control_${uid}` },
    collection,
    onInputValueChange(e) {
      filter(e.inputValue);
    },
    value: [],
    allowCustomValue: true,
    onValueChange: (e) => tags.addValue(e.value[0]),
    selectionBehavior: "clear",
    openOnClick: true,
  });

  return (
    <Combobox.RootProvider value={comobobox}>
      <TagsInput.RootProvider value={tags}>
        <TagsInput.Label>Tags</TagsInput.Label>

        <TagsInput.Control ref={controlRef} bg="bg.subtle">
          {tags.value.map((tag, index) => (
            <TagsInput.Item key={index} index={index} value={tag}>
              <TagsInput.ItemPreview>
                <TagsInput.ItemText>{tag}</TagsInput.ItemText>
                <TagsInput.ItemDeleteTrigger />
              </TagsInput.ItemPreview>
            </TagsInput.Item>
          ))}

          <Combobox.Input unstyled asChild>
            <TagsInput.Input
              placeholder="Add or create tag..."
              onBlur={props.onBlur}
            />
          </Combobox.Input>
        </TagsInput.Control>
        <Span textStyle="xs" color="fg.muted" ms="auto">
          Press Enter or Return to add tag
        </Span>
        <Combobox.Positioner>
          <Combobox.Content maxH="300px" overflowY="auto">
            {collection.items.map((item) => (
              <Combobox.Item item={item} key={item}>
                <Combobox.ItemText>{item}</Combobox.ItemText>
                <Combobox.ItemIndicator />
              </Combobox.Item>
            ))}
          </Combobox.Content>
        </Combobox.Positioner>
      </TagsInput.RootProvider>
    </Combobox.RootProvider>
  );
}

interface FileFolderSelectProps {
  onValueChange: (values: string) => void;
  defaultValue?: string;
  onBlur: () => void;
  required?: boolean;
}

export function FileFolderSelect(props: FileFolderSelectProps) {
  const { onValueChange, defaultValue, required, onBlur } = props;

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
          })),
      );
    }
  }, [query.data, query.isSuccess, set]);

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

export function FileCard({ file }: { file: FileResponse }) {
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
                {file.tags?.map((tag) => (
                  <SearchTag key={tag.id} tag={tag} />
                ))}
              </Group>
              <Group gap={3} justifyContent="end">
                {file.page_count != null && (
                  <Text textStyle="xs">
                    {file.state.current_page} / {file.page_count} pages
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

export function FileCardActions({ file }: { file: FileResponse }) {
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
          onClick={() => setDialog("delete")}
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

  const {
    Field: FormField,
    handleSubmit,
    state,
    reset,
  } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: file.name,
        collection_id: file.collection_id ?? "",
        description: file.description ?? "",
        tags: file.tags?.map((item) => item.name),
      },
    },
    mutationOptions: updateFileMutation,
    onMutate: (value) => ({ body: value, path: { id: file.id } }),
    successMessage: "File updated successfully",
    onSuccess: onClose,
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Edit file"
      onSubmit={() => handleSubmit()}
      confirmBtnText="Update"
    >
      <FormField
        name="name"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
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
      <FormField
        name="description"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid}>
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
      <FormField
        name="collection_id"
        validators={{
          onChange: ({ value }) => (!value ? "Folder is required" : undefined),
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
            <FileFolderSelect
              defaultValue={fieldState.value ?? ""}
              onValueChange={handleChange}
              onBlur={handleBlur}
              required
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormField
        name="tags"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid}>
            <FileTagsInput
              defaultValue={fieldState.value ?? []}
              onValueChange={handleChange}
              onBlur={handleBlur}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <FormError errors={state.errorMap.onSubmit} />
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
