import { Button, CloseButton, Dialog, Portal, Stack } from "@chakra-ui/react";

export function ConfirmModal(props: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: React.ReactNode;
  confirmBtnText?: string;
  confirmBtnPalette?: string;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  const {
    open,
    onClose,
    children,
    title,
    confirmBtnPalette,
    confirmBtnText = "Confirm",
    onConfirm,
    isPending,
  } = props;

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
