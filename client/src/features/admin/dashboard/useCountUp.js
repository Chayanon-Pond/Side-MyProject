import { useEffect, useState } from "react";
import { animate } from "motion/react";
import { prefersReducedMotion } from "../../../lib/motion";

/** Animate 0 → value once the value is known (telemetry-style count). Instant for reduced motion. */
export function useCountUp(value, { duration = 1.2, decimals = 0 } = {}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return undefined;
    const target = Number(value);
    if (prefersReducedMotion()) {
      setDisplay(target);
      return undefined;
    }
    const controls = animate(0, target, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => setDisplay(Number(v.toFixed(decimals))),
    });
    return () => controls.stop();
  }, [value, duration, decimals]);
  return display;
}
