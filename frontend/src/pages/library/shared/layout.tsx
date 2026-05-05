import type { FileResponse } from "@/api/types.gen";
import { GenericIconButton } from "@/components/ui/button";
import { useLibraryLayout } from "@/hooks/layout";
import { Menu, Portal, SimpleGrid, Stack } from "@chakra-ui/react";
import { LuLayoutGrid, LuLayoutList } from "react-icons/lu";
import { FileCard, FileRow } from "./file";

export type LibraryLayout = "list" | "grid";

interface Layout {
  value: LibraryLayout;
  label: string;
  icon: React.ReactNode;
}

const LAYOUTS: Layout[] = [
  { value: "list", label: "List", icon: <LuLayoutList /> },
  { value: "grid", label: "Grid", icon: <LuLayoutGrid /> },
];

export function LayoutMenu({
  value,
  onChange,
  showTriggerLabel,
}: {
  value: LibraryLayout;
  onChange: (value: LibraryLayout) => void;
  showTriggerLabel?: boolean;
}) {
  const current = LAYOUTS.find((o) => o.value === value) ?? LAYOUTS[0];

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <GenericIconButton variant="ghost" aria-label="Change layout">
          {current.icon} {showTriggerLabel && current.label}
        </GenericIconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            <Menu.RadioItemGroup
              value={value}
              onValueChange={(e) => onChange(e.value as LibraryLayout)}
            >
              {LAYOUTS.map((option) => (
                <Menu.RadioItem key={option.value} value={option.value}>
                  {option.label}
                  <Menu.ItemIndicator />
                </Menu.RadioItem>
              ))}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

export function LayoutSwitch({ layoutKey }: { layoutKey: string }) {
  const [layout, setLayout] = useLibraryLayout(layoutKey);
  return <LayoutMenu value={layout} onChange={setLayout} />;
}

export function FileList({
  files,
  layoutKey,
}: {
  files: FileResponse[];
  layoutKey: string;
}) {
  const [layout] = useLibraryLayout(layoutKey);

  if (files.length == 0) return null;

  if (layout === "grid") {
    return (
      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
        {files.map((file) => (
          <FileCard file={file} key={file.id} />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <Stack gap={4}>
      {files.map((file) => (
        <FileRow file={file} key={file.id} />
      ))}
    </Stack>
  );
}
