import { AccessScope } from "@/api/types.gen";
import { StateLoader } from "@/common/state/loader";
import { Block } from "@/components/ui/display";
import { CurrentUserAccountPage } from "@/features/account";
import { ApiKeysPage } from "@/features/admin/api/keys";
import { AuthProvidersPage } from "@/features/admin/identity/providers";
import { RolesPage } from "@/features/admin/identity/roles";
import { UsersPage } from "@/features/admin/identity/users";
import { AdminLayout } from "@/features/admin/layout";
import { TasksPage } from "@/features/admin/tools/tasks";
import { SessionExpiredPage } from "@/features/auth/expired";
import { LoginPage } from "@/features/auth/login";
import { LogoutPage } from "@/features/auth/logout";
import { DashboardPage } from "@/features/dashboard";
import { Error404Page } from "@/features/error/404";
import { Error500Page } from "@/features/error/500";
import { DynamicErrorPage } from "@/features/error/dynamic";
import { Layout } from "@/features/layout";
import { FavoritesPage } from "@/features/library/favorites";
import { FileDetailsPage } from "@/features/library/file";
import { FileReaderPage } from "@/features/library/file/reader";
import { FolderPage } from "@/features/library/folder";
import { SearchPage } from "@/features/library/search";
import { TagsPage } from "@/features/library/tags";
import { NotificationsPage } from "@/features/notifications";
import SetupPage from "@/features/setup";
import { lazy } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router";
import { AuthGuard } from "../common/auth/guard";

/**
 * Function that wraps and returns a lazy-loaded version of the component
 *
 * @remarks
 * - The component being lazy-loaded should be the default export of the module
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeLazyLoad<C extends React.ComponentType<any>>(
  resolve: () => Promise<{ default: C }>,
) {
  const LazyComponent = lazy(resolve);
  function RouteLazyLoad(props: React.ComponentProps<C>) {
    return <LazyComponent {...props} />;
  }

  return RouteLazyLoad;
}

const APIDocumentationPage = makeLazyLoad(
  () => import("@/features/admin/api/docs"),
);

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: import.meta.env.PROD ? <Error500Page /> : undefined,
  },
  {
    path: "/expired",
    element: <SessionExpiredPage />,
    errorElement: import.meta.env.PROD ? <Error500Page /> : undefined,
  },
  {
    path: "/setup",
    element: <SetupPage />,
    errorElement: import.meta.env.PROD ? <Error500Page /> : undefined,
  },
  {
    path: "/logout",
    element: <LogoutPage />,
    errorElement: import.meta.env.PROD ? <Error500Page /> : undefined,
  },
  {
    path: "/error",
    element: <DynamicErrorPage />,
  },
  {
    id: "app",
    path: "/",
    element: (
      <StateLoader>
        <Outlet />
      </StateLoader>
    ),
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          {
            path: "/",
            element: (
              <Block>
                <Outlet />
              </Block>
            ),
            children: [
              {
                index: true,
                element: <DashboardPage />,
              },
              {
                path: "tags",
                element: <TagsPage />,
              },
              {
                path: "favorites",
                element: <FavoritesPage />,
              },
              {
                path: "folder/:folderid",
                element: <FolderPage />,
              },
              {
                path: "search",
                element: <SearchPage />,
              },
              {
                path: "account",
                element: <CurrentUserAccountPage />,
              },
              {
                path: "notifications",
                element: <NotificationsPage />,
              },
              {
                path: "folder/:folderid/file/:fileid/details",
                element: <FileDetailsPage />,
              },
            ],
          },
          {
            path: "folder/:folderid/file/:fileid/reader",
            element: <FileReaderPage />,
          },
          {
            path: "admin",
            element: (
              <AuthGuard scopes={[AccessScope.ADMIN_READ]}>
                <AdminLayout />
              </AuthGuard>
            ),
            children: [
              {
                index: true,
                element: <Navigate to="users" replace />,
              },
              {
                path: "users",
                element: <UsersPage />,
              },
              {
                path: "roles",
                element: <RolesPage />,
              },
              {
                path: "providers",
                element: <AuthProvidersPage />,
              },
              {
                path: "api-docs",
                element: <APIDocumentationPage />,
              },
              {
                path: "api-keys",
                element: <ApiKeysPage />,
              },
              {
                path: "tasks",
                element: <TasksPage />,
              },
            ],
          },
        ],
      },
    ],
    errorElement: import.meta.env.PROD ? <Error500Page /> : undefined,
  },
  {
    path: "*",
    element: <Error404Page />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
