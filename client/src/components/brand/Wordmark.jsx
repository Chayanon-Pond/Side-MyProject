import { WORDMARK_PATHS } from "./wordmarkPaths";

/**
 * APEX wordmark — original geometric letterforms (no font dependency).
 * The A has no crossbar; a forward-slanted Papaya "speed cut" bar runs through it
 * and breaks out past the left leg.
 */

const Wordmark = ({ className = "", title = "APEX", barClassName = "" }) => (
  <svg
    viewBox="0 0 144 40"
    className={className}
    {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true, focusable: "false" })}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fill="currentColor" fillRule="evenodd">
      <path d={WORDMARK_PATHS.a} />
      <path d={WORDMARK_PATHS.p} />
      <path d={WORDMARK_PATHS.e} />
      <path d={WORDMARK_PATHS.x} />
    </g>
    <path d={WORDMARK_PATHS.bar} fill="var(--papaya)" className={barClassName} />
  </svg>
);

/** Square monogram (the A + speed cut) — used in the admin rail and the intro loader. */
export const Monogram = ({ className = "", title = "APEX" }) => (
  <svg viewBox="0 0 40 40" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
    <path d="M1 36 14.5 4h11L39 36h-8.4L20 11.4 9.4 36z" fill="currentColor" />
    <path d="M3 29.5h25.5l2.5-5H5.5z" fill="var(--papaya)" />
  </svg>
);

export default Wordmark;
