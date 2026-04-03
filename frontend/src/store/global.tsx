import { create } from "zustand";

import type { AppStateResponse, UserSessionResponse } from "@/api/types.gen";
import { persist } from "zustand/middleware";

export interface State {
  session?: UserSessionResponse;
  appState?: AppStateResponse;
  expandedLibraryNodes: string[];
  primaryColor: string;
}

export interface Actions {
  updateSession: (session: State["session"]) => void;
  updateAppState: (appState: State["appState"]) => void;
  setExpandedLibraryNodes: (value: State["expandedLibraryNodes"]) => void;
  updatePrimaryColor: (color: string) => void;
}

/**
 * This store is responsible for storing the global app state
 */
export const useGlobalStore = create<State & Actions>()(
  persist(
    (set, _get) => ({
      session: undefined,
      appState: undefined,
      expandedLibraryNodes: [],
      primaryColor: "blue",

      setExpandedLibraryNodes: (value) => set({ expandedLibraryNodes: value }),

      updateSession: (session: State["session"]) => set({ session: session }),

      updateAppState: (appState?: AppStateResponse) =>
        set({ appState: appState }),

      updatePrimaryColor: (color: string) => set({ primaryColor: color }),
    }),
    {
      name: "global",
      partialize: (state) => ({
        expandedLibraryNodes: state.expandedLibraryNodes,
        primaryColor: state.primaryColor,
      }),
    },
  ),
);
