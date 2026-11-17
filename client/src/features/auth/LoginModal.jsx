import { useEffect } from "react";
import { AnimatePresence, m } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, X } from "lucide-react";
import { EASE } from "../../lib/motion";

/** Shown when a signed-out reader tries to comment/reply. */
function LoginModal({ isOpen, onClose }) {
  const location = useLocation();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const from = `${location.pathname}${location.search}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div className="fixed inset-0 z-[85] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            className="relative w-full max-w-md rounded-[12px] border border-line bg-surface p-8 text-center text-fg shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <button type="button" onClick={onClose} className="absolute right-4 top-4 text-muted hover:text-fg" aria-label="Close dialog">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-papaya/15">
              <MessageSquare className="h-5 w-5 text-papaya-ink" aria-hidden="true" />
            </span>
            <h2 id="login-modal-title" className="mt-5 font-display text-2xl font-bold">
              Join the conversation
            </h2>
            <p className="mt-2 text-muted">Sign in to comment and reply. It takes thirty seconds.</p>
            <div className="mt-8 grid gap-3">
              <Link to="/login" state={{ from }} onClick={onClose} className="btn-apex btn-primary-apex">
                Sign in
              </Link>
              <Link to="/register" onClick={onClose} className="btn-apex btn-ghost-apex">
                Create an account
              </Link>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default LoginModal;
