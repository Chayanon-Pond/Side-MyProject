import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";

const loadOverlay = () => import("./SearchOverlay");
const SearchOverlay = lazy(loadOverlay);

const SearchContext = createContext({ open: () => {}, close: () => {}, preload: () => {}, isOpen: false });

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export const useSearch = () => useContext(SearchContext);

const isTypingTarget = (el) =>
  el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);

/** ⌘K / Ctrl+K (and "/") open the search overlay anywhere on the public site. The overlay chunk loads on demand. */
export function SearchProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  // Keep the overlay mounted after first use so its exit animation can play.
  const [mounted, setMounted] = useState(false);
  if (isOpen && !mounted) setMounted(true);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const preload = useCallback(() => {
    loadOverlay();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (window.location.pathname.startsWith("/admin")) return;
        e.preventDefault();
        setIsOpen((o) => !o);
      } else if (e.key === "/" && !isTypingTarget(document.activeElement) && !window.location.pathname.startsWith("/admin")) {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ open, close, preload, isOpen }), [open, close, preload, isOpen]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      {mounted && (
        <Suspense fallback={null}>
          <SearchOverlay open={isOpen} onClose={close} />
        </Suspense>
      )}
    </SearchContext.Provider>
  );
}
