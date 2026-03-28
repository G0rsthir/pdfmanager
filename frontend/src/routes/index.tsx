import { StateLoader } from "@/common/state/loader";
import { Block } from "@/components/ui/display";
import { SessionExpiredPage } from "@/pages/auth/expired";
import { LoginPage } from "@/pages/auth/login";
import { Error404Page } from "@/pages/error/404";
import { Error500Page } from "@/pages/error/500";
import { Layout } from "@/pages/layout";
import { FavoritesPage } from "@/pages/library/favorites";
import { FilePage } from "@/pages/library/file";
import { FolderPage } from "@/pages/library/folder";
import { SearchPage } from "@/pages/library/search";
import { TagsPage } from "@/pages/library/tags";
import { UncategorizedPage } from "@/pages/library/uncategorized";
import SetupPage from "@/pages/setup";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";

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
                path: "uncategorized",
                element: <UncategorizedPage />,
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
