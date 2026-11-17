import { useId, useMemo, useState } from "react";
import { m as M } from "motion/react";
import { EASE } from "../../../lib/motion";

const W = 640;
const H = 180;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };

const fmtDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" });
const fmtFull = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Smooth-ish path via Catmull-Rom → cubic Bézier. */
const curve = (pts) =>
  pts.reduce((acc, p, i, arr) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const p0 = arr[i - 2] || arr[i - 1];
    const p1 = arr[i - 1];
    const p2 = p;
    const p3 = arr[i + 1] || p;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    return `${acc} C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }, "");

/**
 * Hand-rolled 7-day views chart: cyan area + line drawn in with pathLength,
 * per-day focusable hit areas with a tooltip, and a visually-hidden data table for screen readers.
 */
export default function ViewsSparkline({ data = [] }) {
  const id = useId();
  const [active, setActive] = useState(null);

  const { pts, line, area, max } = useMemo(() => {
    const values = data.map((d) => Number(d.views) || 0);
    const mx = Math.max(1, ...values);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;
    const p = data.map((d, i) => ({
      x: PAD.left + i * step,
      y: PAD.top + innerH - (values[i] / mx) * innerH * 0.92,
      ...d,
    }));
    const l = p.length ? curve(p) : "";
    const a = p.length ? `${l} L${p[p.length - 1].x},${H - PAD.bottom} L${p[0].x},${H - PAD.bottom} Z` : "";
    return { pts: p, line: l, area: a, max: mx };
  }, [data]);

  const total = data.reduce((s, d) => s + (Number(d.views) || 0), 0);
  const tip = active !== null ? pts[active] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-labelledby={`${id}-t`}>
        <title id={`${id}-t`}>{`Views over the last 7 days: ${total.toLocaleString()} total, peak ${max.toLocaleString()}`}</title>
        <defs>
          <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--data)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--data)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + (H - PAD.top - PAD.bottom) * f}
            y2={PAD.top + (H - PAD.top - PAD.bottom) * f}
            stroke="var(--line)"
            strokeDasharray="2 4"
          />
        ))}
        <M.path
          d={area}
          fill={`url(#${id}-g)`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.6 }}
        />
        <M.path
          d={line}
          fill="none"
          stroke="var(--data)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: EASE }}
        />
        {pts.map((p, i) => (
          <g key={p.date}>
            <M.circle
              cx={p.x}
              cy={p.y}
              r={active === i ? 5 : 3}
              fill="var(--bg)"
              stroke="var(--data)"
              strokeWidth="2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: EASE, delay: 0.9 + i * 0.06 }}
            />
            <rect
              x={p.x - (W / pts.length) / 2}
              y={0}
              width={W / pts.length}
              height={H}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`${fmtFull(p.date)}: ${Number(p.views).toLocaleString()} views`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="cursor-crosshair focus:outline-none"
            />
          </g>
        ))}
        {tip && <line x1={tip.x} x2={tip.x} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--line-strong)" pointerEvents="none" />}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[11px] text-subtle" aria-hidden="true">
        {pts.map((p) => (
          <span key={p.date}>{fmtDay(p.date)}</span>
        ))}
      </div>
      {tip && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-[2px] border border-line-strong bg-surface px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%`, marginTop: -10 }}
          aria-hidden="true"
        >
          <span className="block text-muted">{fmtFull(tip.date)}</span>
          <span className="font-mono font-medium tabular-nums text-data">{Number(tip.views).toLocaleString()}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>Daily views, last 7 days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Views</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{fmtFull(d.date)}</td>
              <td>{d.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
