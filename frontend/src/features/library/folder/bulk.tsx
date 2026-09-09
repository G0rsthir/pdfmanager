import {
  deleteFilesBulkMutation,
  listFileMoveTargetsOptions,
  listTagsOptions,
  patchFilesBulkMutation,
  patchFilesStatesBulkMutation,
} from "@/api/@tanstack/react-query.gen";
import {
  ResourcePermissionCapability,
  type FileResponse,
  type FileStatusEnum,
} from "@/api/types.gen";
import { useCan } from "@/common/auth/hooks";
import { SubscribeFormError } from "@/components/ui/form/fields";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import { TokensInput } from "@/components/ui/tokens";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import { Alert, Field, Text } from "@chakra-ui/react";
import { CollectionSelect } from "../collection/select";
import { StatusSelect } from "../file/status";

function fileCount(count: number) {
  return `${count} ${count == 1 ? "file" : "files"}`;
}

export function MoveFilesDialog(props: {
  open: boolean;
  onClose: () => void;
  files: FileResponse[];
  onMoved?: () => void;
}) {
  const { open, onClose, files, onMoved } = props;

  const targetsQ = useAPIQuery({
    ...listFileMoveTargetsOptions({ path: { id: files?.[0]?.id } }),
    enabled: open,
  });

  const { count, readOnlyCount, canModify } = useFileStatus(
    files,
    ResourcePermissionCapability.WRITE,
  );

  const { form, mutation } = useFormMutation({
    formOptions: {
      defaultValues: {
        ids: files.map((item) => item.id),
        collection_id: "",
      },
    },
    mutationOptions: patchFilesBulkMutation,
    onMutate: (value) => ({
      body: value,
    }),
    onSuccess: onMoved,
    successNotification: `Moved ${count}`,
  });

  return (
    <FormModal
      open={open}
      close={onClose}
      title="Move files"
      confirmBtnText="Move"
      onSubmit={() => form.handleSubmit()}
      isPending={mutation.isPending}
      disabled={!canModify}
    >
      {canModify ? (
        <Text textStyle="sm" color="fg.muted">
          Moving {count} into another folder
        </Text>
      ) : (
        <ReadOnlySelectionAlert
          count={readOnlyCount}
          action="The move applies"
          readonly={!canModify}
        />
      )}

      <form.Field
        name="collection_id"
        validators={{
          onChange: ({ value }) => (!value ? "Folder is required" : undefined),
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={!canModify}
          >
            <Field.Label>
              Folder <Field.RequiredIndicator />
            </Field.Label>
            <CollectionSelect
              defaultValue={fieldState.value}
              allowedCollectionIds={targetsQ.data?.map((folder) => folder.id)}
              onValueChange={handleChange}
              onBlur={handleBlur}
              required
              type="folder"
            />
            <Field.HelperText>
              Only folders you can write to are selectable
            </Field.HelperText>
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <SubscribeFormError form={form} />
    </FormModal>
  );
}

export function TagFilesDialog(props: {
  open: boolean;
  onClose: () => void;
  files: FileResponse[];
  onTagged?: () => void;
}) {
  const { open, onClose, files, onTagged } = props;

  const allTagsQ = useAPIQuery({ ...listTagsOptions(), enabled: open });

  const selectionTags = [
    ...new Set(
      files.flatMap((file) => file.tags?.map((tag) => tag.name) ?? []),
    ),
  ].sort();

  const { count, readOnlyCount, canModify } = useFileStatus(
    files,
    ResourcePermissionCapability.WRITE,
  );

  const { form, mutation } = useFormMutation({
    formOptions: {
      defaultValues: {
        ids: files.map((item) => item.id),
        add: [] as string[],
        remove: [] as string[],
      },
      validators: {
        onSubmit: ({ value }) =>
          value.add.length == 0 && value.remove.length == 0
            ? "Add or remove at least one tag"
            : undefined,
      },
    },
    mutationOptions: patchFilesBulkMutation,
    onMutate: ({ ids, add, remove }) => ({
      body: { ids, tags: { add, remove } },
    }),
    onSuccess: onTagged,
    successNotification: `Updated tags on ${count}`,
  });

  const close = () => {
    onClose();
    form.reset();
  };

  return (
    <FormModal
      open={open}
      close={close}
      title="Tag files"
      confirmBtnText="Apply"
      onSubmit={() => form.handleSubmit()}
      isPending={mutation.isPending}
      disabled={!canModify}
    >
      {canModify ? (
        <Text textStyle="sm" color="fg.muted">
          Adding and removing tags across {count}. Tags each file already has
          are left alone
        </Text>
      ) : (
        <ReadOnlySelectionAlert
          count={readOnlyCount}
          action="The tag changes apply"
          readonly={!canModify}
        />
      )}

      <form.Field
        name="add"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} disabled={!canModify}>
            <Field.Label>Add tags</Field.Label>
            <TokensInput
              defaultValue={fieldState.value}
              onValueChange={handleChange}
              onBlur={handleBlur}
              suggestions={allTagsQ.data?.map((tag) => tag.name)}
              description="Press Enter or Return to add tag"
              colorPalette="green"
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />

      <form.Field
        name="remove"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} disabled={!canModify}>
            <Field.Label>Remove tags</Field.Label>
            <TokensInput
              defaultValue={fieldState.value}
              onValueChange={handleChange}
              onBlur={handleBlur}
              suggestions={selectionTags}
              description="Press Enter or Return to remove tag"
              colorPalette="red"
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />

      <form.Subscribe selector={(state) => state.values}>
        {({ add, remove }) =>
          add.length == 0 && remove.length == 0 ? (
            <Text textStyle="xs" color="fg.subtle">
              Add or remove at least one tag to continue
            </Text>
          ) : null
        }
      </form.Subscribe>

      <SubscribeFormError form={form} />
    </FormModal>
  );
}

export function DeleteFilesDialog(props: {
  open: boolean;
  onClose: () => void;
  files: FileResponse[];
  onSuccess?: () => void;
}) {
  const { open, onClose, onSuccess, files } = props;

  const { count, readOnlyCount, canModify } = useFileStatus(
    files,
    ResourcePermissionCapability.DELETE,
  );

  const { mutate: deleteRequest } = useAPIMutation({
    ...deleteFilesBulkMutation(),
    successNotification: `${count} deleted`,
    errorNotification: "File deletion failed",
    onSuccess: onSuccess,
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() =>
        deleteRequest({ body: { ids: files.map((item) => item.id) } })
      }
      confirmBtnText="Delete"
      confirmBtnPalette="red"
      disabled={!canModify}
    >
      <ReadOnlySelectionAlert
        count={readOnlyCount}
        action="The delete applies"
        readonly={!canModify}
      />
      This action cannot be undone. This will permanently delete {count}
    </ConfirmModal>
  );
}

export function SetStatusFilesDialog(props: {
  open: boolean;
  onClose: () => void;
  files: FileResponse[];
  onSuccess?: () => void;
}) {
  const { open, onClose, files, onSuccess } = props;

  const { canModify, count, readOnlyCount } = useFileStatus(
    files,
    ResourcePermissionCapability.SYNC_PROGRESS,
  );

  const { form, mutation } = useFormMutation({
    formOptions: {
      defaultValues: {
        ids: files.map((item) => item.id),
        status: "" as FileStatusEnum,
      },
    },
    mutationOptions: patchFilesStatesBulkMutation,
    onMutate: (value) => ({
      body: value,
    }),
    onSuccess: onSuccess,
    successNotification: `Updated status on ${count}`,
  });

  const close = () => {
    onClose();
    form.reset();
  };

  return (
    <FormModal
      open={open}
      close={close}
      title="Set reading status"
      confirmBtnText="Apply"
      onSubmit={form.handleSubmit}
      isPending={mutation.isPending}
      disabled={!canModify}
    >
      {canModify ? (
        <Text textStyle="sm" color="fg.muted">
          Setting your reading status on {count}. Progress is per person, so
          this does not affect anyone else
        </Text>
      ) : (
        <ReadOnlySelectionAlert
          count={readOnlyCount}
          action="The status changes apply"
          readonly={!canModify}
        />
      )}

      <form.Field
        name="status"
        validators={{
          onChange: ({ value }) => (!value ? "Field is required" : undefined),
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={!canModify}
          >
            <Field.Label>Status</Field.Label>
            <StatusSelect
              value={fieldState.value}
              onChange={handleChange}
              onBlur={handleBlur}
              size="sm"
              width="full"
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <SubscribeFormError form={form} />
    </FormModal>
  );
}

function ReadOnlySelectionAlert(props: {
  count: number;
  action: string;
  readonly?: boolean;
}) {
  const { count, action, readonly } = props;

  if (count == 0 && !readonly) return null;

  return (
    <Alert.Root status="warning" size="sm">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          {readonly ? (
            "All files in your selection are read-only"
          ) : (
            <>
              {fileCount(count)} in your selection {count == 1 ? "is" : "are"}{" "}
              read-only
            </>
          )}
        </Alert.Title>
        <Alert.Description>
          {action} to every selected file at once, so deselect them to continue
        </Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}

function useFileStatus(
  files: FileResponse[],
  permission: ResourcePermissionCapability,
) {
  const can = useCan(files?.[0]);

  const canExecuteRequest = can(permission);

  const count = fileCount(files.length);

  const readOnlyCount = files.filter(
    (file) => !file.capabilities.includes(permission),
  ).length;

  const canModify = readOnlyCount == 0 && canExecuteRequest;

  return {
    count,
    readOnlyCount,
    canModify,
  };
}
