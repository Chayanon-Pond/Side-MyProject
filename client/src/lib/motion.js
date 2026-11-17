/** One easing + three durations for the whole product (Apex motion spec). */
export const EASE = [0.2, 0.8, 0.2, 1];
export const DUR = { ui: 0.15, card: 0.3, hero: 0.6 };

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.card * 2, ease: EASE } },
};

export const stagger = (staggerChildren = 0.06, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

/** Matches the media query once at module load (SSR-safe) and on demand. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const isCoarsePointer = () =>
  typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

export const supportsViewTransitions = () =>
  typeof document !== "undefined" && typeof document.startViewTransition === "function";
