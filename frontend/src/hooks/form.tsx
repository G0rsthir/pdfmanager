import { CancelButton, SubmitButton } from "@/components/ui/form/buttons";
import { fieldContext, formContext } from "@/components/ui/form/context";
import {
  ExpiryDateField,
  PasswordField,
  SelectField,
  SubscribeFormError,
  SwitchField,
  TextField,
  TokensField,
} from "@/components/ui/form/fields";
import { showSuccessNotification } from "@/components/ui/toaster";
import { useAPIMutation } from "@/hooks/query";
import {
  createFormHook,
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
  type FormValidators,
} from "@tanstack/react-form";
import type { MutationMeta, UseMutationOptions } from "@tanstack/react-query";

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    PasswordField,
    ExpiryDateField,
    SelectField,
    SwitchField,
    TokensField,
  },
  formComponents: {
    SubscribeFormError,
    CancelButton,
    SubmitButton,
  },
});

type AnyFormValidators<TFormValues> = FormValidators<
  TFormValues,
  FormValidateOrFn<TFormValues>,
  FormValidateOrFn<TFormValues>,
  FormAsyncValidateOrFn<TFormValues>,
  FormValidateOrFn<TFormValues>,
  FormAsyncValidateOrFn<TFormValues>,
  FormValidateOrFn<TFormValues>,
  FormAsyncValidateOrFn<TFormValues>,
  FormValidateOrFn<TFormValues>,
  FormAsyncValidateOrFn<TFormValues>
>;

export function useFormMutation<
  TFormValues extends object,
  TMutationData = unknown,
  TMutationError = unknown,
  TMutationVariables = unknown,
>(props: {
  formOptions: {
    defaultValues: TFormValues;
    validators?: AnyFormValidators<TFormValues>;
  } & Record<string, unknown>;
  mutationOptions: () => UseMutationOptions<
    TMutationData,
    TMutationError,
    TMutationVariables
  >;
  onMutate: (value: TFormValues) => TMutationVariables;
  successNotification?: string;
  onSuccess?: () => void;
  resetForm?: boolean;
  mutationMeta?: MutationMeta;
}) {
  const {
    formOptions,
    mutationOptions,
    onMutate,
    successNotification,
    onSuccess,
    resetForm = true,
    mutationMeta,
  } = props;

  const form = useAppForm({
    ...formOptions,
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(onMutate(value));
    },
  });

  const mutation = useAPIMutation({
    ...mutationOptions(),
    onSuccess() {
      if (successNotification) showSuccessNotification(successNotification);
      if (resetForm) form.reset();
      onSuccess?.();
    },
    setErrorMap: form.setErrorMap,
    meta: mutationMeta,
  });

  return { form, mutation };
}
