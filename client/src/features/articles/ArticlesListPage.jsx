import { useEffect, useId, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, SearchX, X } from "lucide-react";
import ArticleCard from "./ArticleCard";
import { listArticles } from "../../api/articles";
import { TYPE_PLURAL } from "../../api/normalize";
import { getErrorMessage, isAbortError } from "../../lib/apiClient";
import Pagination from "../../components/ui/Pagination";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/ui/States";
import { RevealGroup, RevealItem } from "../../components/motion/Reveal";
import { useMakes } from "../../hooks/useMakes";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { scrollToTarget } from "../../lib/smoothScroll";
import { EASE } from "../../lib/motion";

const PAGE_SIZE = 9;
const TYPES = ["", "review", "news", "feature"];
const SORTS = [
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Most read" },
];

const HEADLINES = {
  "": { kicker: "The archive", title: "Every story" },
  review: { kicker: "Tested", title: "Reviews" },
  news: { kicker: "This week", title: "News" },
  feature: { kicker: "Long reads", title: "Features" },
};

/** /articles — type tabs, make chips, sort and search, all URL-synced. */
const ArticlesListPage = () => {
  const id = useId();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const type = TYPES.includes(params.get("type")) ? params.get("type") || "" : "";
  const make = params.get("make") || "";
  const sort = params.get("sort") === "popular" ? "popular" : "latest";
  const categoryId = params.get("category") || "";
  const urlQ = params.get("q") || "";

  const head = HEADLINES[type];
  const title = make ? `${make}${type ? ` ${head.title.toLowerCase()}` : ""}` : head.title;
  useDocumentTitle(title, `${title} — independent performance-car journalism from APEX.`);

  const { makes } = useMakes();
  const [q, setQ] = useState(urlQ);
  const debouncedQ = useDebouncedValue(q.trim(), 300);
  const [state, setState] = useState({ loading: true, error: null, articles: [], total: 0, totalPages: 1 });
  const [reloadKey, setReloadKey] = useState(0);

  const update = (patch, { resetPage = true } = {}) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
        if (resetPage && !("page" in patch)) next.delete("page");
        if (next.get("page") === "1") next.delete("page");
        if (next.get("sort") === "latest") next.delete("sort");
        return next;
      },
      { replace: true, preventScrollReset: true }
    );

  // Keep the input in sync when the URL changes from elsewhere (search overlay, back button).
  const [syncedQ, setSyncedQ] = useState(urlQ);
  if (urlQ !== syncedQ) {
    setSyncedQ(urlQ);
    setQ(urlQ);
  }

  useEffect(() => {
    if (debouncedQ !== urlQ) update({ q: debouncedQ });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value
  }, [debouncedQ]);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    listArticles({ page, limit: PAGE_SIZE, search: urlQ, type, make, sort, categoryId }, { signal: controller.signal })
      .then((res) =>
        setState({ loading: false, error: null, articles: res.articles, total: res.pagination.total, totalPages: res.pagination.totalPages })
      )
      .catch((err) => {
        if (isAbortError(err)) return;
        setState((s) => ({ ...s, loading: false, articles: [], error: getErrorMessage(err, "Failed to load articles") }));
      });
    return () => controller.abort();
  }, [page, urlQ, type, make, sort, categoryId, reloadKey]);

  const filtered = Boolean(urlQ || make || type || categoryId);
  const resultKey = `${page}-${urlQ}-${type}-${make}-${sort}-${categoryId}`;

  return (
    <div className="pb-8">
      <header className="shell pb-10 pt-14 md:pt-20">
        <m.p key={`k-${type}`} className="kicker" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
          {head.kicker}
        </m.p>
        <m.h1
          key={`t-${title}`}
          className="mt-3 font-expanded text-[clamp(40px,6vw,76px)] font-extrabold leading-[0.95] tracking-[-0.02em]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {title}
        </m.h1>
        <p className="meta mt-4" aria-live="polite">
          {state.loading ? "Loading…" : `${state.total} ${state.total === 1 ? "story" : "stories"}`}
          {urlQ && !state.loading ? ` matching “${urlQ}”` : ""}
        </p>
      </header>

      <div className="sticky top-16 z-30 border-y border-line bg-[var(--nav-solid)] backdrop-blur-xl">
        <div className="shell flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1" role="tablist" aria-label="Story type">
            {TYPES.map((t) => {
              const active = t === type;
              return (
                <button
                  key={t || "all"}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => update({ type: t })}
                  className={`relative h-10 shrink-0 px-4 text-sm font-medium transition-colors ${active ? "text-fg" : "text-muted hover:text-fg"}`}
                >
                  {t ? TYPE_PLURAL[t] : "All"}
                  {active && (
                    <m.span layoutId="type-tab" className="absolute inset-x-2 bottom-0 h-0.5 bg-papaya" transition={{ duration: 0.3, ease: EASE }} />
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
              <label htmlFor={`${id}-q`} className="sr-only">
                Search stories
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
              <input
                id={`${id}-q`}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search stories"
                className="field-apex !min-h-10 !py-2 pl-9"
              />
            </div>
            <label htmlFor={`${id}-sort`} className="sr-only">
              Sort
            </label>
            <select id={`${id}-sort`} value={sort} onChange={(e) => update({ sort: e.target.value })} className="field-apex !min-h-10 !w-auto !py-2">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {makes.length > 0 && (
          <div className="shell pb-3">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Filter by make">
              <button type="button" className="chip" aria-pressed={!make} onClick={() => update({ make: "" })}>
                All makes
              </button>
              {makes.map((mk) => (
                <button key={mk.make} type="button" className="chip" aria-pressed={make === mk.make} onClick={() => update({ make: make === mk.make ? "" : mk.make })}>
                  {mk.make}
                  <span className="font-mono text-[11px] opacity-70">{mk.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shell pt-12">
        {state.error ? (
          <ErrorState title="Couldn't load stories" message={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : state.loading ? (
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading stories">
            {Array.from({ length: 6 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : state.articles.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing on this stretch of road"
            message={filtered ? "No stories match those filters. Try one of these instead:" : "Nothing has been published yet."}
          >
            {filtered && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {(urlQ || make || type) && (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setQ("");
                      update({ q: "", make: "", type: "", category: "" });
                    }}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear all filters
                  </button>
                )}
                {makes.slice(0, 4).map((mk) => (
                  <button key={mk.make} type="button" className="chip" onClick={() => update({ make: mk.make, q: "" })}>
                    {mk.make}
                  </button>
                ))}
                <Link to="/articles?type=review" className="chip">
                  Latest reviews
                </Link>
              </div>
            )}
          </EmptyState>
        ) : (
          <AnimatePresence mode="wait">
            <m.div key={resultKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <RevealGroup className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {state.articles.map((a, i) => (
                  <RevealItem key={a.id}>
                    <ArticleCard article={a} priority={i < 3 && page === 1} />
                  </RevealItem>
                ))}
              </RevealGroup>
              <Pagination
                currentPage={page}
                totalPages={state.totalPages}
                onPageChange={(p) => {
                  update({ page: p }, { resetPage: false });
                  scrollToTarget(0, { offset: 0 });
                }}
              />
            </m.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ArticlesListPage;
