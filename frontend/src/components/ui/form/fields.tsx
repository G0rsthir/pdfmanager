import {
  useSelector,
  type AnyFormApi,
  type ValidationErrorMapKeys,
} from "@tanstack/react-form";
import { FormError } from "../error";

export function SubscribeFormError(props: {
  form: AnyFormApi;
  cause?: ValidationErrorMapKeys;
  errorField?: string;
}) {
  const { form, cause = "onSubmit", errorField } = props;

  const error = useSelector(form.store, (state) => state.errorMap[cause]);

  return <FormError errors={error} errorField={errorField} />;
}
