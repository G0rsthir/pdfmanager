import { Button, CloseButton, Dialog, Portal, Stack } from "@chakra-ui/react";
import { AdminWriteButton } from "../button";

export function FormModal(props: {
  open: boolean;
  close: () => void;
  children: React.ReactNode;
  title: React.ReactNode;
  confirmBtnText?: string;
  confirmBtnType?: "generic" | "adminWrite";
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

  const ConfirmBtn = confirmBtnType == "adminWrite" ? AdminWriteButton : Button;

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
                !disabled
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
              <ConfirmBtn
                disabled={disabled}
                colorPalette={confirmBtnPalette}
                onClick={onSubmit}
                loading={isPending}
              >
                {confirmBtnText}
              </ConfirmBtn>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
