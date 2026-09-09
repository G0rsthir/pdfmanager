import type { FileResponse } from "@/api/types.gen";
import { GenericIconButton } from "@/components/ui/button";
import { useLibraryLayout } from "@/hooks/layout";
import {
  ActionBar,
  Button,
  Icon,
  Menu,
  Portal,
  SimpleGrid,
  Stack,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import {
  LuCircleCheck,
  LuEllipsis,
  LuFolderInput,
  LuTags,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { FileCard, FileTable, type FileSelection } from "../file/views";
import {
  DeleteFilesDialog,
  MoveFilesDialog,
  SetStatusFilesDialog,
  TagFilesDialog,
} from "./bulk";

export function FileBrowser({
  files,
  layoutKey,
  tagType,
}: {
  files: FileResponse[];
  layoutKey: string;
  tagType?: "search" | "filter";
}) {
  const [layout] = useLibraryLayout(layoutKey);

  const selection = useFileSelection();

  if (files.length == 0) return null;

  return (
    <>
      {layout == "grid" ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          {files.map((file) => (
            <FileCard
              file={file}
              key={file.id}
              tagType={tagType}
              selection={selection}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Stack gap={4}>
          <FileTable tagType={tagType} files={files} selection={selection} />
        </Stack>
      )}
      <BulkActions files={files} selection={selection} />
    </>
  );
}

type BulkActionDialog = "move" | "tag" | "delete" | "status" | null;

function BulkActions(props: {
  files: FileResponse[];
  selection: FileSelection;
}) {
  const { files, selection } = props;

  const [dialog, setDialog] = useState<BulkActionDialog>(null);

  const selected = files.filter((file) => selection.isSelected(file.id));

  return (
    <>
      <ActionBar.Root open={selected.length > 0}>
        <Portal>
          <ActionBar.Positioner>
            <ActionBar.Content>
              <ActionBar.SelectionTrigger>
                {selected.length} {selected.length == 1 ? "file" : "files"}
              </ActionBar.SelectionTrigger>

              <ActionBar.Separator />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialog("move")}
                colorPalette="gray"
              >
                <Icon color="orange">
                  <LuFolderInput />
                </Icon>
                Move
              </Button>

              <Button
                variant="ghost"
                colorPalette="gray"
                size="sm"
                onClick={() => setDialog("tag")}
              >
                <Icon color="green">
                  <LuTags />
                </Icon>
                Tag
              </Button>

              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button variant="outline" size="sm" colorPalette="gray">
                    <LuEllipsis />
                    More
                  </Button>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content>
                      <Menu.Item
                        value="status"
                        onSelect={() => setDialog("status")}
                      >
                        <LuCircleCheck />
                        Set status
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>

              <ActionBar.Separator />

              <Button
                variant="surface"
                size="sm"
                colorPalette="red"
                onClick={() => setDialog("delete")}
              >
                <LuTrash2 />
                Delete
              </Button>

              <ActionBar.CloseTrigger asChild>
                <GenericIconButton
                  size="xs"
                  variant="ghost"
                  onClick={selection.clear}
                >
                  <LuX />
                </GenericIconButton>
              </ActionBar.CloseTrigger>
            </ActionBar.Content>
          </ActionBar.Positioner>
        </Portal>
      </ActionBar.Root>
      <MoveFilesDialog
        open={dialog == "move"}
        onClose={() => setDialog(null)}
        files={selected}
        onMoved={selection.clear}
      />
      <TagFilesDialog
        open={dialog == "tag"}
        onClose={() => setDialog(null)}
        files={selected}
        onTagged={selection.clear}
      />
      <DeleteFilesDialog
        open={dialog == "delete"}
        onClose={() => setDialog(null)}
        files={selected}
        onSuccess={selection.clear}
      />
      <SetStatusFilesDialog
        open={dialog == "status"}
        onClose={() => setDialog(null)}
        files={selected}
        onSuccess={selection.clear}
      />
    </>
  );
}

function useFileSelection(): FileSelection {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());

  return useMemo(
    () => ({
      ids,
      isSelected: (id) => ids.has(id),
      toggle: (id) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      setMany: (batch, selected) =>
        setIds((prev) => {
          const next = new Set(prev);
          for (const id of batch) {
            if (selected) next.add(id);
            else next.delete(id);
          }
          return next;
        }),
      clear: () => setIds(new Set()),
    }),
    [ids],
  );
}
