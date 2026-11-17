import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { readingProgress, useScrollProgress } from "../../../hooks/useScrollProgress";
import { Link, useLocation, useParams } from "react-router-dom";
import { MessageSquare, ChevronDown } from "lucide-react";
import ArticleHero from "./ArticleHero";
import TableOfContents from "./TableOfContents";
import ShareBar from "./ShareBar";
import SpecSheet from "./SpecSheet";
import GalleryStrip from "./GalleryStrip";
import { useProse } from "./useProse";
import ArticleCard from "../ArticleCard";
import CommentsSection from "../../comments/CommentsSection";
import LoginModal from "../../auth/LoginModal";
import Avatar from "../../../components/ui/Avatar";
import { ErrorState, Skeleton } from "../../../components/ui/States";
import { RevealGroup, RevealItem, Reveal } from "../../../components/motion/Reveal";
import { getArticle, incrementArticleView } from "../../../api/articles";
import { listComments } from "../../../api/comments";
import { normalizeArticle } from "../../../api/normalize";
import { getErrorMessage, isAbortError } from "../../../lib/apiClient";
import { excerptOf } from "../../../lib/format";
import { articleHtml } from "../../../lib/sanitize";
import { EASE } from "../../../lib/motion";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useAfterPaint } from "../../../hooks/useAfterPaint";
import { releaseBootHero } from "../../../lib/bootHero";
import { makePath } from "../paths";

const progressFromNav = readingProgress(64);

function ReadingProgress({ target }) {
  const bar = useRef(null);
  useScrollProgress(target, progressFromNav, (p) => {
    if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
  });
  return (
    <div
      ref={bar}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-papaya transition-transform duration-100 ease-linear"
      style={{ transform: "scaleX(0)" }}
      aria-hidden="true"
    />
  );
}

function BodySkeleton() {
  return (
    <div className="mx-auto max-w-[680px] space-y-4 py-16" aria-busy="true" aria-label="Loading article">
      {Array.from({ length: 8 }, (_, i) => (
        <Skeleton key={i} className={`h-5 ${i % 4 === 3 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

function AuthorCard({ article }) {
  return (
    <Reveal className="mt-16 flex gap-5 border-y border-line py-8">
      <Avatar src={article.author_avatar_url} name={article.author_name} size={64} />
      <div>
        <p className="meta">Words by</p>
        <p className="mt-1 font-display text-xl font-bold">{article.author_name}</p>
        {/* The author's own bio (profile, max 280 chars); nothing invented when it is empty. */}
        {article.author_bio && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{article.author_bio}</p>}
      </div>
    </Reveal>
  );
}

function CommentsGate({ articleId, onLoginRequired }) {
  const { hash, search } = useLocation();
  const deepLinked = hash === "#comments" || new URLSearchParams(search).has("comment");
  const [open, setOpen] = useState(deepLinked);
  const [count, setCount] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    listComments(articleId, { limit: 1, signal: controller.signal })
      .then(({ totalComments }) => setCount(totalComments))
      .catch(() => setCount(null));
    return () => controller.abort();
  }, [articleId]);

  return (
    <div className="mt-16">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded="false"
          aria-controls="comments"
          className="group flex w-full items-center justify-between rounded-[6px] border border-line bg-surface px-5 py-5 text-left transition-colors hover:border-line-strong"
        >
          <span className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-papaya-ink" aria-hidden="true" />
            <span className="font-display text-lg font-semibold">
              Join the conversation{count !== null ? ` (${count})` : ""}
            </span>
          </span>
          <ChevronDown className="h-5 w-5 text-muted transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden="true" />
        </button>
      ) : (
        <AnimatePresence>
          <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.3, ease: EASE }}>
            <CommentsSection articleId={articleId} onLoginRequired={onLoginRequired} />
          </m.div>
        </AnimatePresence>
      )}
    </div>
  );
}

/** /articles/:slugOrId — hero, sticky TOC + share rail, 680px Newsreader body, spec sheet, gallery, related, comments. */
export default function ArticleDetailPage() {
  const { slugOrId } = useParams();
  const location = useLocation();
  const preview = location.state?.preview ? normalizeArticle(location.state.preview) : null;
  const [state, setState] = useState({ loading: true, article: null, related: [], error: null, notFound: false });
  const [reloadKey, setReloadKey] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const articleRef = useRef(null);
  const proseRef = useRef(null);

  const article = state.article || (preview && String(preview.slug || preview.id) === String(slugOrId) ? preview : null);
  // Editor-set SEO title/description win (migration 005); otherwise "<title> | APEX" and the dek.
  const seoTitle = state.article?.seo_title || null;
  useDocumentTitle(
    seoTitle || article?.title,
    article ? state.article?.seo_description || article.dek || excerptOf(article, 155) : undefined,
    { exact: Boolean(seoTitle) }
  );

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null, notFound: false }));
    getArticle(slugOrId, { signal: controller.signal })
      .then(({ article: data, relatedArticles }) => {
        if (!data) return setState({ loading: false, article: null, related: [], error: null, notFound: true });
        startTransition(() =>
          setState({ loading: false, article: data, related: relatedArticles.slice(0, 3), error: null, notFound: false })
        );
        incrementArticleView(data.id).catch(() => {});
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setState({ loading: false, article: null, related: [], notFound: err?.status === 404, error: getErrorMessage(err, "Failed to load article") });
      });
    return () => controller.abort();
  }, [slugOrId, reloadKey]);

  // The hero (LCP) paints first; the sanitized body, spec sheet and related cards follow a task later.
  const bodyReady = useAfterPaint(Boolean(state.article));
  // Then the secondary blocks, then related cards: each in its own task, so none becomes a long one.
  const extrasReady = useAfterPaint(bodyReady);
  const relatedReady = useAfterPaint(extrasReady);
  const html = useMemo(() => (bodyReady ? articleHtml(state.article?.content) : ""), [bodyReady, state.article?.content]);
  const { headings, activeId } = useProse(proseRef, html);

  if (!article && (state.notFound || state.error)) {
    releaseBootHero();
    return (
      <div className="shell pt-32">
        {state.notFound ? (
          <div className="mx-auto max-w-lg py-16 text-center">
            <p className="kicker">404 · Wrong turn</p>
            <h1 className="mt-3 font-expanded text-4xl font-extrabold">This story isn&apos;t here</h1>
            <p className="mt-3 text-muted">It may have been unpublished or moved.</p>
            <Link to="/articles" className="btn-apex btn-primary-apex mt-8">
              Browse all stories
            </Link>
          </div>
        ) : (
          <ErrorState title="Couldn't load this story" message={state.error} onRetry={() => setReloadKey((k) => k + 1)} />
        )}
      </div>
    );
  }

  if (!article) {
    return (
      <>
        <div className="min-h-[max(520px,86svh)] animate-pulse bg-[#141416]" aria-hidden="true" />
        <BodySkeleton />
      </>
    );
  }

  const full = state.article;
  const hasSpecs = Boolean(full?.specs);
  const sameMake = (a) => article.make && a.make && a.make.toLowerCase() === article.make.toLowerCase();
  // "More McLaren" only when every related story really is a McLaren.
  const relatedKicker = state.related.length > 0 && state.related.every(sameMake) ? `More ${article.make}` : "Up next";

  return (
    <article ref={articleRef}>
      <ReadingProgress target={articleRef} />
      <ArticleHero article={article} />

      <div className="shell grid gap-10 pt-14 lg:grid-cols-[200px_minmax(0,680px)] lg:justify-center lg:gap-16 xl:grid-cols-[200px_minmax(0,680px)_300px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-10">
            <TableOfContents headings={headings} activeId={activeId} />
            <div>
              <p className="meta mb-3">Share</p>
              <ShareBar title={article.title} vertical />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {!full || !bodyReady ? (
            <BodySkeleton />
          ) : (
            <>
              {/* Article HTML is ALWAYS sanitized with DOMPurify (lib/sanitize). */}
              <div ref={proseRef} className="apex-prose anim-rise" dangerouslySetInnerHTML={{ __html: html }} />

              {extrasReady && hasSpecs && <SpecSheet specs={full.specs} articleId={full.id} className="mt-14 xl:hidden" />}

              {extrasReady && <GalleryStrip items={full.gallery} />}

              {extrasReady && full.tags?.length > 0 && (
                <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
                  {full.tags.filter(Boolean).map((t) => (
                    <li key={t}>
                      <Link to={`/articles?q=${encodeURIComponent(t)}`} className="chip">
                        #{t}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-10 lg:hidden">
                <ShareBar title={article.title} />
              </div>

              {extrasReady && <AuthorCard article={full} />}
              {extrasReady && <CommentsGate articleId={full.id} onLoginRequired={() => setShowLogin(true)} />}
            </>
          )}
        </div>

        {hasSpecs && extrasReady && (
          <aside className="hidden xl:block">
            <div className="sticky top-24">
              <SpecSheet specs={full.specs} articleId={full.id} />
            </div>
          </aside>
        )}
      </div>

      {relatedReady && state.related.length > 0 && (
        <section className="shell mt-24" aria-labelledby="keep-reading">
          <div className="mb-8 flex items-end justify-between border-b border-line pb-4">
            <div>
              <p className="kicker mb-2">{relatedKicker}</p>
              <h2 id="keep-reading" className="font-expanded text-2xl font-extrabold tracking-tight md:text-3xl">
                Keep reading
              </h2>
            </div>
            {article.make && (
              <Link to={makePath(article.make)} className="text-sm text-muted hover:text-fg">
                All {article.make} stories →
              </Link>
            )}
          </div>
          <RevealGroup className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {state.related.map((a) => (
              <RevealItem key={a.id}>
                <ArticleCard article={a} />
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
      )}

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
    </article>
  );
}
