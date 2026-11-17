import { useEffect, useRef } from "react";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Progress of a hero scrolling out of view: 0 when its top is at the viewport top, 1 when it has left. */
export const heroProgress = (rect) => clamp01(-rect.top / (rect.height || 1));

/** Reading progress through an element: 0 when its top reaches `offset` px, 1 when its end reaches the viewport bottom. */
export const readingProgress = (offset) => (rect, viewport) =>
  clamp01((offset - rect.top) / Math.max(1, rect.height - viewport + offset));

/**
 * Scroll-linked effect without per-frame work while nothing scrolls: measures `ref` only inside a
 * scroll/resize rAF and hands the 0..1 progress to `apply` (which writes styles directly, no React
 * re-render). Replaces motion's useScroll({ target }), whose observers measured layout repeatedly while
 * the page was still loading (long tasks on mobile).
 */
export function useScrollProgress(ref, compute, apply, { enabled = true } = {}) {
  const fns = useRef({ compute, apply });
  fns.current = { compute, apply };

  useEffect(() => {
    if (!enabled) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (el) fns.current.apply(fns.current.compute(el.getBoundingClientRect(), window.innerHeight));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    if (window.scrollY > 0) schedule(); // restored scroll position
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [ref, enabled]);
}

export default useScrollProgress;
