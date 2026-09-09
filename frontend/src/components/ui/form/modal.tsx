import {
  Button,
  CloseButton,
  Dialog,
  Portal,
  Stack,
  type DialogRootProps,
} from "@chakra-ui/react";

export interface FormModalProps {
  open: boolean;
  close: () => void;
  children: React.ReactNode;
  title: React.ReactNode;
  confirmBtnText?: string;
  confirmBtnPalette?: string;
  onSubmit: () => void;
  isPending?: boolean;
  submitOnEnter?: boolean;
  disabled?: boolean;
  size?: DialogRootProps["size"];
}

export function FormModal(props: FormModalProps) {
  const {
    open,
    children,
    title,
    isPending,
    disabled,
    submitOnEnter = false,
    confirmBtnPalette,
    confirmBtnText = "Confirm",
    size = "sm",
    onSubmit,
    close,
  } = props;

  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      size={size}
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
              <Button
                disabled={disabled}
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
