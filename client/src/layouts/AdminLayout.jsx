import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, m as M } from "motion/react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { ExternalLink, Menu, ShieldAlert, X } from "lucide-react";
import { Sidebar } from "../features/admin/Sidebar";
import { ADMIN_NAV } from "../features/admin/adminNav";
import { useAuth } from "../features/auth/AuthContext";
import { Spinner } from "../components/ui/States";
import ThemeToggle from "../components/ui/ThemeToggle";
import Avatar from "../components/ui/Avatar";
import { displayName } from "../lib/format";
import { EASE } from "../lib/motion";
import SkipLink from "./SkipLink";

const COLLAPSE_KEY = "apex-admin-collapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

const titleFor = (pathname) => {
  if (pathname.startsWith("/admin/edit-article")) return "Edit article";
  return ADMIN_NAV.find((n) => n.match(pathname))?.label || "Newsroom";
};

const AdminLayout = () => {
  const { user, token, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [drawerOpen]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        // storage blocked: preference lasts for this visit only
      }
      return !c;
    });
  };

  if (!token || !user) return <Navigate to="/admin/login" replace />;

  if (!isAdmin) {
    return (
      <main id="main" className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
        <div className="max-w-sm text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-papaya-ink" aria-hidden="true" />
          <p className="kicker mb-2">Restricted</p>
          <h1 className="font-display text-3xl font-bold">Newsroom access only</h1>
          <p className="mt-3 text-muted">Your account doesn&apos;t have editor privileges. Sign in with an admin account to continue.</p>
          <div className="mt-8 flex justify-center gap-2">
            <Link to="/" className="btn-apex btn-ghost-apex">
              Back to APEX
            </Link>
            <Link to="/admin/login" className="btn-apex btn-primary-apex">
              Switch account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <SkipLink />

      {/* Desktop rail */}
      <M.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 248 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="sticky top-0 hidden h-screen shrink-0 overflow-hidden border-r border-line bg-surface lg:block"
        aria-label="Admin sidebar"
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} layoutKey="rail" />
      </M.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <M.div
              key="scrim"
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
            />
            <M.aside
              key="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
              className="fixed inset-y-0 left-0 z-[61] w-[280px] max-w-[85vw] border-r border-line bg-surface lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute right-2 top-3 inline-flex h-10 w-10 items-center justify-center rounded-[2px] text-muted hover:bg-surface-2 hover:text-fg"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
              <Sidebar onNavigate={() => setDrawerOpen(false)} layoutKey="drawer" />
            </M.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-[var(--nav-solid)] px-4 backdrop-blur-xl md:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[2px] hover:bg-surface-2 lg:hidden"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="meta hidden sm:block">Newsroom</p>
            <AnimatePresence mode="wait" initial={false}>
              <M.p
                key={titleFor(pathname)}
                className="truncate font-display text-lg font-semibold leading-tight"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15, ease: EASE }}
              >
                {titleFor(pathname)}
              </M.p>
            </AnimatePresence>
          </div>
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-10 items-center gap-2 rounded-[2px] px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg sm:inline-flex"
          >
            View site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <ThemeToggle className="text-muted hover:text-fg" />
          <Link to="/admin/profile" aria-label="Your profile" className="rounded-full">
            <Avatar src={user.profile_image_url} name={displayName(user)} size={32} />
          </Link>
        </header>

        <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <Suspense fallback={<Spinner />}>
            <M.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <Outlet />
            </M.div>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
