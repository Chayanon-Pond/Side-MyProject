import { useEffect } from "react";
import { m } from "motion/react";
import { Outlet, useLocation, useMatches } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import SkipLink from "./SkipLink";
// Kept in the main chunk on purpose: a lazily loaded intro would cover an already painted page.
import IntroLoader from "../components/brand/IntroLoader";
import { setLenis } from "../lib/smoothScroll";
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

// Browsers with the View Transitions API get the CSS root transition; others get this fade-up.
const NATIVE_VT = supportsViewTransitions();

/** Public shell: Navbar + Footer rendered once around every public route. */
const PublicLayout = () => {
  useSmoothScroll();
  const location = useLocation();
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
