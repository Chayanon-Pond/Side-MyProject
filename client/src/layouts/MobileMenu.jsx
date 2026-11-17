import { useEffect, useRef } from "react";
import { AnimatePresence, m } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Search, X } from "lucide-react";
import Wordmark from "../components/brand/Wordmark";
import ThemeToggle from "../components/ui/ThemeToggle";
import Avatar from "../components/ui/Avatar";
import { useAuth } from "../features/auth/AuthContext";
import { useSearch } from "../features/search/SearchProvider";
import { useMakes } from "../hooks/useMakes";
import { makePath } from "../features/articles/paths";
import { lockScroll } from "../lib/smoothScroll";
import { displayName } from "../lib/format";
import { EASE } from "../lib/motion";

const BIG_LINKS = [
  { to: "/articles?type=review", label: "Reviews" },
  { to: "/articles?type=news", label: "News" },
  { to: "/articles?type=feature", label: "Features" },
  { to: "/compare", label: "Compare" },
  { to: "/articles", label: "Everything" },
];

/** Full-screen sheet with large type; links stagger up, the sheet wipes down from the top. */
export default function MobileMenu({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const { makes } = useMakes();
  const search = useSearch();
  const navigate = useNavigate();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    lockScroll(true);
    const t = setTimeout(() => closeRef.current?.focus(), 50);
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <m.div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-[70] flex flex-col bg-bg text-fg lg:hidden"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.6, ease: EASE }}
          data-lenis-prevent
        >
          <div className="shell flex h-16 shrink-0 items-center justify-between border-b border-line">
            <Link to="/" onClick={onClose} aria-label="APEX — home">
              <Wordmark className="h-[22px] w-auto" />
            </Link>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[2px] hover:bg-surface-2"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="shell flex-1 overflow-y-auto py-6">
            <button
              type="button"
              onClick={() => {
                onClose();
                setTimeout(search.open, 300);
              }}
              className="field-apex flex items-center gap-3 text-left text-muted"
            >
              <Search className="h-4 w-4" aria-hidden="true" /> Search APEX
            </button>

            <m.ul
              className="mt-8 space-y-1"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}
            >
              {BIG_LINKS.map((l) => (
                <m.li
                  key={l.to}
                  variants={{ hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                >
                  <Link
                    to={l.to}
                    onClick={onClose}
                    className="group flex items-baseline justify-between border-b border-line py-3 font-display text-4xl font-bold tracking-tight"
                  >
                    <span className="font-expanded text-[clamp(2rem,9vw,3rem)] leading-none">{l.label}</span>
                    <ArrowUpRight className="h-6 w-6 text-papaya-ink opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  </Link>
                </m.li>
              ))}
            </m.ul>

            {makes.length > 0 && (
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className="mt-8">
                <p className="meta mb-3">Makes</p>
                <div className="flex flex-wrap gap-2">
                  {makes.map((mk) => (
                    <Link key={mk.make} to={makePath(mk.make)} onClick={onClose} className="chip">
                      {mk.make}
                    </Link>
                  ))}
                </div>
              </m.div>
            )}
          </div>

          <div className="shell shrink-0 border-t border-line py-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Avatar src={user.profile_image_url} name={displayName(user)} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{displayName(user)}</p>
                  <div className="flex flex-wrap gap-x-4 text-sm text-muted">
                    <Link to="/profile" onClick={onClose} className="hover:text-fg">Profile</Link>
                    <Link to="/notifications" onClick={onClose} className="hover:text-fg">Notifications</Link>
                    {isAdmin && <Link to="/admin" onClick={onClose} className="hover:text-fg">Admin</Link>}
                    <button
                      type="button"
                      className="hover:text-fg"
                      onClick={() => {
                        logout();
                        onClose();
                        navigate("/");
                      }}
                    >
                      Log out
                    </button>
                  </div>
                </div>
                <ThemeToggle />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" onClick={onClose} className="btn-apex btn-primary-apex flex-1">
                  Sign in
                </Link>
                <Link to="/register" onClick={onClose} className="btn-apex btn-ghost-apex flex-1 whitespace-nowrap">
                  Join free
                </Link>
                <ThemeToggle />
              </div>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
