import { useHasScopes } from "@/common/auth/hooks";
import { AccessScopeEnum, type AccessScope } from "@/config/const";
import {
  Button,
  IconButton,
  type ButtonProps,
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

interface ScopedButtonProps
  extends ButtonProps, React.RefAttributes<HTMLButtonElement> {
  scope: AccessScope;
}

/**
 * Button that is automatically disabled
 * if the current user's session does not include the required scope.
 */
export function ScopedButton(props: ScopedButtonProps) {
  const { scope, children, ...other } = props;

  const hasScope = useHasScopes(scope);

  return (
    <Button disabled={!hasScope} {...other}>
      {children}
    </Button>
  );
}

export function AdminWriteButton(props: Omit<ScopedButtonProps, "scope">) {
  return <ScopedButton {...props} scope={AccessScopeEnum.ADMIN_WRITE} />;
}
