import {
  Button,
  CloseButton,
  IconButton,
  type ButtonProps,
  type CloseButtonProps,
  type IconButtonProps,
} from "@chakra-ui/react";
import { Link, type To } from "react-router";
import { Tooltip, type TooltipProps } from "./tooltip";

export function GenericIconButton(
  props: IconButtonProps & React.RefAttributes<HTMLButtonElement>,
) {
  const { colorPalette, ref, ...other } = props;

  return (
    <IconButton ref={ref} colorPalette={colorPalette ?? "gray"} {...other} />
  );
}

export function TooltipIconButton(
  props: IconButtonProps &
    React.RefAttributes<HTMLButtonElement> & {
      label: string;
      tooltipProps?: Omit<TooltipProps, "content" | "children">;
    },
) {
  const { label, tooltipProps, ...other } = props;

  return (
    <Tooltip content={label} openDelay={1000} {...tooltipProps}>
      <GenericIconButton {...other} />
    </Tooltip>
  );
}

export function GenericCloseButton(
  props: CloseButtonProps & React.RefAttributes<HTMLButtonElement>,
) {
  const { ref, ...other } = props;

  return (
    <CloseButton
      ref={ref}
      colorPalette="gray"
      variant="ghost"
      alignSelf="center"
      {...other}
      _hover={{ color: "red.600" }}
    />
  );
}

export function LinkButton(props: ButtonProps & { to: To; state?: unknown }) {
  const { to, state, disabled, children, ...rest } = props;

  if (disabled)
    return (
      <Button {...rest} disabled>
        {children}
      </Button>
    );

  return (
    <Button {...rest} asChild>
      <Link to={to} state={state}>
        {children}
      </Link>
    </Button>
  );
}
