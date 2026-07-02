import { create } from "zustand";

import type { AppStateResponse, UserSessionResponse } from "@/api/types.gen";
import type { LibraryLayout } from "@/pages/library/shared/layout";
import { persist } from "zustand/middleware";

export interface State {
  session?: UserSessionResponse;
  appState?: AppStateResponse;
  pinnedOverviewNodes: string[];
  expandedLibraryNodes: string[];
  primaryColor: string;
  defaultLibraryLayout: LibraryLayout;
  libraryLayouts: Record<string, LibraryLayout>;
}

export interface Actions {
  updateSession: (session: State["session"]) => void;
  updateAppState: (appState: State["appState"]) => void;
  setExpandedLibraryNodes: (value: State["expandedLibraryNodes"]) => void;
  setPinnedOverviewNodes: (value: State["pinnedOverviewNodes"]) => void;
  updatePrimaryColor: (color: string) => void;
  setDefaultLibraryLayout: (layout: LibraryLayout) => void;
  setLibraryLayout: (key: string, layout: LibraryLayout) => void;
}

/**
 * This store is responsible for storing the global app state
 */
export const useGlobalStore = create<State & Actions>()(
  persist(
    (set, _get) => ({
      session: undefined,
      appState: undefined,
      pinnedOverviewNodes: [],
      expandedLibraryNodes: [],
      primaryColor: "blue",
      defaultLibraryLayout: "list",
      libraryLayouts: {},

      setExpandedLibraryNodes: (value) => set({ expandedLibraryNodes: value }),
      setPinnedOverviewNodes: (value) => set({ pinnedOverviewNodes: value }),

      updateSession: (session: State["session"]) => set({ session: session }),

      updateAppState: (appState?: AppStateResponse) =>
        set({ appState: appState }),

      updatePrimaryColor: (color: string) => set({ primaryColor: color }),

      setDefaultLibraryLayout: (layout) =>
        set({ defaultLibraryLayout: layout }),

      setLibraryLayout: (key, layout) =>
        set((state) => ({
          libraryLayouts: { ...state.libraryLayouts, [key]: layout },
        })),
    }),
    {
      name: "global",
      partialize: (state) => ({
        expandedLibraryNodes: state.expandedLibraryNodes,
        primaryColor: state.primaryColor,
        defaultLibraryLayout: state.defaultLibraryLayout,
        libraryLayouts: state.libraryLayouts,
        pinnedOverviewNodes: state.pinnedOverviewNodes,
      }),
    },
  ),
);
