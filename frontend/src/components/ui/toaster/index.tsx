import { createToaster } from "@chakra-ui/react";

export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
});

export function showSuccessNotification(message: string) {
  toaster.create({
    title: message,
    type: "success",
  });
}

export function showErrorNotification(message: string, description?: string) {
  toaster.create({
    title: message,
    type: "error",
    description: description,
  });
}
