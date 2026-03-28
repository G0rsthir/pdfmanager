import { client } from "@/api/client.gen";
import { type Options } from "@/api/sdk.gen";
import type { AccessToken } from "@/api/types.gen";
import {
  getUserSession,
  refreshState,
  renewAccessToken,
} from "@/common/auth/tokens";
import { useGlobalStore } from "@/store";

client.setConfig({
  // Overide base path and use relative URL
  baseUrl: "",
});

/**
 * Used by the api interceptor to refresh the access token
 */
export async function refreshAccess(): Promise<AccessToken | undefined> {
  if (refreshState.refreshRequest) return await refreshState.refreshRequest;

  refreshState.refreshRequest = (async () => {
    const accessToken = await renewAccessToken();
    return accessToken;
  })();

  const token = await refreshState.refreshRequest;
  refreshState.refreshRequest = undefined;

  if (!token) {
    useGlobalStore.getState().updateSession(undefined);
    window.location.replace("/expired");
    return;
  }

  // Refetch session since session ID may differ
  const session = await getUserSession();
  if (session.response.ok) {
    useGlobalStore.getState().updateSession(session.data);
  }

  return token;
}

// Get a new auth JWT when the current one expires
client.interceptors.request.use(async (request, options: Options) => {
  const meta = options.meta;

  // Return original if refresh is disabled for this request or user does not have active session
  if (meta?.refreshAccessToken === false || !refreshState.tokenExpires)
    return request;

  // Return original if session is not expired
  if (refreshState.tokenExpires > new Date()) return request;

  // Return original if request does not have auth header
  if (!request.headers.has("authorization")) return request;

  // Wait for active request to complate
  if (refreshState.refreshRequest) {
    const accessToken = await refreshState.refreshRequest;
    if (!accessToken) return request;
    request.headers.set("authorization", `Bearer ${accessToken.access_token}`);
    return request;
  }

  const accessToken = await refreshAccess();
  if (!accessToken) return request;

  request.headers.set("authorization", `Bearer ${accessToken.access_token}`);

  return request;
});

export { client };
