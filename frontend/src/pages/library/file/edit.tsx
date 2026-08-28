import {
  listAuthorsOptions,
  listFileMoveTargetsOptions,
  listTagsOptions,
  updateFileMutation,
} from "@/api/@tanstack/react-query.gen";
import type { FileResponse } from "@/api/types.gen";
import { Section } from "@/components/ui/display";
import { FormError } from "@/components/ui/error";
import { Form } from "@/components/ui/form/container";
import { useFormMutation } from "@/hooks/form";
import { useAPIQuery } from "@/hooks/query";
import { TokensInput } from "@/pages/shared/input";
import { DateSelect } from "@/pages/shared/selects";
import {
  Alert,
  Button,
  Field,
  Group,
  Input,
  parseDate,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { FileFolderSelect } from "../shared/file";

const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 255;

export function EditFilePanel({ file }: { file: FileResponse }) {
  return <EditFileForm file={file} />;
}

function EditFileForm({ file }: { file: FileResponse }) {
  const readOnly = file.is_read_only_by_current_user;

  const { form, mutation } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: file.name,
        collection_id: file.collection_id,
        description: file.description ?? "",
        tags: file.tags?.map((item) => item.name) ?? [],
        authors: file.authors?.map((item) => item.name) ?? [],
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
    onSuccess: () => {
      form.reset(form.state.values);
    },
    successMessage: "File updated successfully",
    resetForm: false,
  });

  const moveTargetsQ = useAPIQuery({
    ...listFileMoveTargetsOptions({ path: { id: file.id } }),
  });

  const listTagsQ = useAPIQuery({ ...listTagsOptions() });
  const listAuthorsQ = useAPIQuery({ ...listAuthorsOptions() });

  return (
    <Form onSubmit={form.handleSubmit}>
      <Stack gap={8}>
        {readOnly && (
          <Alert.Root status="info" size="sm">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                You have read-only access to this file, so it cannot be edited
              </Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
          <Section title="Details">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  if (!value.trim()) return "Name is required";
                  if (value.length > MAX_NAME_LENGTH)
                    return `Name cannot exceed ${MAX_NAME_LENGTH} characters`;
                },
              }}
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root
                  invalid={!fieldState.meta.isValid}
                  required
                  disabled={readOnly}
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
              validators={{
                onChange: ({ value }) =>
                  value.length > MAX_DESCRIPTION_LENGTH
                    ? `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`
                    : undefined,
              }}
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root
                  invalid={!fieldState.meta.isValid}
                  disabled={readOnly}
                >
                  <Field.Label>Description</Field.Label>
                  <Textarea
                    rows={3}
                    resize="vertical"
                    value={fieldState.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                  />
                  <Field.HelperText>
                    {fieldState.value.length} / {MAX_DESCRIPTION_LENGTH}
                  </Field.HelperText>
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
                  disabled={readOnly}
                >
                  <FileFolderSelect
                    defaultValue={fieldState.value}
                    allowedFolderIds={moveTargetsQ.data?.map((c) => c.id)}
                    onValueChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  <Field.HelperText>
                    Only folders you can write to are selectable
                  </Field.HelperText>
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
            />
          </Section>

          <Section title="Metadata">
            <form.Field
              name="tags"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root
                  invalid={!fieldState.meta.isValid}
                  disabled={readOnly}
                >
                  <Field.Label>Tags</Field.Label>
                  <TokensInput
                    defaultValue={fieldState.value}
                    onValueChange={handleChange}
                    onBlur={handleBlur}
                    suggestions={listTagsQ.data?.map((item) => item.name)}
                    description="Press Enter or Return to add tag"
                  />
                  <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
                </Field.Root>
              )}
            />

            <form.Field
              name="authors"
              children={({ state: fieldState, handleChange, handleBlur }) => (
                <Field.Root
                  invalid={!fieldState.meta.isValid}
                  disabled={readOnly}
                >
                  <Field.Label>Authors</Field.Label>
                  <TokensInput
                    defaultValue={fieldState.value}
                    onValueChange={handleChange}
                    onBlur={handleBlur}
                    description="Press Enter or Return to add author"
                    suggestions={listAuthorsQ.data?.map((item) => item.name)}
                    colorPalette="green"
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
                  disabled={readOnly}
                >
                  <Field.Label>Published</Field.Label>
                  <Field.Context>
                    {(ctx) => (
                      <DateSelect
                        onValueChange={(details) => handleChange(details.value)}
                        onBlur={handleBlur}
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
          </Section>
        </SimpleGrid>

        <FormError errors={form.state.errorMap.onSubmit} />

        <form.Subscribe
          selector={(state) => [state.isDefaultValue, state.canSubmit]}
        >
          {([isDefaultValue, canSubmit]) => (
            <Group gap={3}>
              <Button
                type="submit"
                size="sm"
                loading={mutation.isPending}
                disabled={readOnly || isDefaultValue || !canSubmit}
              >
                Save changes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => form.reset()}
                disabled={isDefaultValue || mutation.isPending}
              >
                Reset
              </Button>
              {!isDefaultValue && (
                <Text textStyle="xs" color="fg.muted">
                  Unsaved changes
                </Text>
              )}
            </Group>
          )}
        </form.Subscribe>
      </Stack>
    </Form>
  );
}
