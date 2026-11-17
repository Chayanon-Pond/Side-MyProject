import { useState } from "react";
import { m } from "motion/react";
import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { EASE } from "../lib/motion";

// Tach face: 0–9 ×1000 rpm across 240° (from -120° to +120°), redline from 7.
const START = -120;
const SWEEP = 240;
const angleFor = (rpm) => START + (rpm / 9) * SWEEP;
const polar = (deg, r) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)];
};
const arc = (from, to, r) => {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  return `M${x1} ${y1} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

function Tachometer({ revKey }) {
  const ticks = Array.from({ length: 46 }, (_, i) => i / 5); // every 200 rpm
  return (
    <svg viewBox="0 0 200 170" className="w-full max-w-[360px]" role="img" aria-label="A tachometer needle bouncing off the limiter">
      <path d={arc(START, START + SWEEP, 86)} stroke="var(--line)" strokeWidth="2" fill="none" />
      <path d={arc(angleFor(7), START + SWEEP, 86)} stroke="var(--danger)" strokeWidth="4" fill="none" />
      {ticks.map((t) => {
        const major = Number.isInteger(t);
        const a = angleFor(t);
        const [x1, y1] = polar(a, major ? 74 : 79);
        const [x2, y2] = polar(a, 84);
        return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke={t >= 7 ? "var(--danger)" : "var(--muted)"} strokeWidth={major ? 2 : 1} />;
      })}
      {Array.from({ length: 10 }, (_, i) => {
        const [x, y] = polar(angleFor(i), 61);
        return (
          <text key={i} x={x} y={y + 4} textAnchor="middle" className="font-mono" fontSize="11" fill={i >= 7 ? "var(--danger)" : "var(--text)"}>
            {i}
          </text>
        );
      })}
      <text x="100" y="128" textAnchor="middle" className="font-mono" fontSize="7" letterSpacing="1.5" fill="var(--subtle)">
        ×1000 RPM
      </text>
      <m.g
        key={revKey}
        style={{ originX: "100px", originY: "100px" }}
        initial={{ rotate: START }}
        animate={{ rotate: [START, angleFor(8.6), angleFor(7.4), angleFor(8.8), angleFor(6.8), angleFor(8.4), angleFor(4.04)] }}
        transition={{ duration: 2.4, ease: EASE, times: [0, 0.28, 0.4, 0.52, 0.64, 0.76, 1] }}
      >
        <line x1="100" y1="108" x2="100" y2="24" stroke="var(--papaya)" strokeWidth="2.5" strokeLinecap="round" />
      </m.g>
      <circle cx="100" cy="100" r="7" fill="var(--surface-2)" stroke="var(--papaya)" strokeWidth="2" />
    </svg>
  );
}

const NotFoundPage = () => {
  useDocumentTitle("Page not found");
  const [revKey, setRevKey] = useState(0);
  return (
    <div className="shell flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <button type="button" onClick={() => setRevKey((k) => k + 1)} className="w-full max-w-[360px] cursor-pointer" aria-label="Rev it again">
        <Tachometer revKey={revKey} />
      </button>
      <p className="kicker mt-4">Error 404 · 4,040 rpm</p>
      <m.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
        className="mt-3 font-expanded text-[clamp(36px,5vw,61px)] font-extrabold leading-none tracking-tight"
      >
        Missed a shift.
      </m.h1>
      <p className="mt-4 max-w-md text-muted">The page you were looking for isn&apos;t here — it may have moved, or never existed. Tap the gauge to rev it again.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" viewTransition className="btn-apex btn-primary-apex">
          Back to the front page
        </Link>
        <Link to="/articles" viewTransition className="btn-apex btn-ghost-apex">
          Browse stories
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
