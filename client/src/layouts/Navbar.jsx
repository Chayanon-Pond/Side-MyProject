import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Link, useLocation, useMatches, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, Search, Settings, User, KeyRound, Bell } from "lucide-react";
import Wordmark from "../components/brand/Wordmark";
import ThemeToggle from "../components/ui/ThemeToggle";
import Avatar from "../components/ui/Avatar";
import NotificationDropdown from "../features/notifications/NotificationDropdown";
import { useAuth } from "../features/auth/AuthContext";
import { useSearch } from "../features/search/SearchProvider";
import { useMakes } from "../hooks/useMakes";
import { makePath } from "../features/articles/paths";
import { displayName } from "../lib/format";
import { EASE } from "../lib/motion";

// The full-screen sheet loads on first open.
const MobileMenu = lazy(() => import("./MobileMenu"));

const SECTIONS = [
  { label: "Reviews", type: "review" },
  { label: "News", type: "news" },
  { label: "Features", type: "feature" },
];

const useOutside = (ref, onOutside, active) => {
  useEffect(() => {
    if (!active) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && onOutside();
    const onKey = (e) => e.key === "Escape" && onOutside();
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onOutside, active]);
};

function Underline() {
  return (
    <m.span
      layoutId="nav-underline"
      className="absolute inset-x-3 -bottom-px h-0.5 bg-papaya"
      transition={{ duration: 0.3, ease: EASE }}
      aria-hidden="true"
    />
  );
}

function MakesMenu({ active }) {
  const { makes } = useMakes();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname, search } = useLocation();
  useOutside(ref, () => setOpen(false), open);
  useEffect(() => setOpen(false), [pathname, search]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-16 items-center gap-1 px-3 text-sm font-medium opacity-90 transition-opacity hover:opacity-100"
      >
        Makes
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        {active && <Underline />}
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute left-1/2 top-full z-50 w-[320px] -translate-x-1/2 rounded-[6px] border border-line bg-surface p-2 text-fg shadow-2xl"
          >
            <p className="meta px-3 pb-2 pt-2">Browse by make</p>
            <ul className="grid grid-cols-2 gap-1">
              {makes.map((mk) => (
                <li key={mk.make}>
                  <Link
                    to={makePath(mk.make)}
                    viewTransition
                    className="flex items-center justify-between rounded-[2px] px-3 py-2 text-sm hover:bg-surface-2"
                  >
                    <span>{mk.make}</span>
                    <span className="font-mono text-xs text-subtle">{mk.count}</span>
                  </Link>
                </li>
              ))}
              {makes.length === 0 && <li className="col-span-2 px-3 py-2 text-sm text-muted">No makes yet</li>}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountMenu() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  useOutside(ref, () => setOpen(false), open);
  useEffect(() => setOpen(false), [pathname]);
  const name = displayName(user);
  const item = "flex w-full items-center gap-3 rounded-[2px] px-3 py-2 text-sm text-fg hover:bg-surface-2";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-10 items-center gap-2 rounded-[2px] px-1.5 hover:bg-current/10"
      >
        <Avatar src={user.profile_image_url} name={name} size={30} />
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: EASE }}
            className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right rounded-[6px] border border-line bg-surface p-1.5 shadow-2xl"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-fg">{name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <Link to="/profile" role="menuitem" className={item}>
              <User className="h-4 w-4 text-muted" aria-hidden="true" /> Profile
            </Link>
            <Link to="/notifications" role="menuitem" className={item}>
              <Bell className="h-4 w-4 text-muted" aria-hidden="true" /> Notifications
            </Link>
            <Link to="/reset-password" role="menuitem" className={item}>
              <KeyRound className="h-4 w-4 text-muted" aria-hidden="true" /> Change password
            </Link>
            {isAdmin && (
              <Link to="/admin" role="menuitem" className={item}>
                <Settings className="h-4 w-4 text-muted" aria-hidden="true" /> Admin
              </Link>
            )}
            <div className="my-1 h-px bg-line" />
            <button
              type="button"
              role="menuitem"
              className={item}
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <LogOut className="h-4 w-4 text-muted" aria-hidden="true" /> Log out
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * 64px bar. Transparent over a hero, solid Carbon + blur + hairline after 24px of scroll,
 * hides on scroll-down and returns on scroll-up. Active section gets a gliding Papaya underline.
 */
export default function Navbar() {
  const { user } = useAuth();
  const search = useSearch();
  const location = useLocation();
  const heroNav = useMatches().some((mt) => mt.handle?.heroNav);
  const [solid, setSolid] = useState(!heroNav);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  if (menuOpen && !menuMounted) setMenuMounted(true);

  useEffect(() => {
    setSolid(!heroNav || window.scrollY > 24);
    setHidden(false);
    setMenuOpen(false);
  }, [heroNav, location.pathname]);

  // A plain passive scroll listener reading only window.scrollY (no layout reads): motion's
  // useScroll() measured the whole document's scroll size on every update while the page loaded.
  const menuOpenRef = useRef(menuOpen);
  menuOpenRef.current = menuOpen;
  useEffect(() => {
    let prev = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setSolid(!heroNav || y > 24);
      if (!menuOpenRef.current) {
        if (y > 200 && y > prev + 6) setHidden(true);
        else if (y < prev - 6 || y < 200) setHidden(false);
      }
      prev = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [heroNav]);

  const params = new URLSearchParams(location.search);
  const onList = location.pathname === "/articles";
  const activeType = onList ? params.get("type") : null;
  const makesActive = onList && Boolean(params.get("make"));
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  return (
    <>
      <m.header
        initial={false}
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={{ duration: 0.3, ease: EASE }}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,color,backdrop-filter] duration-300 ${
          solid
            ? "border-b border-line bg-[var(--nav-solid)] text-fg backdrop-blur-xl backdrop-saturate-150"
            : "border-b border-transparent bg-transparent text-hero"
        }`}
      >
        {!solid && (
          <div className="pointer-events-none absolute inset-0 -z-10 h-28 bg-gradient-to-b from-black/50 to-transparent" aria-hidden="true" />
        )}
        <nav aria-label="Main" className="shell flex h-16 items-center justify-between gap-4">
          <Link to="/" viewTransition aria-label="APEX — home" className="-ml-1 flex items-center p-1">
            <Wordmark className="h-[22px] w-auto" />
          </Link>

          <ul className="hidden items-center lg:flex">
            {SECTIONS.map((s) => (
              <li key={s.type}>
                <Link
                  to={`/articles?type=${s.type}`}
                  viewTransition
                  className="relative inline-flex h-16 items-center px-3 text-sm font-medium opacity-90 transition-opacity hover:opacity-100"
                  aria-current={activeType === s.type ? "page" : undefined}
                >
                  {s.label}
                  {activeType === s.type && <Underline />}
                </Link>
              </li>
            ))}
            <li>
              <MakesMenu active={makesActive} />
            </li>
          </ul>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={search.open}
              onPointerEnter={search.preload}
              onFocus={search.preload}
              // Accessible name starts with (and contains) the visible label "Search ⌘K / Ctrl K".
              aria-label={`Search ${isMac ? "⌘K" : "Ctrl K"}`}
              aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
              className="inline-flex h-10 items-center gap-2 rounded-[2px] px-2.5 text-sm hover:bg-current/10 md:border md:border-current/20 md:pr-2"
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
              <span className="hidden opacity-80 md:inline">Search</span>
              <kbd className="hidden rounded-[2px] border border-current/25 px-1.5 font-mono text-[11px] opacity-70 md:inline">
                {isMac ? "⌘K" : "Ctrl K"}
              </kbd>
            </button>
            <ThemeToggle className="hidden sm:inline-flex" />
            {user ? (
              <div className="hidden items-center gap-1 sm:flex">
                <NotificationDropdown />
                <AccountMenu />
              </div>
            ) : (
              <Link
                to="/login"
                state={{ from: location.pathname + location.search }}
                className="ml-1 hidden h-10 items-center rounded-[2px] px-3 text-sm font-semibold hover:bg-current/10 sm:inline-flex"
              >
                Sign in
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              onPointerEnter={() => import("./MobileMenu")}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[2px] hover:bg-current/10 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </m.header>
      {menuMounted && (
        <Suspense fallback={null}>
          <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
