import {
  CloseButton,
  IconButton,
  type CloseButtonProps,
  type IconButtonProps,
} from "@chakra-ui/react";

export function GenericIconButton(
  props: IconButtonProps & React.RefAttributes<HTMLButtonElement>,
) {
  const { colorPalette, ref, ...other } = props;

  return (
    <IconButton ref={ref} colorPalette={colorPalette ?? "gray"} {...other} />
  );
}

export function GenericCloseButton(
  props: CloseButtonProps & React.RefAttributes<HTMLButtonElement>,
) {
  const { colorPalette, ref, ...other } = props;

  return (
    <CloseButton
      ref={ref}
      colorPalette={colorPalette ?? "gray"}
      {...other}
      _hover={{ color: "red.600" }}
    />
  );
}
