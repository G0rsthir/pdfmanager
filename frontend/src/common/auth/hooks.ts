import { useGlobalStore } from "@/store";
import { useShallow } from "zustand/shallow";

import type { AccessScope } from "@/config/const";
import {
  loadSession,
  logout,
  refreshSession,
  signinWithPassword,
} from "./tokens";

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
    refreshSession,
    loadSession,
    logout,
  };
}

export function useHasScopes(...scopes: AccessScope[]) {
  const { session } = useAuth();

  return (
    scopes.every((scope) => session?.user.role.scopes.includes(scope)) ?? false
  );
}
