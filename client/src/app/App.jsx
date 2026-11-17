import { createBrowserRouter, Navigate, RouterProvider, useLocation, useParams } from "react-router-dom";
import RootLayout from "../layouts/RootLayout";
import PublicLayout from "../layouts/PublicLayout";
// Landing page stays in the main chunk; everything else is split per route.
import HomePage from "../pages/HomePage";

/** `lazy` route helper: RR waits for the chunk before committing, so view transitions see the new page. */
const page = (loader) => async () => ({ Component: (await loader()).default });

/** Old URLs (/detail/:id, /article/:id) -> canonical /articles/:id, keeping ?query and #hash. */
function LegacyArticleRedirect() {
  const { id } = useParams();
  const { search, hash } = useLocation();
  return <Navigate to={`/articles/${encodeURIComponent(id)}${search}${hash}`} replace />;
}

const BootScreen = () => <div className="min-h-screen bg-bg" aria-busy="true" />;

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    HydrateFallback: BootScreen,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <HomePage />, handle: { heroNav: true } },
          { path: "articles", lazy: page(() => import("../features/articles/ArticlesListPage")) },
          {
            path: "articles/:slugOrId",
            lazy: page(() => import("../features/articles/detail/ArticleDetailPage")),
            handle: { heroNav: true },
          },
          { path: "compare", lazy: page(() => import("../features/compare/ComparePage")) },
          { path: "detail/:id", element: <LegacyArticleRedirect /> },
          { path: "article/:id", element: <LegacyArticleRedirect /> },
          { path: "login", lazy: page(() => import("../features/auth/LoginPage")), handle: { bare: true } },
          { path: "register", lazy: page(() => import("../features/auth/RegisterPage")), handle: { bare: true } },
          { path: "forgot-password", lazy: page(() => import("../features/auth/ForgotPasswordPage")), handle: { bare: true } },
          { path: "reset-password/:token", lazy: page(() => import("../features/auth/ResetPasswordTokenPage")), handle: { bare: true } },
          { path: "reset-password", lazy: page(() => import("../features/auth/ChangePasswordPage")) },
          { path: "profile", lazy: page(() => import("../features/profile/ProfilePage")) },
          { path: "notifications", lazy: page(() => import("../features/notifications/NotificationsPage")) },
          { path: "about", lazy: page(() => import("../pages/AboutPage")) },
          { path: "contact", lazy: page(() => import("../pages/ContactPage")) },
          { path: "help", lazy: page(() => import("../pages/HelpPage")) },
          { path: "*", lazy: page(() => import("../pages/NotFoundPage")) },
        ],
      },
      { path: "admin/login", lazy: page(() => import("../features/admin/AdminLoginPage")) },
      {
        path: "admin",
        lazy: page(() => import("../layouts/AdminLayout")),
        children: [
          { index: true, lazy: page(() => import("../features/admin/DashboardPage")) },
          { path: "dashboard", lazy: page(() => import("../features/admin/DashboardPage")) },
          { path: "articles", lazy: page(() => import("../features/admin/ArticlesManagePage")) },
          { path: "create-article", lazy: page(() => import("../features/admin/editor/ArticleEditorPage")) },
          { path: "edit-article/:id", lazy: page(() => import("../features/admin/editor/ArticleEditorPage")) },
          { path: "categories", lazy: page(() => import("../features/admin/CategoryManagementPage")) },
          { path: "dashboard/category", element: <Navigate to="/admin/categories" replace /> },
          { path: "profile", lazy: page(() => import("../features/admin/AdminProfilePage")) },
          { path: "dashboard/profile", element: <Navigate to="/admin/profile" replace /> },
          { path: "notification", lazy: page(() => import("../features/admin/AdminNotificationsPage")) },
          { path: "dashboard/notification", element: <Navigate to="/admin/notification" replace /> },
          { path: "reset-password", lazy: page(() => import("../features/admin/AdminChangePasswordPage")) },
          { path: "*", lazy: page(() => import("../pages/NotFoundPage")) },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
