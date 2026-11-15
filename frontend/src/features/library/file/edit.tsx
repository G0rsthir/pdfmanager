import {
  listAuthorsOptions,
  listFileMoveTargetsOptions,
  listTagsOptions,
  updateFileMutation,
} from "@/api/@tanstack/react-query.gen";
import {
  ResourcePermissionCapability,
  type FileResponse,
} from "@/api/types.gen";
import { useCan } from "@/common/auth/hooks";
import { DateSelect } from "@/components/ui/date";
import { SectionCard } from "@/components/ui/display";
import { Form } from "@/components/ui/form/container";
import { LabeledField } from "@/components/ui/form/fields";
import { useFormMutation } from "@/hooks/form";
import { useAPIQuery } from "@/hooks/query";
import {
  Alert,
  Button,
  Field,
  Group,
  parseDate,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { LuFileText, LuTags } from "react-icons/lu";
import { CollectionSelectField } from "../collection/select";

const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 255;

export function EditFilePanel({ file }: { file: FileResponse }) {
  const can = useCan(file);
  const canWrite = can(ResourcePermissionCapability.WRITE);

  return <EditFileForm file={file} readOnly={!canWrite} />;
}

function EditFileForm({
  file,
  readOnly,
}: {
  file: FileResponse;
  readOnly?: boolean;
}) {
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
    successNotification: "File updated successfully",
    resetForm: false,
  });

  const moveTargetsQ = useAPIQuery({
    ...listFileMoveTargetsOptions({ path: { id: file.id } }),
  });

  const listTagsQ = useAPIQuery({ ...listTagsOptions() });
  const listAuthorsQ = useAPIQuery({ ...listAuthorsOptions() });

  return (
    <Form onSubmit={() => void form.handleSubmit()}>
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
          <SectionCard
            title="Details"
            description="Name, description and location of the file"
            icon={<LuFileText />}
            colorPalette="blue"
          >
            <form.AppField
              name="name"
              validators={{
                onChange: ({ value }) => {
                  if (!value.trim()) return "Name is required";
                  if (value.length > MAX_NAME_LENGTH)
                    return `Name cannot exceed ${MAX_NAME_LENGTH} characters`;
                },
              }}
              children={(field) => (
                <field.TextField label="Name" required disabled={readOnly} />
              )}
            />

            <form.AppField
              name="description"
              validators={{
                onChange: ({ value }) =>
                  value.length > MAX_DESCRIPTION_LENGTH
                    ? `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`
                    : undefined,
              }}
              children={(field) => (
                <LabeledField
                  label="Description"
                  helperText={`${field.state.value.length} / ${MAX_DESCRIPTION_LENGTH}`}
                  disabled={readOnly}
                >
                  <Textarea
                    rows={3}
                    resize="vertical"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </LabeledField>
              )}
            />

            <form.AppField
              name="collection_id"
              validators={{
                onChange: ({ value }) =>
                  !value ? "Folder is required" : undefined,
              }}
              children={() => (
                <CollectionSelectField
                  label="Folder"
                  helperText="Only folders you can write to are selectable"
                  allowedCollectionIds={moveTargetsQ.data?.map((c) => c.id)}
                  type="folder"
                  required
                  disabled={readOnly}
                />
              )}
            />
          </SectionCard>

          <SectionCard
            title="Metadata"
            description="Tags, authors and publication date"
            icon={<LuTags />}
            colorPalette="purple"
          >
            <form.AppField
              name="tags"
              children={(field) => (
                <field.TokensField
                  label="Tags"
                  suggestions={listTagsQ.data?.map((item) => item.name)}
                  description="Press Enter or Return to add tag"
                  disabled={readOnly}
                />
              )}
            />

            <form.AppField
              name="authors"
              children={(field) => (
                <field.TokensField
                  label="Authors"
                  suggestions={listAuthorsQ.data?.map((item) => item.name)}
                  description="Press Enter or Return to add author"
                  colorPalette="green"
                  disabled={readOnly}
                />
              )}
            />

            <form.AppField
              name="published"
              children={(field) => (
                <LabeledField label="Published" disabled={readOnly}>
                  <Field.Context>
                    {(ctx) => (
                      <DateSelect
                        onValueChange={(details) =>
                          field.handleChange(details.value)
                        }
                        onBlur={field.handleBlur}
                        value={field.state.value}
                        invalid={ctx.invalid}
                        ids={{
                          label: () => ctx.ids.label,
                          input: () => ctx.ids.control,
                        }}
                        disabled={readOnly}
                      />
                    )}
                  </Field.Context>
                </LabeledField>
              )}
            />
          </SectionCard>
        </SimpleGrid>

        <form.AppForm>
          <form.SubscribeFormError />
        </form.AppForm>

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
