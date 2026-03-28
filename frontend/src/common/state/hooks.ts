import { getAppState } from "@/api/sdk.gen";
import { useGlobalStore } from "@/store";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";

export function useAppState() {
  const state = useGlobalStore(
    useShallow((state) => ({
      appState: state.appState,
      updateAppState: state.updateAppState,
    })),
  );

  const loadAppState = useCallback(async () => {
    const res = await getAppState({
      throwOnError: true,
      meta: {
        refreshAccessToken: false,
      },
    });
    state.updateAppState(res.data);
    return res.data;
  }, [state]);

  return { appState: state.appState, loadAppState };
}
