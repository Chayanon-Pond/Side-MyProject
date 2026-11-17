import { prefersReducedMotion } from "../../lib/motion";

const KEY = "apex-intro-seen";

/** First visit per session only (and never with reduced motion). Marks the session as seen. */
export const shouldShowIntro = () => {
  if (typeof window === "undefined" || prefersReducedMotion()) return false;
  try {
    if (sessionStorage.getItem(KEY)) return false;
    sessionStorage.setItem(KEY, "1");
    return true;
  } catch {
    return false;
  }
};
