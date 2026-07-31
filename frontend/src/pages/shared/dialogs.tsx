import type {
  ApiKeyCreateResultResponse,
  ApiKeyResetRequest,
  HttpValidationError,
} from "@/api/types.gen";
import { expiryDatePresets } from "@/common/date";
import { FormError } from "@/components/ui/error";
import {
  FormModal,
  type FormModalButtonType,
} from "@/components/ui/form/modal";
import { queryClient } from "@/config/query";
import { useFormMutation } from "@/hooks/form";
import { Field } from "@ark-ui/react";
import {
  Alert,
  Button,
  Clipboard,
  Code,
  Dialog,
  Portal,
  Stack,
} from "@chakra-ui/react";
import { getLocalTimeZone, type DateValue } from "@internationalized/date";
import type { UseMutationOptions } from "@tanstack/react-query";
import { ExpiryDateSelect } from "./selects";

interface ApiKeyResultDialogProps {
  data: ApiKeyCreateResultResponse;
  open: boolean;
  title?: string;
  onClose: () => void;
}

export function ApiKeyResultDialog(props: ApiKeyResultDialogProps) {
  const { data, open, title = "Token", onClose } = props;

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
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>
                <Alert.Root status="success">
                  <Alert.Indicator />
                  <Alert.Title>
                    Please copy this key now - you won't be able to view it
                    again
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

type ResetApiKeyVariables = {
  body: ApiKeyResetRequest;
  path: { id: string };
};

interface ResetApiKeyDialogProps<TVariables extends ResetApiKeyVariables> {
  open: boolean;
  onClose: () => void;
  keyId: string;
  confirmBtnType?: FormModalButtonType;
  mutationOptions: () => UseMutationOptions<
    ApiKeyCreateResultResponse,
    HttpValidationError,
    TVariables
  >;
}

export function ResetApiKeyDialog<TVariables extends ResetApiKeyVariables>(
  props: ResetApiKeyDialogProps<TVariables>,
) {
  const { keyId, open, confirmBtnType, onClose, mutationOptions } = props;

  const { form, mutation } = useFormMutation({
    formOptions: {
      defaultValues: {
        expires_at: [] as DateValue[],
      },
    },
    mutationOptions,
    onMutate: (values) =>
      ({
        body: {
          expires_at: values.expires_at?.[0].toDate(getLocalTimeZone()),
        },
        path: {
          id: keyId,
        },
      }) as TVariables,
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
      confirmBtnType={confirmBtnType}
    >
      Are you sure you want to recreate this token? This will invalidate the
      current one
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
