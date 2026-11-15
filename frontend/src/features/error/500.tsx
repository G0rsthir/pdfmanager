import { parseAPIError } from "@/common/error";
import { ErrorScreen } from "@/components/ui/error";
import { isRouteErrorResponse, useRouteError } from "react-router";

export function Error500Page() {
  const routeError = useRouteError();

  return (
    <ErrorScreen
      errorCode="500 Internal Server Error"
      title="An unexpected error has occurred!"
      description={describeError(routeError)}
    />
  );
}

function describeError(error: unknown): string | undefined {
  if (!error) return undefined;

  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;

  return parseAPIError(error).message;
}
