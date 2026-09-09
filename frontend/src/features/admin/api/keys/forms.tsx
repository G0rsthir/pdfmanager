import {
  createApiKeyMutation,
  revokeApiKeyMutation,
} from "@/api/@tanstack/react-query.gen";
import { AccessScope } from "@/api/types.gen";
import { expiryDatePresets } from "@/common/format";
import { ExpiryDateSelect } from "@/components/ui/date";
import { SubscribeFormError } from "@/components/ui/form/fields";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import { UserSelect } from "@/features/admin/identity/users/selects";
import { ApiKeyResultDialog } from "@/features/apiKeys/dialogs";
import { ScopeSelect } from "@/features/apiKeys/selects";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation } from "@/hooks/query";
import { Field, Input } from "@chakra-ui/react";
import { getLocalTimeZone, type DateValue } from "@internationalized/date";

export function CreateApiKeyDialog(props: {
  open: boolean;
  onClose: () => void;
  readonly?: boolean;
}) {
  const { open, readonly, onClose } = props;

  const { form, mutation } = useFormMutation({
    formOptions: {
      defaultValues: {
        description: "",
        user_id: "",
        expires_at: [] as DateValue[],
        scopes: [] as AccessScope[],
      },
    },
    mutationOptions: createApiKeyMutation,
    onMutate: (value) => ({
      body: {
        ...value,
        expires_at: value.expires_at?.[0].toDate(getLocalTimeZone()),
      },
    }),
    successNotification: "API Key created",
  });

  const handleClose = () => {
    form.reset();
    onClose();
    mutation.reset();
  };

  if (mutation.isSuccess)
    return (
      <ApiKeyResultDialog
        open={open}
        onClose={handleClose}
        data={mutation.data}
      />
    );

  return (
    <FormModal
      open={open}
      close={handleClose}
      title="Create API Key"
      onSubmit={() => form.handleSubmit()}
      confirmBtnText="Create"
      disabled={readonly}
    >
      <form.Field
        name="description"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={readonly}
          >
            <Field.Label>
              Description <Field.RequiredIndicator />
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
        name="user_id"
        validators={{
          onChange: ({ value }) => (!value ? "User is required" : undefined),
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={readonly}
          >
            <Field.Label>
              User <Field.RequiredIndicator />
            </Field.Label>
            <UserSelect
              onValueChange={handleChange}
              onBlur={handleBlur}
              required
              value={fieldState.value}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <form.Field
        name="expires_at"
        validators={{
          onChange: ({ value }) =>
            value.length == 0 ? "Date is required" : undefined,
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={readonly}
          >
            <Field.Label>
              Expiry Date <Field.RequiredIndicator />
            </Field.Label>
            <Field.Context>
              {(ctx) => (
                <ExpiryDateSelect
                  onValueChange={(details) => handleChange(details.value)}
                  onBlur={handleBlur}
                  required
                  value={fieldState.value}
                  invalid={ctx.invalid}
                  disabled={ctx.disabled}
                  presets={expiryDatePresets}
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
      <form.Field
        name="scopes"
        validators={{
          onChange: ({ value }) =>
            !value ? "At least one scope is required" : undefined,
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root
            invalid={!fieldState.meta.isValid}
            required
            disabled={readonly}
          >
            <Field.Label>
              Scopes <Field.RequiredIndicator />
            </Field.Label>
            <ScopeSelect
              onValueChange={handleChange}
              onBlur={handleBlur}
              required
              value={fieldState.value}
            />
            <Field.ErrorText>{fieldState.meta.errors}</Field.ErrorText>
          </Field.Root>
        )}
      />
      <SubscribeFormError form={form} />
    </FormModal>
  );
}

export function RevokeApiKeyDialog(props: {
  open: boolean;
  onClose: () => void;
  keyId: string;
}) {
  const { open, onClose, keyId } = props;

  const { mutate: remokeRequest } = useAPIMutation({
    ...revokeApiKeyMutation(),
    successNotification: "Token revoked successfully",
    errorNotification: "Token revoketion failed",
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => remokeRequest({ path: { id: keyId } })}
      confirmBtnText="Revoke"
      confirmBtnPalette="red"
    >
      This action cannot be undone. This will revoke token
    </ConfirmModal>
  );
}
