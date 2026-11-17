import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import ArticleCard, { Kicker } from "../articles/ArticleCard";
import { previewOf } from "../articles/preview";
import { RevealGroup, RevealItem, Reveal } from "../../components/motion/Reveal";
import NewsletterForm from "../newsletter/NewsletterForm";
import { useMakes } from "../../hooks/useMakes";
import { articlePath, makePath } from "../articles/paths";

export const SectionHead = ({ kicker, title, action, id }) => (
  <div className="mb-8 flex items-end justify-between gap-4 border-b border-line pb-4">
    <div>
      {kicker && <p className="kicker mb-2">{kicker}</p>}
      <h2 id={id} className="font-expanded text-2xl font-extrabold tracking-tight md:text-3xl">
        {title}
      </h2>
    </div>
    {action}
  </div>
);

export const MoreLink = ({ to, children }) => (
  <Link to={to} viewTransition className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
    <span className="sweep">{children}</span>
    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
  </Link>
);

/** "Also today" — three numbered headlines directly under the cover. */
export function AlsoToday({ articles }) {
  if (!articles.length) return null;
  return (
    <section aria-labelledby="also-today" className="border-b border-line bg-surface">
      <div className="shell py-8">
        <h2 id="also-today" className="meta mb-5">
          Also today
        </h2>
        <RevealGroup as="ol" className="grid gap-6 md:grid-cols-3 md:gap-10">
          {articles.map((a, i) => (
            <RevealItem as="li" key={a.id}>
              <Link to={articlePath(a)} viewTransition state={{ preview: previewOf(a) }} className="group flex gap-4">
                <span className="font-mono text-3xl font-medium leading-none text-papaya-ink tabular-nums">0{i + 1}</span>
                <span>
                  <Kicker article={a} />
                  <span className="mt-1.5 block font-display text-lg font-semibold leading-snug text-fg">
                    <span className="sweep">{a.title}</span>
                  </span>
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/** Lead story 16:9 + a "Most read" column, then a 3-up row and 4 quick reads. */
export function EditorialGrid({ lead, threeUp, quick, popular }) {
  return (
    <section className="shell pt-20" aria-labelledby="latest-heading">
      <SectionHead kicker="The latest" title="Fresh from the paddock" id="latest-heading" action={<MoreLink to="/articles">All stories</MoreLink>} />
      <div className="grid gap-12 lg:grid-cols-12">
        {lead && (
          <Reveal className="lg:col-span-8">
            <ArticleCard article={lead} variant="lead" />
          </Reveal>
        )}
        {popular.length > 0 && (
          <aside className="lg:col-span-4" aria-labelledby="most-read">
            <h3 id="most-read" className="meta mb-4">
              Most read
            </h3>
            <RevealGroup as="ol" className="divide-y divide-line border-y border-line">
              {popular.map((a, i) => (
                <RevealItem as="li" key={a.id} y={12}>
                  <Link to={articlePath(a)} viewTransition state={{ preview: previewOf(a) }} className="group flex gap-4 py-4">
                    <span className="w-6 shrink-0 font-mono text-sm text-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0">
                      <span className="block font-display text-[15px] font-semibold leading-snug">
                        <span className="sweep">{a.title}</span>
                      </span>
                      <span className="meta mt-1 block normal-case tracking-normal">
                        {(a.view_count || 0).toLocaleString("en-US")} reads
                      </span>
                    </span>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          </aside>
        )}
      </div>

      {threeUp.length > 0 && (
        <RevealGroup className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {threeUp.map((a) => (
            <RevealItem key={a.id}>
              <ArticleCard article={a} />
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      {quick.length > 0 && (
        <div className="mt-20">
          <SectionHead kicker="Five minutes or less" title="Quick reads" action={<MoreLink to="/articles?type=news">More news</MoreLink>} />
          <RevealGroup className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {quick.map((a) => (
              <RevealItem key={a.id}>
                <ArticleCard article={a} variant="compact" />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      )}
    </section>
  );
}

/** Horizontal scroll-snap rail of makes (from /api/makes). */
export function MakesRail() {
  const { makes, loading } = useMakes();
  if (!loading && makes.length === 0) return null;
  return (
    <section className="mt-24 border-y border-line bg-surface py-14" aria-labelledby="makes-heading">
      <div className="shell">
        <SectionHead kicker="Browse" title="By make" id="makes-heading" action={<MoreLink to="/articles">Every story</MoreLink>} />
      </div>
      <div className="rail no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {(loading ? Array.from({ length: 5 }, (_, i) => ({ make: `…${i}`, count: 0, ghost: true })) : makes).map((mk, i) => (
          <Reveal key={mk.make} delay={i * 0.05} y={16} className="snap-start">
            {mk.ghost ? (
              <div className="shimmer h-40 w-60 !rounded-[6px]" />
            ) : (
              <Link
                to={makePath(mk.make)}
                viewTransition
                className="group relative flex h-40 w-60 flex-col justify-between overflow-hidden rounded-[6px] border border-line bg-bg p-5 transition-colors duration-300 hover:border-papaya"
              >
                <span className="flex items-center justify-between">
                  <span className="meta">{String(mk.count).padStart(2, "0")} stories</span>
                  <ArrowUpRight
                    className="h-4 w-4 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-papaya-ink"
                    aria-hidden="true"
                  />
                </span>
                <span className="font-expanded text-2xl font-extrabold leading-none tracking-tight">{mk.make}</span>
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-papaya transition-transform duration-300 group-hover:scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            )}
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function NewsletterBand() {
  return (
    <section className="relative mt-24 overflow-hidden border-y border-line bg-surface" aria-labelledby="newsletter-heading">
      <div
        className="pointer-events-none absolute -right-20 top-1/2 h-[140%] w-1/2 -translate-y-1/2 skew-x-[-18deg] bg-papaya/[0.06]"
        aria-hidden="true"
      />
      <div className="shell relative grid items-center gap-10 py-16 md:grid-cols-2 md:py-20">
        <Reveal>
          <p className="kicker mb-3">The Friday Lap</p>
          <h2 id="newsletter-heading" className="font-expanded text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
            The week in performance cars, in one fast read.
          </h2>
          <p className="mt-4 max-w-md text-muted">
            Our editors pick the stories worth your time, plus one spec sheet you will want to argue about. No spam, unsubscribe in one click.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <NewsletterForm />
        </Reveal>
      </div>
    </section>
  );
}
