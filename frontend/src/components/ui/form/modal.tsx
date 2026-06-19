import { useHasScopes } from "@/common/auth/hooks";
import { AccessScopeEnum } from "@/config/const";
import { Button, CloseButton, Dialog, Portal, Stack } from "@chakra-ui/react";

export function FormModal(props: {
  open: boolean;
  close: () => void;
  children: React.ReactNode;
  title: React.ReactNode;
  confirmBtnText?: string;
  confirmBtnType?: "generic" | "adminWrite" | "userWrite";
  confirmBtnPalette?: string;
  onSubmit: () => void;
  isPending?: boolean;
  submitOnEnter?: boolean;
  disabled?: boolean;
}) {
  const {
    open,
    children,
    title,
    isPending,
    disabled,
    submitOnEnter = false,
    confirmBtnPalette,
    confirmBtnType,
    confirmBtnText = "Confirm",
    onSubmit,
    close,
  } = props;

  const haScope = useHasScopes(
    confirmBtnType == "adminWrite"
      ? AccessScopeEnum.ADMIN_WRITE
      : AccessScopeEnum.USER_WRITE,
  );

  const isDisabled = disabled || (confirmBtnType != "generic" && !haScope);

  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      size="sm"
      onOpenChange={() => close()}
    >
      <Portal>
        <Dialog.Backdrop onClick={(e) => e.stopPropagation()} />
        <Dialog.Positioner onClick={(e) => e.stopPropagation()}>
          <Dialog.Content
            onKeyDown={(e) => {
              if (
                submitOnEnter &&
                e.key == "Enter" &&
                !e.shiftKey &&
                !(e.target instanceof HTMLTextAreaElement) &&
                !isPending &&
                !isDisabled
              ) {
                e.preventDefault();
                onSubmit();
              }
            }}
          >
            <Dialog.CloseTrigger asChild>
              <CloseButton colorPalette="gray" />
            </Dialog.CloseTrigger>
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={4}>{children}</Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="surface"
                colorPalette="gray"
                onClick={() => close()}
              >
                Cancel
              </Button>
              <Button
                disabled={isDisabled}
                colorPalette={confirmBtnPalette}
                onClick={onSubmit}
                loading={isPending}
              >
                {confirmBtnText}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
