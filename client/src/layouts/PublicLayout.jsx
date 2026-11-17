import { useEffect, useLayoutEffect, useRef } from "react";
import { m } from "motion/react";
import { Outlet, useLocation, useMatches, useNavigationType } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SkipLink from "./SkipLink";
// Kept in the main chunk on purpose: a lazily loaded intro would cover an already painted page.
import IntroLoader from "../components/brand/IntroLoader";
import { getLenis, setLenis } from "../lib/smoothScroll";
import { releaseBootHero } from "../lib/bootHero";
import { EASE, isCoarsePointer, prefersReducedMotion, supportsViewTransitions } from "../lib/motion";

/** Lenis smooth scroll on desktop pointers only; off for reduced motion and touch. */
function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion() || isCoarsePointer()) return undefined;
    let lenis = null;
    let cancelled = false;
    // Loaded after first paint so it never weighs on the main bundle.
    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ autoRaf: true, duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3) });
      setLenis(lenis);
    });
    return () => {
      cancelled = true;
      setLenis(null);
      lenis?.destroy();
    };
  }, []);
}

/** Last scroll position per history entry (location.key), kept live so Back/Forward can return to it exactly. */
const scrollPositions = new Map();

const jumpTo = (y) => {
  const lenis = getLenis();
  if (lenis) {
    lenis.resize(); // Lenis clamps to its cached page height; refresh it first or a just-grown page gets cut short
    lenis.scrollTo(y, { immediate: true, force: true });
  }
  else window.scrollTo(0, y);
};

/**
 * Scroll on navigation, done here instead of relying on ScrollRestoration alone:
 *  - New page: always the top. Lenis keeps its own target, so a link clicked during (or just after) a wheel glide
 *    used to keep gliding and drop the new page at the middle/bottom.
 *  - Back/Forward: the exact position the reader left. Article bodies load after the route renders, so the page is
 *    short at first; keep retrying (up to ~4 s) until it is tall enough, unless the reader starts scrolling.
 *  - In-place filter/compare updates (replace on the same path) leave the scroll alone.
 */
function useNavigationScroll(location) {
  const navType = useNavigationType();
  const prevPath = useRef(location.pathname);
  const keyRef = useRef(location.key);

  useEffect(() => {
    let frame = 0;
    const save = () => {
      frame = 0;
      scrollPositions.set(keyRef.current, window.scrollY);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(save);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    const samePage = prevPath.current === location.pathname;
    prevPath.current = location.pathname;
    keyRef.current = location.key;
    if (navType === "REPLACE" && samePage) return undefined;

    if (navType !== "POP") {
      if (!location.hash) jumpTo(0);
      return undefined;
    }

    const desired = scrollPositions.get(location.key);
    if (typeof desired !== "number") return undefined; // first load / reload: browser + ScrollRestoration handle it
    let id = 0;
    let frames = 0;
    let aborted = false;
    const abort = () => {
      aborted = true;
    };
    const opts = { passive: true, once: true };
    window.addEventListener("wheel", abort, opts);
    window.addEventListener("touchstart", abort, opts);
    window.addEventListener("keydown", abort, opts);
    const tick = () => {
      if (aborted) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      jumpTo(Math.min(desired, Math.max(0, max)));
      // keep going until we actually landed there (page tall enough and the jump took), ~4 s max
      if (Math.abs(window.scrollY - desired) > 2 && frames++ < 240) id = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("wheel", abort);
      window.removeEventListener("touchstart", abort);
      window.removeEventListener("keydown", abort);
    };
    // location.key changes on every navigation (PUSH/REPLACE/POP)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);
}

// Browsers with the View Transitions API get the CSS root transition; others get this fade-up.
const NATIVE_VT = supportsViewTransitions();

/** Public shell: Navbar + Footer rendered once around every public route. */
const PublicLayout = () => {
  useSmoothScroll();
  const location = useLocation();
  useNavigationScroll(location);
  const matches = useMatches();
  const heroNav = matches.some((mt) => mt.handle?.heroNav);
  const bare = matches.some((mt) => mt.handle?.bare);
  // Routes without a full-bleed hero never keep the boot script's cover layer.
  useEffect(() => {
    if (!heroNav) releaseBootHero();
  }, [heroNav, location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <SkipLink />
      <IntroLoader />
      <Navbar />
      <m.main
        key={location.pathname}
        id="main"
        tabIndex={-1}
        className={`flex-1 focus:outline-none ${heroNav ? "" : "pt-16"}`}
        initial={NATIVE_VT ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <Outlet />
      </m.main>
      {!bare && <Footer />}
    </div>
  );
};

export default PublicLayout;
