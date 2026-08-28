import type { LibraryLayout } from "@/pages/library/shared/layout";
import { useGlobalStore } from "@/store";
import { useShallow } from "zustand/shallow";

export function useLibraryLayout(key: string) {
  const { layout, setLibraryLayout } = useGlobalStore(
    useShallow((state) => ({
      layout: state.libraryLayouts[key] ?? state.defaultLibraryLayout,
      setLibraryLayout: state.setLibraryLayout,
    })),
  );

  return [
    layout,
    (next: LibraryLayout) => setLibraryLayout(key, next),
  ] as const;
}

export function useFileClickAction() {
  const { action, setFileClickAction } = useGlobalStore(
    useShallow((state) => ({
      action: state.fileClickAction,
      setFileClickAction: state.setFileClickAction,
    })),
  );

  return [action, setFileClickAction] as const;
}
