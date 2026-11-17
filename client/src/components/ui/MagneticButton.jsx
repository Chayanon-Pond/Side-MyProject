import { useRef } from "react";
import { m, useMotionValue, useSpring } from "motion/react";
import { Link } from "react-router-dom";
import { isCoarsePointer, prefersReducedMotion } from "../../lib/motion";

/**
 * Primary CTA with a subtle magnetic pull toward the cursor (desktop, fine pointers only).
 * Renders a router <Link> when `to` is given, otherwise a <button>.
 */
export default function MagneticButton({ to, children, className = "", strength = 0.25, ...rest }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  const onMove = (e) => {
    if (isCoarsePointer() || prefersReducedMotion() || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const inner = (
    <m.span style={{ x: sx, y: sy }} className="inline-flex items-center gap-2">
      {children}
    </m.span>
  );

  return (
    <m.span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x: sx, y: sy }}
      className="inline-block"
    >
      {to ? (
        <Link to={to} viewTransition className={`btn-apex btn-primary-apex ${className}`} {...rest}>
          {inner}
        </Link>
      ) : (
        <button type="button" className={`btn-apex btn-primary-apex ${className}`} {...rest}>
          {inner}
        </button>
      )}
    </m.span>
  );
}
