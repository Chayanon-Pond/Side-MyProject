import { m } from "motion/react";
import CountUp from "../../components/motion/CountUp";
import { SPEC_METRICS, barShare, formatSpec, winnerOf } from "./specs";
import { EASE } from "../../lib/motion";

/**
 * Two-car spec comparison: per metric, two bars that grow when visible; the winner is Telemetry Cyan.
 * `cars` = [{ title, specs }, { title, specs }]
 */
export default function SpecBars({ cars, metrics = SPEC_METRICS, compact = false }) {
  const [a, b] = cars;
  const rows = metrics.filter((mt) => a?.specs?.[mt.key] != null || b?.specs?.[mt.key] != null);
  return (
    <dl className={compact ? "space-y-4" : "space-y-6"}>
      {rows.map((mt) => {
        const win = winnerOf(mt, a?.specs?.[mt.key], b?.specs?.[mt.key]);
        return (
          <div key={mt.key}>
            <dt className="meta mb-2 flex items-center justify-between">
              <span>{mt.label}</span>
              <span className="text-subtle">{mt.better === "low" ? "lower is better" : mt.unit}</span>
            </dt>
            {[a, b].map((car, i) => {
              const value = car?.specs?.[mt.key];
              const share = barShare(mt, value, [a, b][1 - i]?.specs?.[mt.key]);
              const winner = win === i;
              return (
                <dd key={i} className="mt-1.5 flex items-center gap-3">
                  <span className="sr-only">{car?.title}: </span>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-[1px] bg-surface-2">
                    <m.div
                      className={`absolute inset-y-0 left-0 origin-left ${winner ? "bg-data" : "bg-line-strong"}`}
                      style={{ width: `${Math.max(share * 100, 2)}%` }}
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, amount: 0.8 }}
                      transition={{ duration: 0.9, ease: EASE, delay: i * 0.08 }}
                    />
                  </div>
                  <span className={`w-28 shrink-0 text-right text-sm ${winner ? "text-data" : "text-muted"}`}>
                    {value == null ? (
                      "—"
                    ) : (
                      <>
                        <CountUp value={value} format={(n) => formatSpec(mt, n)} />
                        {!mt.money && <span className="ml-1 font-mono text-xs text-subtle">{mt.unit}</span>}
                      </>
                    )}
                    {winner && <span className="sr-only"> (better)</span>}
                  </span>
                </dd>
              );
            })}
          </div>
        );
      })}
    </dl>
  );
}
