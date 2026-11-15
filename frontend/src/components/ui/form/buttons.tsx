import { Button, type ButtonProps } from "@chakra-ui/react";
import { useSelector } from "@tanstack/react-form";
import type { To } from "react-router";
import { LinkButton } from "../button";
import { useFormContext } from "./context";

export function SubmitButton(props: ButtonProps) {
  const form = useFormContext();
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return <Button {...props} type="submit" loading={isSubmitting} />;
}

export function CancelButton(
  props: Omit<ButtonProps, "children"> & {
    /** The page that Cancel goes back to */
    to: To;
    state?: unknown;
  },
) {
  return (
    <LinkButton variant="surface" colorPalette="gray" {...props}>
      Cancel
    </LinkButton>
  );
}
