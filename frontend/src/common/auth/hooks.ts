import { useGlobalStore } from "@/store";
import { useShallow } from "zustand/shallow";

import { AccessScope, ResourcePermissionCapability } from "@/api/types.gen";
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

const CAPABILITY_SCOPE: Record<ResourcePermissionCapability, AccessScope> = {
  [ResourcePermissionCapability.READ]: AccessScope.LIBRARY_READ,
  [ResourcePermissionCapability.ANNOTATE]: AccessScope.LIBRARY_WRITE,
  [ResourcePermissionCapability.WRITE]: AccessScope.LIBRARY_WRITE,
  [ResourcePermissionCapability.DELETE]: AccessScope.LIBRARY_WRITE,
  [ResourcePermissionCapability.MANAGE_PERMISSIONS]: AccessScope.LIBRARY_WRITE,
  [ResourcePermissionCapability.SYNC_PROGRESS]: AccessScope.LIBRARY_SYNC,
};

export function useCan(resource?: {
  capabilities: readonly ResourcePermissionCapability[];
}) {
  const { session } = useAuth();

  const scopes = session?.user.role.scopes;
  const capabilities = resource?.capabilities;

  return (capability: ResourcePermissionCapability) => {
    return (
      (capabilities?.includes(capability) ?? false) &&
      (scopes?.includes(CAPABILITY_SCOPE[capability]) ?? false)
    );
  };
}
