import { StateLoader } from "@/common/state/loader";
import { Block } from "@/components/ui/display";
import { ScopesEnum } from "@/config/const";
import { CurrentUserAccountPage } from "@/pages/account";
import { AuthProvidersPage } from "@/pages/admin/identity/providers";
import { RolesPage } from "@/pages/admin/identity/roles";
import { UsersPage } from "@/pages/admin/identity/users";
import { AdminLayout } from "@/pages/admin/layout";
import { SessionExpiredPage } from "@/pages/auth/expired";
import { LoginPage } from "@/pages/auth/login";
import { LogoutPage } from "@/pages/auth/logout";
import { Error404Page } from "@/pages/error/404";
import { Error500Page } from "@/pages/error/500";
import { DynamicErrorPage } from "@/pages/error/dynamic";
import { Layout } from "@/pages/layout";
import { FavoritesPage } from "@/pages/library/favorites";
import { FilePage } from "@/pages/library/file";
import { FolderPage } from "@/pages/library/folder";
import { SearchPage } from "@/pages/library/search";
import { TagsPage } from "@/pages/library/tags";
import SetupPage from "@/pages/setup";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router";
import { AuthGuard } from "../common/auth/guard";

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
            ],
          },
          {
            path: "folder/:folderid/file/:fileid",
            element: <FilePage />,
          },
          {
            path: "uncategorized/file/:fileid",
            element: <FilePage />,
          },
          {
            path: "admin",
            element: (
              <AuthGuard scopes={[ScopesEnum.ADMIN_READ]}>
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
