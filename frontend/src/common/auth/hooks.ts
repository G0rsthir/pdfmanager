import { useGlobalStore } from "@/store";
import { useShallow } from "zustand/shallow";

import { loadSession, logout, signinWithPassword } from "./tokens";

export function useAuth() {
  const state = useGlobalStore(
    useShallow((state) => ({
      session: state.session,
      updateSession: state.updateSession,
    })),
  );

  return {
    ...state,
    signinWithPassword,
    loadSession,
    logout,
  };
}
