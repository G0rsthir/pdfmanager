import { AccessScope } from "@/api/types.gen";
import { useHasScopes } from "@/common/auth/hooks";
import { Button, CloseButton, Dialog, Portal, Stack } from "@chakra-ui/react";

export function ConfirmModal(props: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: React.ReactNode;
  confirmBtnText?: string;
  confirmBtnPalette?: string;
  disabled?: boolean;
  confirmBtnType?: "generic" | AccessScope;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  const {
    open,
    onClose,
    children,
    title,
    confirmBtnPalette,
    confirmBtnType = "generic",
    confirmBtnText = "Confirm",
    disabled,
    onConfirm,
    isPending,
  } = props;

  const haScope = useHasScopes(
    confirmBtnType != "generic" ? confirmBtnType : AccessScope.USER_WRITE,
  );

  const isDisabled = disabled || (confirmBtnType != "generic" && !haScope);

  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      size="sm"
      onOpenChange={() => onClose()}
    >
      <Portal>
        <Dialog.Backdrop onClick={(e) => e.stopPropagation()} />
        <Dialog.Positioner onClick={(e) => e.stopPropagation()}>
          <Dialog.Content>
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
                onClick={() => onClose()}
              >
                Cancel
              </Button>
              <Button
                colorPalette={confirmBtnPalette}
                onClick={onConfirm}
                loading={isPending}
                disabled={isDisabled}
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
