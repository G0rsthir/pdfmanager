import { Alert } from "@chakra-ui/react";

/**
 * This can be used to show form errors that are returned from the API and are not field validation errors.
 * By default, it looks for the "form" field. This field is automatically set using the parseFormError function.
 */
export function FormError(props: { errors?: unknown; errorField?: string }) {
  const { errors, errorField = "form", ...other } = props;

  const errorMessage =
    errors && typeof errors == "object" && errorField in errors
      ? (errors as Record<string, React.ReactNode>)[errorField]
      : (errors as React.ReactNode);

  if (!errorMessage) return null;

  return (
    <Alert.Root status="error" {...other}>
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{errorMessage}</Alert.Title>
      </Alert.Content>
    </Alert.Root>
  );
}
