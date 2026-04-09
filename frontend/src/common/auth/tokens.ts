import {
  createAuthToken,
  getCurrentSession,
  refreshAuthToken,
  revokeToken,
} from "@/api/sdk.gen";
import type { AccessToken, CreateAuthTokenData } from "@/api/types.gen";
// Import the client with interceptor from "@/config/api"
import { client } from "@/config/api";
import { useGlobalStore } from "@/store";

// Store active refresh state in memory, this allows for parallel api request to wait for new token
export const refreshState: {
  refreshRequest?: Promise<AccessToken | undefined>;
  tokenExpires?: Date;
} = {};

/**
 * The token can be generated either by the API interceptor or the state loader.
 */
export async function renewAccessToken(): Promise<AccessToken | undefined> {
  try {
    const response = await refreshAuthToken({
      throwOnError: true,
      meta: {
        refreshAccessToken: false,
      },
    });

    client.setConfig({
      auth: response.data.access_token,
    });

    refreshState.tokenExpires = response.data.expires;

    return response.data;
  } catch {
    return undefined;
  }
}

export async function signinWithPassword(data: CreateAuthTokenData["body"]) {
  const response = await createAuthToken({
    body: data,
    throwOnError: true,
    meta: {
      refreshAccessToken: false,
    },
  });

  client.setConfig({
    auth: response.data.access_token,
  });

  refreshState.tokenExpires = response.data.expires;
}

export async function getUserSession() {
  return await getCurrentSession({
    meta: {
      refreshAccessToken: false,
    },
  });
}

export async function deleteUserSession() {
  const res = await revokeToken({
    meta: {
      refreshAccessToken: false,
    },
  });
  return res.data;
}

export async function refreshSession() {
  const res = await getUserSession();
  useGlobalStore.getState().updateSession(res.data);
}

/**
 * Should be called once on the initial app load
 */
export async function loadSession() {
  const res = await getUserSession();

  if (res.response.ok) {
    useGlobalStore.getState().updateSession(res.data);
    return true;
  }

  if (res.response.status !== 401) {
    useGlobalStore.getState().updateSession(undefined);
    throw res.error;
  }

  const token = await renewAccessToken();
  if (!token) {
    useGlobalStore.getState().updateSession(undefined);
    return false;
  }

  const retry = await getUserSession();

  if (!retry.response.ok) {
    useGlobalStore.getState().updateSession(undefined);
    throw retry.error;
  }

  useGlobalStore.getState().updateSession(retry.data);
  return true;
}

export async function logout() {
  const response = await deleteUserSession();
  const appState = useGlobalStore.getState().appState;
  useGlobalStore.getState().updateSession(undefined);
  if (response?.redirect_url) {
    window.location.href = response.redirect_url;
    return;
  }
  if (!appState?.auto_login_sso_server?.is_auto_login_enabled) {
    window.location.href = "/login";
    return;
  }
  window.location.href = "/logout";
}
