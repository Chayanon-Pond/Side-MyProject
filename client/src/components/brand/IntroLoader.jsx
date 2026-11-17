import { useEffect, useState } from "react";
import { WORDMARK_PATHS } from "./wordmarkPaths";
import { shouldShowIntro } from "./introGate";

const LETTERS = ["a", "p", "e", "x"];

/**
 * First visit per session only: letters rise out of a mask, the Papaya speed-cut slashes in,
 * then the curtain lifts. ≤1.2s total, click / any key skips. The page renders underneath the whole time.
 * All motion is CSS (index.css `.intro-*`), so the intro costs no JS per frame while the page loads.
 */
export default function IntroLoader() {
  const [phase, setPhase] = useState(() => (shouldShowIntro() ? "in" : "done"));

  useEffect(() => {
    if (phase !== "in") return undefined;
    const lift = () => setPhase("out");
    const timer = setTimeout(lift, 1150);
    window.addEventListener("keydown", lift, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", lift);
    };
  }, [phase]);

  if (phase === "done") return null;
  return (
    <div
      className={`intro-curtain fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-[#0b0b0c] text-[#f2f2f0] ${
        phase === "out" ? "intro-curtain-out" : ""
      }`}
      onClick={() => setPhase("out")}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget && phase === "out") setPhase("done");
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 144 40" className="w-[min(56vw,420px)] overflow-visible">
        <defs>
          <clipPath id="intro-mask">
            <rect x="-10" y="0" width="170" height="40" />
          </clipPath>
        </defs>
        <g clipPath="url(#intro-mask)" fill="currentColor" fillRule="evenodd">
          {LETTERS.map((k, i) => (
            <path key={k} d={WORDMARK_PATHS[k]} className="intro-letter" style={{ "--d": `${0.05 + i * 0.07}s` }} />
          ))}
        </g>
        <path d={WORDMARK_PATHS.bar} fill="#ff6a13" className="intro-bar" />
      </svg>
      <span className="anim-fade absolute bottom-10 font-mono text-[11px] uppercase tracking-[0.2em] text-[#a1a1a8]" style={{ "--d": "0.5s" }}>
        Performance cars, read closely
      </span>
    </div>
  );
}
