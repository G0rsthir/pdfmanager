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
