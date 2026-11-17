import { m } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import CountUp from "../../../components/motion/CountUp";
import { SPEC_METRICS, SPEC_SCALE, SPEC_TEXT, formatSpec, hasSpecs } from "../../compare/specs";
import { EASE } from "../../../lib/motion";

/** Telemetry-style spec card: numbers count up and gauge bars fill when visible. */
export default function SpecSheet({ specs, articleId, className = "" }) {
  if (!hasSpecs(specs)) return null;
  const metrics = SPEC_METRICS.filter((mt) => specs[mt.key] != null && specs[mt.key] !== "");
  const facts = SPEC_TEXT.filter((f) => specs[f.key] != null && specs[f.key] !== "");

  return (
    <section className={`card-apex overflow-hidden ${className}`} aria-labelledby="spec-sheet-title">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 id="spec-sheet-title" className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-data">
          Spec sheet
        </h2>
        {specs.model && <p className="truncate pl-4 font-display text-sm font-semibold">{specs.model}</p>}
      </div>
      <dl className="grid grid-cols-2">
        {metrics.map((mt, i) => {
          const scale = SPEC_SCALE[mt.key];
          const v = Number(specs[mt.key]);
          const share = mt.better === "low" ? Math.min(1, Math.max(0.08, 1 - v / scale + 0.15)) : Math.min(1, v / scale);
          return (
            <div key={mt.key} className={`border-line px-5 py-4 ${i % 2 === 0 ? "border-r" : ""} ${i >= 2 ? "border-t" : ""}`}>
              <dt className="meta">{mt.label}</dt>
              <dd className="mt-1.5">
                <CountUp value={v} format={(n) => formatSpec(mt, n)} className="text-2xl font-medium text-fg" />
                {!mt.money && <span className="ml-1 font-mono text-xs text-subtle">{mt.unit}</span>}
                <div className="mt-3 h-1 overflow-hidden rounded-[1px] bg-surface-2" aria-hidden="true">
                  <m.div
                    className="h-full origin-left bg-data"
                    style={{ width: `${share * 100}%` }}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, ease: EASE, delay: 0.1 + i * 0.05 }}
                  />
                </div>
              </dd>
            </div>
          );
        })}
      </dl>
      {facts.length > 0 && (
        <dl className="border-t border-line px-5 py-4 text-sm">
          {facts.map((f) => (
            <div key={f.key} className="flex justify-between gap-4 py-1">
              <dt className="text-muted">{f.label}</dt>
              <dd className="text-right font-mono text-[13px]">{specs[f.key]}</dd>
            </div>
          ))}
        </dl>
      )}
      {articleId && (
        <Link
          to={`/compare?ids=${articleId}`}
          viewTransition
          className="group flex items-center justify-between border-t border-line px-5 py-3.5 text-sm font-medium hover:bg-surface-2"
        >
          Compare with another car
          <ArrowRight className="h-4 w-4 text-papaya-ink transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
