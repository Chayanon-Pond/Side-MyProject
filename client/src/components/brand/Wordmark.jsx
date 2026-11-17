import { WORDMARK_PATHS } from "./wordmarkPaths";

/** Site crest: the original Porsche logo (boss decision — keep it as the brand mark, name stays APEX). */
export const Crest = ({ className = "", title = "APEX" }) => (
  <img
    src="/logo/porsche-crest.webp"
    alt={title}
    width="75"
    height="96"
    decoding="async"
    draggable="false"
    className={`w-auto select-none object-contain ${className}`}
  />
);

/**
 * "APEX" lettering — geometric letterforms (no font dependency). The A has no crossbar; a forward-slanted Papaya
 * "speed cut" bar runs through it. Used on its own for the big footer watermark and the intro loader.
 */
export const ApexLetters = ({ className = "", title = "APEX", barClassName = "" }) => (
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

/**
 * Header logo: Porsche crest + "APEX" lettering. `className` sets the lettering height (e.g. h-[22px]); the crest is
 * drawn about 1.7× taller so it reads as the primary mark.
 */
const Wordmark = ({ className = "", title = "APEX", barClassName = "" }) => (
  <span className="inline-flex items-center gap-2.5" role="img" aria-label={title}>
    <Crest title="" className="h-9" />
    <ApexLetters title="" className={className} barClassName={barClassName} />
  </span>
);

/** Square mark for tight spots (admin rail when collapsed). */
export const Monogram = ({ className = "", title = "APEX" }) => <Crest title={title} className={className} />;

export default Wordmark;
