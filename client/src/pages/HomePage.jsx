import { lazy, startTransition, Suspense, useEffect, useMemo, useState } from "react";
import CoverStory, { CoverSkeleton } from "../features/home/CoverStory";
import { AlsoToday, EditorialGrid, MakesRail, MoreLink, NewsletterBand, SectionHead } from "../features/home/HomeSections";

const SpecShowdown = lazy(() => import("../features/home/SpecShowdown"));
import ArticleCard from "../features/articles/ArticleCard";
import { RevealGroup, RevealItem } from "../components/motion/Reveal";
import { CardSkeleton, ErrorState } from "../components/ui/States";
import { listArticles } from "../api/articles";
import { getErrorMessage, isAbortError } from "../lib/apiClient";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useAfterPaint } from "../hooks/useAfterPaint";
import { releaseBootHero } from "../lib/bootHero";

const FIRST_BATCH = 14;
const MORE_BATCH = 6;

const HomePage = () => {
  useDocumentTitle(null);
  const [state, setState] = useState({ loading: true, error: null, featured: null, latest: [], popular: [], specced: [], total: 0 });
  const [more, setMore] = useState({ items: [], loading: false, offset: FIRST_BATCH, done: false });
  const [reloadKey, setReloadKey] = useState(0);
  // The cover (LCP) paints first; the sections below follow in two later, time-sliced steps.
  const restReady = useAfterPaint(!state.loading);
  const lowerReady = useAfterPaint(restReady);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([
      listArticles({ featured: true, sort: "latest", limit: 1 }, { signal }).catch((e) => (isAbortError(e) ? Promise.reject(e) : { articles: [] })),
      listArticles({ limit: FIRST_BATCH, sort: "latest" }, { signal }),
      listArticles({ limit: 5, sort: "popular" }, { signal }).catch((e) => (isAbortError(e) ? Promise.reject(e) : { articles: [] })),
      // Spec showdown: the two newest stories that actually have a spec sheet.
      listArticles({ limit: 2, sort: "latest", hasSpecs: true }, { signal }).catch((e) => (isAbortError(e) ? Promise.reject(e) : { articles: [] })),
    ])
      .then(([feat, latest, popular, specced]) => {
        // The legacy API ignores `featured`; only trust it when the row really is featured.
        const featured = feat.articles.find((a) => a.is_featured) || null;
        startTransition(() => setState({
          loading: false,
          error: null,
          featured,
          latest: latest.articles,
          popular: popular.articles,
          specced: specced.articles.filter((a) => a.has_specs).slice(0, 2),
          total: latest.pagination.total,
        }));
        setMore({ items: [], loading: false, offset: FIRST_BATCH, done: latest.pagination.total <= FIRST_BATCH });
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setState((s) => ({ ...s, loading: false, error: getErrorMessage(err, "Failed to load stories") }));
      });
    return () => controller.abort();
  }, [reloadKey]);

  const layout = useMemo(() => {
    const pool = [...state.latest];
    const cover = state.featured || pool[0] || null;
    const rest = pool.filter((a) => a.id !== cover?.id);
    const take = (n, pred = () => true) => {
      const out = [];
      for (let i = 0; i < rest.length && out.length < n; ) {
        if (pred(rest[i])) out.push(...rest.splice(i, 1));
        else i += 1;
      }
      return out;
    };
    const alsoToday = take(3);
    const lead = take(1)[0] || null;
    const threeUp = take(3, (a) => a.article_type !== "news");
    const quick = take(4);
    const remaining = rest;
    return { cover, alsoToday, lead, threeUp, quick, remaining };
  }, [state.latest, state.featured]);

  const loadMore = () => {
    setMore((m) => ({ ...m, loading: true }));
    listArticles({ offset: more.offset, limit: MORE_BATCH, sort: "latest" })
      .then(({ articles, pagination }) =>
        setMore((m) => ({
          items: [...m.items, ...articles],
          loading: false,
          offset: m.offset + MORE_BATCH,
          done: m.offset + MORE_BATCH >= pagination.total,
        }))
      )
      .catch(() => setMore((m) => ({ ...m, loading: false })));
  };

  if (state.error || (!state.loading && !layout.cover)) releaseBootHero();
  if (state.error) {
    return (
      <div className="pt-24">
        <ErrorState title="We couldn't load the front page" message={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
      </div>
    );
  }

  const coverIds = new Set([layout.cover?.id, state.featured?.id]);
  const popular = state.popular.filter((a) => !coverIds.has(a.id)).slice(0, 4);
  const moreStories = [...layout.remaining, ...more.items];

  return (
    <>
      {state.loading || !layout.cover ? (
        state.loading ? (
          <CoverSkeleton />
        ) : (
          <div className="pt-32 text-center text-muted">Nothing has been published yet.</div>
        )
      ) : (
        <CoverStory article={layout.cover} />
      )}

      {!state.loading && !restReady ? (
        // Same footprint as the sections about to render, so nothing below jumps.
        <div className="min-h-[200vh]" aria-hidden="true" />
      ) : state.loading ? (
        <div className="shell grid gap-8 pt-20 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading stories">
          {Array.from({ length: 6 }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <AlsoToday articles={layout.alsoToday} />
          <EditorialGrid lead={layout.lead} threeUp={layout.threeUp} quick={layout.quick} popular={popular} />
          {lowerReady && <MakesRail />}
          {lowerReady && state.specced.length >= 2 && (
            <Suspense fallback={null}>
              <SpecShowdown candidates={state.specced} />
            </Suspense>
          )}
          {lowerReady && <NewsletterBand />}
          {lowerReady && (moreStories.length > 0 || !more.done) && (
            <section className="shell mt-24" aria-labelledby="more-heading">
              <SectionHead kicker="Keep going" title="More stories" id="more-heading" action={<MoreLink to="/articles">Browse all</MoreLink>} />
              <RevealGroup className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {moreStories.map((a) => (
                  <RevealItem key={a.id}>
                    <ArticleCard article={a} />
                  </RevealItem>
                ))}
                {more.loading && Array.from({ length: 3 }, (_, i) => <CardSkeleton key={`s${i}`} />)}
              </RevealGroup>
              {!more.done && (
                <div className="mt-12 flex justify-center">
                  <button type="button" onClick={loadMore} disabled={more.loading} className="btn-apex btn-ghost-apex min-w-48">
                    {more.loading ? "Loading…" : "Load more stories"}
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
};

export default HomePage;
