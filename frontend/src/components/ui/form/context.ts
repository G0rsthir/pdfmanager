import { createFormHookContexts } from "@tanstack/react-form";

/**
 * The contexts of the form hook in `hooks/form.tsx`
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
