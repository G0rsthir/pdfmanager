import { showSuccessNotification } from "@/components/ui/toaster";
import { useAPIMutation } from "@/hooks/query";
import { useForm } from "@tanstack/react-form";
import type { UseMutationOptions } from "@tanstack/react-query";

export function useFormMutation<
  TFormValues extends object,
  TMutationData = unknown,
  TMutationError = unknown,
  TMutationVariables = unknown,
>({
  formOptions,
  mutationOptions,
  onMutate,
  successMessage,
  onSuccess,
}: {
  formOptions: { defaultValues: TFormValues } & Record<string, unknown>;
  mutationOptions: () => UseMutationOptions<
    TMutationData,
    TMutationError,
    TMutationVariables
  >;
  onMutate: (value: TFormValues) => TMutationVariables;
  successMessage?: string;
  onSuccess?: () => void;
}) {
  const form = useForm({
    ...formOptions,
    onSubmit: async ({ value }) => {
      mutate(onMutate(value as TFormValues));
    },
  });

  const { mutate } = useAPIMutation({
    ...mutationOptions(),
    onSuccess() {
      if (successMessage) showSuccessNotification(successMessage);
      form.reset();
      onSuccess?.();
    },
    setErrorMap: form.setErrorMap,
  });

  return form;
}
