/**
 * Hero headline size by title length: long titles step down so they fit phones, iPads and short laptop screens
 * instead of overflowing the hero (and sliding under the fixed nav).
 */
export function headlineSize(title = "", { max = 96 } = {}) {
  const n = title.length;
  if (n > 90) return "text-[clamp(30px,4.2vw,60px)]";
  if (n > 55) return "text-[clamp(34px,5.2vw,76px)]";
  return max >= 96 ? "text-[clamp(40px,7vw,96px)]" : "text-[clamp(40px,6.2vw,88px)]";
}
