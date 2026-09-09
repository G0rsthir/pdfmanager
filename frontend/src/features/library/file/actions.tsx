import {
  deleteFileMutation,
  patchFileStateMutation,
} from "@/api/@tanstack/react-query.gen";
import {
  ResourcePermissionCapability,
  type FileResponse,
} from "@/api/types.gen";
import { useCan } from "@/common/auth/hooks";
import { GenericIconButton } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { showSuccessNotification } from "@/components/ui/toaster";
import { useAPIMutation } from "@/hooks/query";
import { Menu, Portal } from "@chakra-ui/react";
import { useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { LuStar } from "react-icons/lu";
import { NavLink } from "react-router";
import { toFileDetailsUrl } from "./path";

export function FavoriteButton({ file }: { file: FileResponse }) {
  const { mutate } = useAPIMutation({
    ...patchFileStateMutation(),
    errorNotification: "Favorite update failed",
  });

  const can = useCan(file);
  const canSyncProgress = can(ResourcePermissionCapability.SYNC_PROGRESS);

  return (
    <GenericIconButton
      variant="ghost"
      size="sm"
      color={file.state.is_favorite ? "yellow.400" : "fg.muted"}
      transition="color 0.2s"
      css={{
        "& svg": { fill: file.state.is_favorite ? "currentColor" : "none" },
        "&:hover": { color: "yellow.400" },
        "&:hover svg": { fill: "currentColor" },
      }}
      onClick={() =>
        mutate({
          body: {
            is_favorite: !file.state.is_favorite,
          },
          path: { id: file.id },
        })
      }
      disabled={!canSyncProgress}
    >
      <LuStar />
    </GenericIconButton>
  );
}

type GenericFileActionDialog = "delete" | null;

export function GenericFileActions(props: { file: FileResponse }) {
  const { file } = props;

  const [dialog, setDialog] = useState<GenericFileActionDialog>(null);

  const target = { folderId: file.collection_id, fileId: file.id };

  const can = useCan(file);
  const canModify = can(ResourcePermissionCapability.WRITE);
  const canDelete = can(ResourcePermissionCapability.DELETE);

  return (
    <>
      <GenericFileActionsMenu>
        <Menu.Item value="details" asChild>
          <NavLink to={toFileDetailsUrl(target)}>Details</NavLink>
        </Menu.Item>
        <Menu.Item value="edit" asChild disabled={!canModify}>
          <NavLink to={toFileDetailsUrl({ ...target, tab: "edit" })}>
            Edit
          </NavLink>
        </Menu.Item>
        <Menu.Item
          value="delete"
          color="fg.error"
          _hover={{ bg: "bg.error", color: "fg.error" }}
          onSelect={() => setDialog("delete")}
          disabled={!canDelete}
        >
          Delete
        </Menu.Item>
      </GenericFileActionsMenu>

      <DeleteFileDialog
        open={dialog == "delete"}
        onClose={() => setDialog(null)}
        id={file.id}
      />
    </>
  );
}

export function GenericFileActionsMenu({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <GenericIconButton
          variant="ghost"
          size="sm"
          onClick={(e) => e.stopPropagation()}
        >
          <BsThreeDotsVertical />
        </GenericIconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>{children}</Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

export function DeleteFileDialog(props: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  id: string;
}) {
  const { open, onClose, onSuccess, id: fileId } = props;

  const { mutate: deleteRequest } = useAPIMutation({
    ...deleteFileMutation(),
    onSuccess() {
      showSuccessNotification("File deleted successfully");
      onClose();
      onSuccess?.();
    },
    errorNotification: "File deletion failed",
  });

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      title="Are you sure?"
      onConfirm={() => deleteRequest({ path: { id: fileId } })}
      confirmBtnText="Delete"
      confirmBtnPalette="red"
    >
      This action cannot be undone. This will permanently delete this file.
    </ConfirmModal>
  );
}
