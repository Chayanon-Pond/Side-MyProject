import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { prefersReducedMotion } from "../../lib/motion";

/** Telemetry-style number that counts up once when it scrolls into view. */
export default function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-US"), duration = 1.2, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const target = Number(value);
  const valid = Number.isFinite(target);
  const [display, setDisplay] = useState(() => (valid ? format(0) : "—"));

  useEffect(() => {
    if (!valid || !inView) return undefined;
    if (prefersReducedMotion()) {
      setDisplay(format(target));
      return undefined;
    }
    // Tiny rAF tween (easeOutCubic) — keeps motion's full animate() engine out of the main bundle.
    let raf = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / (duration * 1000));
      setDisplay(format(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- format is a render-time formatter
  }, [inView, target, valid, duration]);

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      <span aria-hidden={valid || undefined}>{valid ? display : "—"}</span>
      {valid && <span className="sr-only">{format(target)}</span>}
    </span>
  );
}
