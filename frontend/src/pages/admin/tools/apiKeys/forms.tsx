import {
  createApiKeyMutation,
  resetApiKeyMutation,
  revokeApiKeyMutation,
} from "@/api/@tanstack/react-query.gen";
import type { ApiKeyCreateResultResponse } from "@/api/types.gen";
import { parseAPIError } from "@/common/error";
import { FormError } from "@/components/ui/error";
import { FormModal } from "@/components/ui/form/modal";
import { ConfirmModal } from "@/components/ui/modal";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@/components/ui/toaster";
import { queryClient } from "@/config/query";
import { useFormMutation } from "@/hooks/form";
import { useAPIMutation } from "@/hooks/query";
import {
  ExpiryDateSelect,
  ScopeSelect,
  UserSelect,
} from "@/pages/shared/selects";
import {
  Alert,
  Button,
  Clipboard,
  Code,
  Dialog,
  Field,
  Input,
  Portal,
  Stack,
} from "@chakra-ui/react";
import {
  getLocalTimeZone,
  today,
  type DateValue,
} from "@internationalized/date";

const t = today(getLocalTimeZone());

const expiryDatePresets: { label: string; value: DateValue[] }[] = [
  { label: "Tomorrow", value: [t.add({ days: 1 })] },
  { label: "Next week", value: [t.add({ weeks: 1 })] },
  { label: "Next month", value: [t.add({ months: 1 })] },
  { label: "In 6 months", value: [t.add({ months: 6 })] },
  { label: "Next year", value: [t.add({ years: 1 })] },
  { label: "In 2 years", value: [t.add({ years: 2 })] },
  { label: "In 3 years", value: [t.add({ years: 3 })] },
];

export function CreateApiKeyDialog(props: {
  open: boolean;
  onClose: () => void;
}) {
  const { open, onClose } = props;

  const { form, mutation } = useFormMutation({
    formOptions: {
      defaultValues: {
        description: "",
        user_id: "",
        expires_at: [] as DateValue[],
        scopes: [] as string[],
      },
    },
    mutationOptions: createApiKeyMutation,
    onMutate: (value) => ({
      body: {
        ...value,
        expires_at: value.expires_at?.[0].toDate(getLocalTimeZone()),
      },
    }),
    successMessage: "API Key created",
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
      confirmBtnType="adminWrite"
    >
      <form.Field
        name="description"
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
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
          <Field.Root invalid={!fieldState.meta.isValid} required>
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
          <Field.Root invalid={!fieldState.meta.isValid} required>
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
          <Field.Root invalid={!fieldState.meta.isValid} required>
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
      <FormError errors={form.state.errorMap.onSubmit} />
    </FormModal>
  );
}

interface ApiKeyResultDialogProps {
  data: ApiKeyCreateResultResponse;
  open: boolean;
  onClose: () => void;
}

export function ApiKeyResultDialog({
  data,
  open,
  onClose,
}: ApiKeyResultDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={() => onClose()}
      closeOnInteractOutside={false}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Token</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Alert.Root status="success">
                  <Alert.Indicator />
                  <Alert.Title>
                    Please copy this key now — you won't be able to view it
                    again.
                  </Alert.Title>
                </Alert.Root>
                <Code colorPalette="gray" style={{ wordBreak: "break-all" }}>
                  {data.token}
                </Code>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" colorPalette="gray">
                  Close
                </Button>
              </Dialog.ActionTrigger>
              <Clipboard.Root value={data.token}>
                <Clipboard.Trigger asChild>
                  <Button variant="surface" size="sm">
                    <Clipboard.Indicator />
                    <Clipboard.CopyText />
                  </Button>
                </Clipboard.Trigger>
              </Clipboard.Root>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
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
    onSuccess() {
      showSuccessNotification("Token revoked successfully");
      onClose();
    },
    onError(error) {
      onClose();
      showErrorNotification(
        "Token revoketion failed",
        parseAPIError(error).message,
      );
    },
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => remokeRequest({ path: { id: keyId } })}
      confirmBtnText="Revoke"
      confirmBtnPalette="red"
      confirmBtnType="adminWrite"
    >
      This action cannot be undone. This will revoke token.
    </ConfirmModal>
  );
}

interface ResetApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  keyId: string;
}

export function ResetApiKeyDialog(props: ResetApiKeyDialogProps) {
  const { keyId, open, onClose } = props;

  const { form, mutation } = useFormMutation({
    formOptions: {
      defaultValues: {
        expires_at: [] as DateValue[],
      },
    },
    mutationOptions: resetApiKeyMutation,
    onMutate: (values) => ({
      body: {
        expires_at: values.expires_at?.[0].toDate(getLocalTimeZone()),
      },
      path: {
        id: keyId,
      },
    }),
    mutationMeta: {
      invalidateQueries: false,
    },
  });

  if (mutation.isSuccess)
    return (
      <ApiKeyResultDialog
        open={open}
        onClose={() => {
          onClose();
          mutation.reset();
          queryClient.invalidateQueries();
        }}
        data={mutation.data}
      />
    );

  return (
    <FormModal
      open={open}
      close={() => {
        form.reset();
        onClose();
      }}
      title="Reset API Key"
      onSubmit={() => form.handleSubmit()}
      confirmBtnText="Reset"
      confirmBtnType="adminWrite"
    >
      Are you sure you want to recreate this token? This will invalidate the
      current one.
      <form.Field
        name="expires_at"
        validators={{
          onChange: ({ value }) =>
            value.length == 0 ? "Date is required" : undefined,
        }}
        children={({ state: fieldState, handleChange, handleBlur }) => (
          <Field.Root invalid={!fieldState.meta.isValid} required>
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
      <FormError errors={form.state.errorMap.onSubmit} />
    </FormModal>
  );
}
