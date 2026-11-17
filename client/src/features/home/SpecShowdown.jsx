import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Reveal } from "../../components/motion/Reveal";
import SmartImage from "../../components/ui/SmartImage";
import { coverOf } from "../../lib/image";
import MagneticButton from "../../components/ui/MagneticButton";
import SpecBars from "../compare/SpecBars";
import { compareCars } from "../../api/discovery";
import { isAbortError } from "../../lib/apiClient";
import { articlePath, comparePath } from "../articles/paths";
import { MoreLink, SectionHead } from "./HomeSections";

/** Two reviewed cars head-to-head (specs from /api/compare) → full /compare page. */
export default function SpecShowdown({ candidates }) {
  const [cars, setCars] = useState([]);
  // Never ask /compare about a car without a spec sheet: that is a guaranteed 400.
  const eligible = candidates.filter((c) => c.has_specs).slice(0, 2);
  const ids = eligible.length === 2 ? eligible.map((c) => c.id).join(",") : "";

  useEffect(() => {
    if (!ids) return undefined;
    const controller = new AbortController();
    compareCars(ids.split(","), { signal: controller.signal })
      .then((rows) => setCars(rows.filter((r) => r.specs).slice(0, 2)))
      .catch((err) => {
        if (!isAbortError(err)) setCars([]);
      });
    return () => controller.abort();
  }, [ids]);

  if (cars.length < 2) return null;
  return (
    <section className="shell mt-24" aria-labelledby="showdown-heading">
      <SectionHead kicker="Telemetry" title="Spec showdown" id="showdown-heading" action={<MoreLink to="/compare">Build your own</MoreLink>} />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div className="grid grid-cols-2 gap-4 self-start">
          {cars.map((c, i) => (
            <Reveal key={c.article_id} delay={i * 0.1}>
              <Link to={articlePath(c)} viewTransition className="group block">
                <SmartImage src={coverOf(c).path} fallback={coverOf(c).fallback} alt="" ratio="4 / 5" sizes="(min-width: 1024px) 25vw, 50vw" className="rounded-[6px]" imgClassName="zoom-img" />
                <p className="mt-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                  <span className={`h-2 w-2 rounded-full ${i === 0 ? "bg-data" : "bg-line-strong"}`} aria-hidden="true" />
                  {c.make}
                </p>
                <p className="mt-1 font-display text-lg font-bold leading-tight">
                  <span className="sweep">{c.specs?.model || c.title}</span>
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="card-apex p-6 md:p-8">
          <SpecBars cars={cars.map((c) => ({ title: c.specs?.model || c.title, specs: c.specs }))} compact />
          <div className="mt-8">
            <MagneticButton to={comparePath(cars.map((c) => c.article_id))}>
              Open full comparison <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}

