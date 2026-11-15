import {
  createApiKeyMutation,
  revokeApiKeyMutation,
} from "@/api/@tanstack/react-query.gen";
import { AccessScope } from "@/api/types.gen";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import { UserSelectField } from "@/features/admin/identity/users/selects";
import { ApiKeyResultDialog } from "@/features/apiKeys/dialogs";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation } from "@/hooks/query";
import { getLocalTimeZone, type DateValue } from "@internationalized/date";

const scopeOptions = Object.values(AccessScope).map((scope) => ({
  value: scope,
  label: scope,
}));

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
      onSubmit={() => void form.handleSubmit()}
      confirmBtnText="Create"
      disabled={readonly}
    >
      <form.AppField
        name="description"
        children={(field) => (
          <field.TextField label="Description" required disabled={readonly} />
        )}
      />
      <form.AppField
        name="user_id"
        validators={{
          onChange: ({ value }) => (!value ? "User is required" : undefined),
        }}
        children={() => (
          <UserSelectField label="User" required disabled={readonly} />
        )}
      />
      <form.AppField
        name="expires_at"
        validators={{
          onChange: ({ value }) =>
            value.length == 0 ? "Date is required" : undefined,
        }}
        children={(field) => (
          <field.ExpiryDateField
            label="Expiry Date"
            required
            disabled={readonly}
          />
        )}
      />
      <form.AppField
        name="scopes"
        validators={{
          onChange: ({ value }) =>
            value.length == 0 ? "At least one scope is required" : undefined,
        }}
        children={(field) => (
          <field.SelectField
            label="Scopes"
            placeholder="Select scopes"
            items={scopeOptions}
            multiple
            required
            disabled={readonly}
          />
        )}
      />
      <form.AppForm>
        <form.SubscribeFormError />
      </form.AppForm>
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
