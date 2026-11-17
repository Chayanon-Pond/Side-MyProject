/** Holds the Lenis instance (if smooth scrolling is active) so any component can scroll consistently. */
let lenis = null;

export const setLenis = (instance) => {
  lenis = instance;
};

export const getLenis = () => lenis;

export const NAV_OFFSET = 88;

/** Scroll to an element or y-position, through Lenis when active, natively otherwise. */
export const scrollToTarget = (target, { offset = -NAV_OFFSET, immediate = false } = {}) => {
  if (lenis) {
    lenis.scrollTo(target, { offset, immediate, duration: 1.1 });
    return;
  }
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const y =
    typeof target === "number"
      ? target
      : (typeof target === "string" ? document.querySelector(target) : target)?.getBoundingClientRect().top +
        window.scrollY +
        offset;
  if (Number.isFinite(y)) window.scrollTo({ top: y, behavior: immediate || reduce ? "auto" : "smooth" });
};

export const lockScroll = (locked) => {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
};
