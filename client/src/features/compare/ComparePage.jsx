import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftRight, Gauge, Trophy } from "lucide-react";
import SpecBars from "./SpecBars";
import { SPEC_METRICS, SPEC_TEXT, winnerOf } from "./specs";
import SmartImage from "../../components/ui/SmartImage";
import { coverOf } from "../../lib/image";
import { ErrorState, Skeleton } from "../../components/ui/States";
import { compareCars } from "../../api/discovery";
import { listArticles } from "../../api/articles";
import { getErrorMessage, isAbortError } from "../../lib/apiClient";
import { articlePath } from "../articles/paths";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { EASE } from "../../lib/motion";

const carName = (c) => c?.specs?.model || c?.title || "";

function Picker({ label, value, options, onChange, exclude, tone }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label-apex flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden="true" />
        {label}
      </label>
      <select id={id} className="field-apex" value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a car…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id} disabled={String(o.id) === String(exclude)}>
            {[o.make, o.specs?.model || o.title].filter(Boolean).join(" — ")}
          </option>
        ))}
      </select>
    </div>
  );
}

function CarColumn({ car, side }) {
  if (!car) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-[6px] border border-dashed border-line-strong text-sm text-subtle">
        <Gauge className="mr-2 h-4 w-4" aria-hidden="true" /> Pick a car
      </div>
    );
  }
  return (
    <m.div key={car.article_id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: side * 0.08 }}>
      <Link to={articlePath(car)} viewTransition className="group block">
        <SmartImage src={coverOf(car).path} fallback={coverOf(car).fallback} alt="" ratio="4 / 3" sizes="(min-width: 1024px) 40vw, 50vw" className="rounded-[6px]" imgClassName="zoom-img" />
        <p className="kicker mt-4">{car.make || "—"}</p>
        <h2 className="mt-1 font-display text-xl font-bold leading-tight md:text-2xl">
          <span className="sweep">{carName(car)}</span>
        </h2>
      </Link>
    </m.div>
  );
}

/** /compare?ids=a,b — two pickers, side-by-side spec bars, cyan winner highlights. */
export default function ComparePage() {
  useDocumentTitle("Spec showdown", "Put two performance cars side by side: power, torque, 0–100, top speed, weight and price.");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ids = (params.get("ids") || "").split(",").filter(Boolean).slice(0, 2);
  const [a, b] = [ids[0] || "", ids[1] || ""];

  const [options, setOptions] = useState({ loading: true, items: [] });
  const [state, setState] = useState({ loading: false, cars: [], error: null, unavailable: false });

  useEffect(() => {
    const controller = new AbortController();
    // Only cars with a spec sheet can be compared (the API filters on has_specs; the client
    // filter guards against an older API that ignores the parameter).
    listArticles({ limit: 50, sort: "latest", hasSpecs: true }, { signal: controller.signal })
      .then(({ articles }) => setOptions({ loading: false, items: articles.filter((x) => x.has_specs) }))
      .catch((err) => !isAbortError(err) && setOptions({ loading: false, items: [] }));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!a && !b) {
      setState({ loading: false, cars: [], error: null, unavailable: false });
      return undefined;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null, unavailable: false }));
    compareCars([a, b].filter(Boolean), { signal: controller.signal })
      .then((cars) => setState({ loading: false, cars, error: null, unavailable: false }))
      .catch((err) => {
        if (isAbortError(err)) return;
        setState({
          loading: false,
          cars: [],
          unavailable: err?.code === "COMPARE_UNAVAILABLE" || err?.status === 400,
          error: getErrorMessage(err, "Couldn't load the comparison"),
        });
      });
    return () => controller.abort();
  }, [a, b]);

  // Built by hand so the shared URL keeps a literal comma (?ids=3,1), as documented.
  const setIds = (next) => {
    const clean = next.filter(Boolean).map((v) => encodeURIComponent(String(v)));
    navigate({ search: clean.length ? `?ids=${clean.join(",")}` : "" }, { replace: true, preventScrollReset: true });
  };
  const byId = (id) => state.cars.find((c) => String(c.article_id) === String(id) || c.slug === id) || null;
  const carA = a ? byId(a) : null;
  const carB = b ? byId(b) : null;

  const score = useMemo(() => {
    if (!carA?.specs || !carB?.specs) return null;
    const s = [0, 0];
    SPEC_METRICS.forEach((mt) => {
      const w = winnerOf(mt, carA.specs[mt.key], carB.specs[mt.key]);
      if (w !== null) s[w] += 1;
    });
    return s;
  }, [carA, carB]);

  return (
    <div className="shell pb-8 pt-14 md:pt-20">
      <header className="max-w-3xl">
        <p className="kicker">Telemetry</p>
        <h1 className="mt-3 font-expanded text-[clamp(40px,6vw,76px)] font-extrabold leading-[0.95] tracking-[-0.02em]">Spec showdown</h1>
        <p className="mt-4 text-lg text-muted">
          Two cars, six numbers, no marketing. Bars grow toward the better figure; the winner of each line lights up in cyan.
        </p>
      </header>

      <div className="mt-10 grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
        <Picker label="Car A" tone="bg-data" value={a} exclude={b} options={options.items} onChange={(v) => setIds([v, b])} />
        <button
          type="button"
          onClick={() => setIds([b, a])}
          disabled={!a || !b}
          aria-label="Swap cars"
          className="btn-apex btn-ghost-apex mx-auto !px-3"
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
        </button>
        <Picker label="Car B" tone="bg-line-strong" value={b} exclude={a} options={options.items} onChange={(v) => setIds([a, v])} />
      </div>

      {state.unavailable ? (
        <div className="mt-12 rounded-[6px] border border-line bg-surface p-8 text-center">
          <Gauge className="mx-auto h-8 w-8 text-subtle" aria-hidden="true" />
          <p className="mt-4 font-display text-xl font-semibold">One of these cars has no spec sheet yet</p>
          <p className="mt-2 text-sm text-muted">Pick another model — only reviewed cars with published specs can go head to head.</p>
        </div>
      ) : state.error ? (
        <ErrorState title="Couldn't load the comparison" message={state.error} onRetry={() => setIds([a, b])} />
      ) : (
        <>
          <div className="mt-12 grid grid-cols-2 gap-4 md:gap-10">
            {state.loading ? (
              <>
                <Skeleton className="aspect-[4/3] !rounded-[6px]" />
                <Skeleton className="aspect-[4/3] !rounded-[6px]" />
              </>
            ) : (
              <>
                <CarColumn car={carA} side={0} />
                <CarColumn car={carB} side={1} />
              </>
            )}
          </div>

          <AnimatePresence>
            {score && (
              <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="mt-10 flex flex-wrap items-center gap-3 rounded-[6px] border border-line bg-surface px-5 py-4"
                role="status"
              >
                <Trophy className="h-5 w-5 text-data" aria-hidden="true" />
                <p className="text-sm">
                  {score[0] === score[1] ? (
                    <>Dead heat — {score[0]} wins each.</>
                  ) : (
                    <>
                      <span className="font-semibold text-data">{carName(score[0] > score[1] ? carA : carB)}</span> takes{" "}
                      <span className="font-mono">{Math.max(...score)}</span> of {score[0] + score[1]} measured categories.
                    </>
                  )}
                </p>
              </m.div>
            )}
          </AnimatePresence>

          {carA && carB && (
            <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
              <section className="card-apex p-6 md:p-8" aria-label="Performance comparison">
                <div className="mb-6 flex justify-between text-xs">
                  <span className="flex items-center gap-2 text-muted">
                    <span className="h-2 w-2 rounded-full bg-data" aria-hidden="true" /> {carName(carA)}
                  </span>
                  <span className="text-subtle">top bar · bottom bar</span>
                  <span className="flex items-center gap-2 text-muted">
                    {carName(carB)} <span className="h-2 w-2 rounded-full bg-line-strong" aria-hidden="true" />
                  </span>
                </div>
                <SpecBars cars={[{ title: carName(carA), specs: carA.specs }, { title: carName(carB), specs: carB.specs }]} />
              </section>
              <section className="card-apex overflow-hidden" aria-label="Specification details">
                <table className="w-full text-sm">
                  <caption className="sr-only">Specification details</caption>
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className="meta px-5 py-3 text-left font-normal">
                        Spec
                      </th>
                      <th scope="col" className="px-3 py-3 text-left font-display font-semibold">
                        {carName(carA)}
                      </th>
                      <th scope="col" className="px-3 py-3 text-left font-display font-semibold">
                        {carName(carB)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SPEC_TEXT.map((f) => (
                      <tr key={f.key} className="border-b border-line last:border-0">
                        <th scope="row" className="px-5 py-3 text-left font-normal text-muted">
                          {f.label}
                        </th>
                        <td className="px-3 py-3 font-mono text-[13px]">{carA.specs?.[f.key] ?? "—"}</td>
                        <td className="px-3 py-3 font-mono text-[13px]">{carB.specs?.[f.key] ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {!a && !b && !options.loading && options.items.length >= 2 && (
            <div className="mt-12 text-center">
              <p className="text-muted">Not sure where to start?</p>
              <button type="button" className="btn-apex btn-primary-apex mt-4" onClick={() => setIds([options.items[0].id, options.items[1].id])}>
                Try {options.items[0].make} vs {options.items[1].make}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
