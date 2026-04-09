import { ForbiddenError } from "@/components/ui/error";
import { ScopesEnum } from "@/config/const";
import { useGlobalStore } from "@/store";
import { useShallow } from "zustand/shallow";

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
  const auth = useGlobalStore(
    useShallow((state) => ({
      session: state.session,
    })),
  );

  let hasPermissions = false;

  for (const scope of scopes) {
    if (auth.session?.user.role?.scope_list.includes(scope)) {
      hasPermissions = true;
      break;
    }
  }

  if (!hasPermissions) return <ForbiddenError />;

  return <>{children}</>;
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const session = useGlobalStore(useShallow((state) => state.session));
  const isAdmin = session?.user.role?.scope_list.includes(
    ScopesEnum.ADMIN_READ,
  );

  if (!isAdmin) return null;

  return <>{children}</>;
}
