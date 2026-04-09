import { ScopesEnum } from "@/config/const";
import { useGlobalStore } from "@/store";
import {
  Button,
  IconButton,
  type ButtonProps,
  type IconButtonProps,
} from "@chakra-ui/react";
import { useShallow } from "zustand/shallow";

export function GenericIconButton(
  props: IconButtonProps & React.RefAttributes<HTMLButtonElement>,
) {
  const { colorPalette, ref, ...other } = props;

  return (
    <IconButton ref={ref} colorPalette={colorPalette ?? "gray"} {...other} />
  );
}

interface ScopedButtonProps
  extends ButtonProps, React.RefAttributes<HTMLButtonElement> {
  scope: (typeof ScopesEnum)[keyof typeof ScopesEnum];
}

/**
 * Button that is automatically disabled
 * if the current user's session does not include the required scope.
 */
export function ScopedButton(props: ScopedButtonProps) {
  const { scope, children, ...other } = props;

  const session = useGlobalStore(useShallow((state) => state.session));

  return (
    <Button disabled={!session?.user.role.scopes.includes(scope)} {...other}>
      {children}
    </Button>
  );
}

export function AdminWriteButton(props: Omit<ScopedButtonProps, "scope">) {
  return <ScopedButton {...props} scope={ScopesEnum.ADMIN_WRITE} />;
}
