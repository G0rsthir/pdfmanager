import { ErrorScreen } from "@/components/ui/error";
import { useSearchParamMulti } from "@/hooks/url";

/**
 * Dynamic error page based on URL query parameters.
 * Primarily used by SSO.
 */
export function DynamicErrorPage() {
  const [params] = useSearchParamMulti({
    title: { type: "string" },
    description: { type: "string" },
    error_code: { type: "string" },
  });

  return (
    <ErrorScreen
      errorCode={params.error_code ?? "500 Internal Server Error"}
      title={params.title ?? "An unexpected error has occurred"}
      description={params.description}
    />
  );
}
