import { IconButton, type IconButtonProps } from "@chakra-ui/react";

export function GenericIconButton(
  props: IconButtonProps & React.RefAttributes<HTMLButtonElement>,
) {
  const { colorPalette, ref, ...other } = props;

  return (
    <IconButton ref={ref} colorPalette={colorPalette ?? "gray"} {...other} />
  );
}
