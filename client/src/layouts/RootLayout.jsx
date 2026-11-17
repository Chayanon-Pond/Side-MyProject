import { Outlet, ScrollRestoration } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthContext";
import { NotificationProvider } from "../features/notifications/NotificationContext";
import { SearchProvider } from "../features/search/SearchProvider";
import MotionProvider from "../components/motion/MotionProvider";
import RouteProgress from "../components/ui/RouteProgress";
import ToasterHost from "../components/ui/ToasterHost";
import { useTheme } from "../lib/theme";

/** Providers shared by the public site and the admin. */
export default function RootLayout() {
  const { isDark } = useTheme();
  return (
    <MotionProvider>
      <AuthProvider>
        <NotificationProvider>
          <SearchProvider>
            <RouteProgress />
            <Outlet />
          </SearchProvider>
        </NotificationProvider>
      </AuthProvider>
      {/* sonner loads on the first toast or when idle (lib/toast.js), not in the main bundle. */}
      <ToasterHost theme={isDark ? "dark" : "light"} />
      {/* Default key (location.key): Back/Forward restores the old position, every new link opens at the top.
          Keying by pathname made revisiting an article jump back to wherever you left it (e.g. the footer). */}
      <ScrollRestoration />
    </MotionProvider>
  );
}
