import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CornerDownLeft, Search, X } from "lucide-react";
import { searchArticles } from "../../api/discovery";
import { listArticles } from "../../api/articles";
import { TYPE_LABEL, kickerOf } from "../../api/normalize";
import { isAbortError } from "../../lib/apiClient";
import { coverOf, responsiveImage } from "../../lib/image";
import { formatShortDate } from "../../lib/format";
import { lockScroll } from "../../lib/smoothScroll";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { articlePath } from "../articles/paths";
import { EASE } from "../../lib/motion";

const TYPES = ["review", "news", "feature"];

function Thumb({ article }) {
  const cover = coverOf(article);
  const { src: url } = responsiveImage(cover.path, { base: 160, fallback: cover.fallback });
  return (
    <span className="relative block h-12 w-16 shrink-0 overflow-hidden rounded-[2px] bg-surface-2">
      <img src={url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
    </span>
  );
}

/** ⌘K overlay: scale/fade in, results stagger, the keyboard highlight glides between rows. */
export default function SearchOverlay({ open, onClose }) {
  const id = useId();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const restoreRef = useRef(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [make, setMake] = useState("");
  const [state, setState] = useState({ loading: false, results: [], facets: { makes: [], types: [] }, error: null });
  const [active, setActive] = useState(0);
  const query = useDebouncedValue(q.trim(), 180);

  // Open/close side effects: focus, scroll lock, focus restore.
  useEffect(() => {
    if (!open) return undefined;
    restoreRef.current = document.activeElement;
    lockScroll(true);
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      clearTimeout(t);
      lockScroll(false);
      restoreRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    const req = query
      ? searchArticles({ q: query, type, make, limit: 8 }, { signal: controller.signal })
      : listArticles({ limit: 6, sort: "popular", type, make }, { signal: controller.signal }).then((r) => ({
          results: r.articles,
          facets: null,
        }));
    req
      .then((res) =>
        setState((s) => ({ loading: false, error: null, results: res.results, facets: res.facets || s.facets }))
      )
      .catch((err) => {
        if (isAbortError(err)) return;
        setState((s) => ({ ...s, loading: false, results: [], error: err.message }));
      });
    setActive(0);
    return () => controller.abort();
  }, [open, query, type, make]);

  const go = (article) => {
    if (!article) return;
    onClose();
    navigate(articlePath(article), { viewTransition: true });
  };

  const onKeyDown = (e) => {
    const n = state.results.length;
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown" && n) {
      e.preventDefault();
      setActive((i) => (i + 1) % n);
    } else if (e.key === "ArrowUp" && n) {
      e.preventDefault();
      setActive((i) => (i - 1 + n) % n);
    } else if (e.key === "Enter" && e.target === inputRef.current) {
      e.preventDefault();
      if (n) go(state.results[active]);
      else if (q.trim()) {
        onClose();
        navigate(`/articles?q=${encodeURIComponent(q.trim())}`, { viewTransition: true });
      }
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog.
      const nodes = dialogRef.current?.querySelectorAll("input,button,a[href]");
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const makes = state.facets?.makes?.length ? state.facets.makes.slice(0, 6) : [];
  const listId = `${id}-results`;

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[10vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          onKeyDown={onKeyDown}
        >
          <div className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <m.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Search APEX"
            data-lenis-prevent
            className="relative w-full max-w-2xl overflow-hidden rounded-[12px] border border-line-strong bg-surface shadow-[0_40px_120px_-20px_rgb(0_0_0/0.6)]"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
              <label htmlFor={`${id}-q`} className="sr-only">
                Search articles
              </label>
              <input
                ref={inputRef}
                id={`${id}-q`}
                type="search"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={state.results[active] ? `${id}-opt-${active}` : undefined}
                autoComplete="off"
                spellCheck="false"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search reviews, makes, models…"
                className="no-cancel h-16 w-full bg-transparent text-lg text-fg placeholder:text-subtle focus:outline-none"
              />
              <button type="button" onClick={onClose} className="btn-apex btn-quiet-apex !min-h-9 !px-2" aria-label="Close search">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3" role="group" aria-label="Filter by type">
              <button type="button" className="chip" aria-pressed={!type} onClick={() => setType("")}>
                All
              </button>
              {TYPES.map((t) => (
                <button key={t} type="button" className="chip" aria-pressed={type === t} onClick={() => setType(type === t ? "" : t)}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
              {makes.length > 0 && <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />}
              {makes.map((mk) => (
                <button
                  key={mk.make}
                  type="button"
                  className="chip"
                  aria-pressed={make === mk.make}
                  onClick={() => setMake(make === mk.make ? "" : mk.make)}
                >
                  {mk.make}
                  <span className="font-mono text-[11px] opacity-70">{mk.count}</span>
                </button>
              ))}
            </div>

            <div className="max-h-[52vh] overflow-y-auto overscroll-contain p-2" data-lenis-prevent>
              <p className="meta px-3 pb-2 pt-2" aria-live="polite">
                {state.loading ? "Searching…" : query ? `${state.results.length} results` : "Most read right now"}
              </p>
              {state.error && <p className="px-3 py-6 text-sm text-danger">{state.error}</p>}
              {!state.loading && !state.error && state.results.length === 0 && (
                <div className="px-3 py-10 text-center">
                  <p className="font-display text-xl font-semibold">No matches for “{query}”</p>
                  <p className="mt-2 text-sm text-muted">Try a make like “McLaren”, or a word like “V12”.</p>
                </div>
              )}
              <ul id={listId} role="listbox" aria-label="Results">
                {state.results.map((a, i) => (
                  <m.li
                    key={a.id}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE, delay: i * 0.035 }}
                    className="relative"
                    onMouseMove={() => setActive(i)}
                  >
                    {i === active && (
                      <m.span
                        layoutId={`${id}-hl`}
                        className="absolute inset-0 rounded-[6px] bg-surface-2"
                        transition={{ duration: 0.15, ease: EASE }}
                        aria-hidden="true"
                      />
                    )}
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => go(a)}
                      className="relative flex w-full items-center gap-4 rounded-[6px] px-3 py-2.5 text-left"
                    >
                      <Thumb article={a} />
                      <span className="min-w-0 flex-1">
                        <span className="kicker block">
                          {kickerOf(a)}
                        </span>
                        <span className="mt-0.5 block truncate font-medium text-fg">{a.title}</span>
                        <span className="meta mt-0.5 block normal-case tracking-normal">
                          {formatShortDate(a.published_at)}
                          {a.reading_time_min ? ` · ${a.reading_time_min} min read` : ""}
                        </span>
                      </span>
                      {i === active && <CornerDownLeft className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
                    </button>
                  </m.li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-subtle">
              <span className="hidden gap-3 sm:flex">
                <span>
                  <kbd className="font-mono">↑↓</kbd> navigate
                </span>
                <span>
                  <kbd className="font-mono">↵</kbd> open
                </span>
                <span>
                  <kbd className="font-mono">esc</kbd> close
                </span>
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-muted hover:text-fg"
                onClick={() => {
                  onClose();
                  navigate(q.trim() ? `/articles?q=${encodeURIComponent(q.trim())}` : "/articles", { viewTransition: true });
                }}
              >
                See all results <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
