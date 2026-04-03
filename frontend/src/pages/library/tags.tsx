import {
  deleteTagMutation,
  listTagsOptions,
  updateTagMutation,
} from "@/api/@tanstack/react-query.gen";
import type { TagDetailResponse } from "@/api/types.gen";
import { parseAPIError } from "@/common/error";
import { GenericIconButton } from "@/components/ui/button";
import { FormError } from "@/components/ui/error";
import { QueryView } from "@/components/ui/feedback";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/model";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/ui/toaster";
import { PaletteColors } from "@/config/theme";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import {
  Badge,
  Box,
  Card,
  ColorPicker,
  Field,
  Group,
  Heading,
  Input,
  Menu,
  Portal,
  SimpleGrid,
  Stack,
  Text,
  parseColor,
} from "@chakra-ui/react";
import { useCallback, useMemo, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { LuCheck, LuFile, LuTag } from "react-icons/lu";
import { Empty } from "./shared/common";
import { SearchTag } from "./shared/file";

export function TagsPage() {
  const query = useAPIQuery({
    ...listTagsOptions(),
  });

  return (
    <QueryView query={query}>{(data) => <TagsView tags={data} />}</QueryView>
  );
}

function TagsView({ tags }: { tags: TagDetailResponse[] }) {
  return (
    <Stack gap={6}>
      <Heading size="3xl" fontWeight="normal">
        Tags
      </Heading>

      {tags.length === 0 && (
        <Empty
          icon={<LuTag />}
          title="No tags available. Tags will appear here when you add them to files."
        />
      )}

      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="4">
        {tags.map((tag) => (
          <TagCard key={tag.id} tag={tag} />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function TagCard({ tag }: { tag: TagDetailResponse }) {
  return (
    <Card.Root
      variant="outline"
      cursor="pointer"
      _hover={{ backgroundColor: "bg.muted" }}
      transition="all 0.15s"
    >
      <Card.Body p="4">
        <Stack gap="3">
          <Group align="center" justify="space-between">
            <Group>
              <Box color={`${tag.color}.500`}>
                <LuTag size={16} />
              </Box>
              <SearchTag tag={tag} />
            </Group>
            <TagActions tag={tag} />
          </Group>
          <Group gap="1" color="fg.muted" textStyle="xs">
            <LuFile size={12} />
            <Text>
              {tag.file_count} {tag.file_count === 1 ? "file" : "files"}
            </Text>
          </Group>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

type TagDialog = "edit" | "delete" | null;

function TagActions({ tag }: { tag: TagDetailResponse }) {
  const [dialog, setDialog] = useState<TagDialog>(null);

  return (
    <>
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
            <Menu.Content>
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
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>

      <EditTagDialog
        open={dialog === "edit"}
        onClose={() => setDialog(null)}
        tag={tag}
      />

      <DeleteTagDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        id={tag.id}
      />
    </>
  );
}

const tagColors = PaletteColors.map((color) => color.value);

function EditTagDialog(props: {
  tag: TagDetailResponse;
  open: boolean;
  onClose: () => void;
}) {
  const { tag, open, onClose } = props;

  const {
    Field: FormField,
    handleSubmit,
    state,
    Subscribe,
    reset,
  } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: tag.name ?? "grey",
        color: tag.color,
      },
    },
    mutationOptions: updateTagMutation,
    onMutate: (value) => ({
      body: {
        name: value.name,
        color: value.color,
      },
      path: {
        id: tag.id,
      },
    }),
    successMessage: "Tag updated successfully",
    onSuccess: onClose,
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const swatchesColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const color of tagColors) {
      colors[parseColor(color).toString("hex")] = color;
    }
    return colors;
  }, []);

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Edit Tag"
      onSubmit={() => handleSubmit()}
      confirmBtnText="Update"
    >
      <Stack gap="4">
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
          name="color"
          children={({ state: fieldState, handleChange }) => (
            <Field.Root invalid={!fieldState.meta.isValid}>
              <ColorPicker.Root
                defaultValue={parseColor(fieldState.value)}
                maxW="200px"
                onValueChange={(e) => {
                  const colorName =
                    swatchesColors?.[e.value.toString("hex")] ?? "grey";
                  handleChange(colorName);
                }}
                positioning={{ placement: "top" }}
              >
                <ColorPicker.HiddenInput />
                <ColorPicker.Label>Color</ColorPicker.Label>
                <ColorPicker.Control>
                  <ColorPicker.Trigger />
                </ColorPicker.Control>

                <ColorPicker.Positioner>
                  <ColorPicker.Content>
                    <ColorPicker.SwatchGroup>
                      {Object.keys(swatchesColors).map((item) => (
                        <ColorPicker.SwatchTrigger key={item} value={item}>
                          <ColorPicker.Swatch boxSize="7" value={item}>
                            <ColorPicker.SwatchIndicator>
                              <LuCheck />
                            </ColorPicker.SwatchIndicator>
                          </ColorPicker.Swatch>
                        </ColorPicker.SwatchTrigger>
                      ))}
                    </ColorPicker.SwatchGroup>
                  </ColorPicker.Content>
                </ColorPicker.Positioner>
              </ColorPicker.Root>
              <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
            </Field.Root>
          )}
        />
        <FormError errors={state.errorMap.onSubmit} />

        <Group gap="2" align="center">
          <Text textStyle="sm" color="fg.muted">
            Preview:
          </Text>
          <Subscribe
            selector={(state) => state.values}
            children={(state) => {
              return (
                <Badge colorPalette={state.color} variant="subtle" size="sm">
                  {state.name || "Tag"}
                </Badge>
              );
            }}
          />
        </Group>
      </Stack>
    </FormModal>
  );
}

function DeleteTagDialog(props: {
  open: boolean;
  onClose: () => void;
  id: string;
}) {
  const { open, onClose, id: fileId } = props;

  const { mutate: deleteRequest } = useAPIMutation({
    ...deleteTagMutation(),
    onSuccess() {
      showSuccessNotification(`Tag deleted successfully`);
      onClose();
    },
    onError(error) {
      showErrorNotification(
        "Tag deletion failed",
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
      This action cannot be undone. This will permanently delete this tag.
    </ConfirmModal>
  );
}
