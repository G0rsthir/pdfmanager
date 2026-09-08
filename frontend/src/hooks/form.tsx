import { showSuccessNotification } from "@/components/ui/toaster";
import { useAPIMutation } from "@/hooks/query";
import {
  useForm,
  type FormAsyncValidateOrFn,
  type FormValidateOrFn,
  type FormValidators,
} from "@tanstack/react-form";
import type { MutationMeta, UseMutationOptions } from "@tanstack/react-query";

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
  successMessage?: string;
  onSuccess?: () => void;
  resetForm?: boolean;
  mutationMeta?: MutationMeta;
}) {
  const {
    formOptions,
    mutationOptions,
    onMutate,
    successMessage,
    onSuccess,
    resetForm = true,
    mutationMeta,
  } = props;

  const form = useForm({
    ...formOptions,
    onSubmit: async ({ value }) => {
      mutation.mutate(onMutate(value as TFormValues));
    },
  });

  const mutation = useAPIMutation({
    ...mutationOptions(),
    onSuccess() {
      if (successMessage) showSuccessNotification(successMessage);
      if (resetForm) form.reset();
      onSuccess?.();
    },
    setErrorMap: form.setErrorMap,
    meta: mutationMeta,
  });

  return { form, mutation };
}
