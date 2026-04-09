import { ErrorScreen } from "@/components/ui/error";
import { useRouteError } from "react-router";

export function Error500Page() {
  const routeError = useRouteError();

  return (
    <ErrorScreen
      errorCode="500 Internal Server Error"
      title="An unexpected error has occurred!"
      description={routeError ? String(routeError) : undefined}
    />
  );
}
