import {
  createCollectionMutation,
  deleteCollectionMutation,
  listCollectionMoveTargetsOptions,
  updateCollectionMutation,
} from "@/api/@tanstack/react-query.gen";
import { type CollectionWithDetailsResponse } from "@/api/types.gen";
import { SubscribeFormError } from "@/components/ui/form/fields";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation, useAPIQuery } from "@/hooks/query";
import { Field, Input } from "@chakra-ui/react";
import { CollectionSelect } from "./select";

type PartialCollectionResponse = Omit<CollectionWithDetailsResponse, "owner">;

type CollectionType = PartialCollectionResponse["entity_type"];

function collectionLabel(type: CollectionType) {
  return type == "group" ? "Collection" : "Folder";
}

export function EditCollectionDialog(props: {
  open: boolean;
  onClose: () => void;
  collection: PartialCollectionResponse;
  readonly?: boolean;
}) {
  const { open, onClose, collection, readonly } = props;

  const label = collectionLabel(collection.entity_type);

  const required = collection.entity_type == "folder";

  const moveTargetsQ = useAPIQuery({
    ...listCollectionMoveTargetsOptions({
      path: {
        id: collection.id,
      },
    }),
    enabled: open,
  });

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: collection.name,
        parent_id: collection.parent_id,
      },
    },
    mutationOptions: updateCollectionMutation,
    onMutate: (value) => ({ path: { id: collection.id }, body: value }),
    successNotification: `${label} updated successfully`,
    onSuccess: onClose,
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <FormModal
      open={open}
      close={handleClose}
      title={`Edit ${label}`}
      onSubmit={() => form.handleSubmit()}
      confirmBtnText="Update"
      disabled={readonly}
    >
      <form.Field
        name="name"
        validators={{
          onChange: ({ value }) => (!value ? "Name is required" : undefined),
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={readonly}
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
        name="parent_id"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required={required}
            disabled={readonly}
          >
            <Field.Label>
              Parent {required && <Field.RequiredIndicator />}
            </Field.Label>
            <CollectionSelect
              defaultValue={fieldState.value ?? ""}
              onValueChange={handleChange}
              onBlur={handleBlur}
              allowedCollectionIds={moveTargetsQ.data?.map((c) => c.id)}
              type="group"
            />
            <Field.HelperText>
              Only collections you can write to are selectable
            </Field.HelperText>
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <SubscribeFormError form={form} />
    </FormModal>
  );
}

export function DeleteCollectionDialog(props: {
  type: CollectionType;
  open: boolean;
  onClose: () => void;
  collectionId: string;
  onSuccess?: () => void;
}) {
  const { type, open, onClose, onSuccess, collectionId } = props;

  const label = collectionLabel(type);

  const { mutate: deleteRequest } = useAPIMutation({
    ...deleteCollectionMutation(),
    successNotification: `${label} deleted successfully`,
    errorNotification: `${label} deletion failed`,
    onSuccess() {
      onClose();
      onSuccess?.();
    },
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => deleteRequest({ path: { id: collectionId } })}
      confirmBtnText="Delete"
      confirmBtnPalette="red"
    >
      This action cannot be undone. This will permanently delete this
      {type == "group" ? " and nested collections" : " folder"}.
    </ConfirmModal>
  );
}

export function CreateCollectionDialog(props: {
  type: CollectionType;
  open: boolean;
  onClose: () => void;
  parent_id?: string;
  readonly?: boolean;
}) {
  const { type, open, onClose, parent_id, readonly } = props;

  const label = collectionLabel(type);

  const { form } = useFormMutation({
    formOptions: {
      defaultValues: {
        name: "",
        parent_id: parent_id,
        entity_type: type,
      },
    },
    mutationOptions: createCollectionMutation,
    onMutate: (value) => ({ body: value }),
    successNotification: `${label} created successfully`,
    onSuccess: onClose,
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <FormModal
      open={open}
      close={handleClose}
      title={`New ${label}`}
      onSubmit={() => form.handleSubmit()}
      confirmBtnText="Create"
      disabled={readonly}
      submitOnEnter
    >
      <form.Field
        name="name"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={readonly}
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
      <SubscribeFormError form={form} />
    </FormModal>
  );
}
