/**
 * index.html's boot script may paint the cover photo in #boot-hero before the app runs.
 * The React hero calls this once its own image has loaded (or the route has no hero), and the
 * placeholder layer is removed. Safe to call any number of times.
 */
export const releaseBootHero = () => {
  if (typeof document === "undefined") return;
  document.getElementById("boot-hero")?.remove();
};
