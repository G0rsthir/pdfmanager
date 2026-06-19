import { ForbiddenError } from "@/components/ui/error";
import { AccessScopeEnum, type AccessScope } from "@/config/const";
import { useHasScopes } from "./hooks";

/**
 * Guard routes based on user authorization.
 * It checks if the user is authenticated and has the required permissions (scopes).
 */
export function AuthGuard({
  children,
  scopes = [],
}: {
  children: React.ReactNode;
  scopes: string[];
}) {
  const hasPermissions = useHasScopes(...(scopes as AccessScope[]));

  if (!hasPermissions) return <ForbiddenError />;

  return <>{children}</>;
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const isAdmin = useHasScopes(AccessScopeEnum.ADMIN_READ);

  if (!isAdmin) return null;

  return <>{children}</>;
}
