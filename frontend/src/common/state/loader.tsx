import { parseAPIError } from "@/common/error";
import { ApplicationError } from "@/components/ui/error";
import { AppLoadingOverlay } from "@/components/ui/feedback";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/hooks";
import { loadSession } from "../auth/tokens";
import { useAppState } from "./hooks";

/**
 * Initial session loader
 */
function useInitialLoader() {
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const { loadAppState } = useAppState();

  useEffect(() => {
    if (isComplete || isLoading) return;
    setIsLoading(true);

    (async () => {
      try {
        await Promise.all([loadAppState(), loadSession()]);
      } catch (e) {
        setError(e);
      } finally {
        setIsComplete(true);
        setIsLoading(false);
      }
    })();
  }, [loadAppState, isLoading, isComplete]);

  return { isComplete, error, isError: Boolean(error) };
}

function Lifecycle({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const { appState } = useAppState();
  const { session } = useAuth();

  // This hook should only fire once during the lifecycle initialization to check
  // whether the user has an authenticated session.
  // It should not be used to redirect the user to the login page on user-initiated
  // events (logout, expiration).
  useEffect(() => {
    if (session) return;

    navigate("/login", {
      state: { from: location, type: "logout" },
      replace: true,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (appState?.is_setup_complete === false) {
      navigate("/setup");
      return;
    }
  }, [navigate, appState]);

  if (!session) return null;

  return <>{children}</>;
}

/**
 * Wrapper that loads application state before rendering its child component.
 */
export function StateLoader({ children }: { children?: React.ReactNode }) {
  const loader = useInitialLoader();

  if (loader.isError)
    return (
      <ApplicationError description={parseAPIError(loader.error).message} />
    );
  if (!loader.isComplete) return <AppLoadingOverlay />;

  return <Lifecycle>{children}</Lifecycle>;
}
