import { useEffect, useState } from "react";
import { m as M } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Eye, FileText, MessageSquare, PenSquare, PencilLine, TrendingUp } from "lucide-react";
import { getAdminStats } from "../../api/admin";
import { getErrorMessage, isAbortError } from "../../lib/apiClient";
import { displayName, timeAgo } from "../../lib/format";
import { EASE } from "../../lib/motion";
import { ErrorState, Skeleton } from "../../components/ui/States";
import Avatar from "../../components/ui/Avatar";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAuth } from "../auth/AuthContext";
import { useCountUp } from "./dashboard/useCountUp";
import ViewsSparkline from "./dashboard/ViewsSparkline";

const compact = (n) =>
  n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : Number(n).toLocaleString("en-US");

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

function Kpi({ label, value, icon: Icon, hint }) {
  const n = useCountUp(value);
  const unknown = value === null || value === undefined;
  return (
    <M.div variants={item} className="card-apex relative overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <p className="meta">{label}</p>
        <Icon className="h-4 w-4 text-subtle" aria-hidden="true" />
      </div>
      <p className="mt-4 font-mono text-4xl font-medium tabular-nums tracking-tight text-fg" aria-live="polite">
        {unknown ? "—" : compact(n)}
      </p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </M.div>
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <M.section variants={item} className={`card-apex p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </M.section>
  );
}

const DashboardSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-[120px] !rounded-[6px]" />
      ))}
    </div>
    <Skeleton className="h-[260px] !rounded-[6px]" />
    <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
      <Skeleton className="h-[280px] !rounded-[6px]" />
      <Skeleton className="h-[280px] !rounded-[6px]" />
    </div>
  </div>
);

const DashboardPage = () => {
  useDocumentTitle("Newsroom · Dashboard");
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    getAdminStats({ signal: controller.signal })
      .then(setStats)
      .catch((err) => !isAbortError(err) && setError(getErrorMessage(err, "Failed to load stats")));
    return () => controller.abort();
  }, [reloadKey]);

  const totals = stats?.totals || {};
  const views7d = stats?.views7d || [];
  const weekViews = views7d.reduce((s, d) => s + (Number(d.views) || 0), 0);
  const first = Number(views7d[0]?.views) || 0;
  const last = Number(views7d[views7d.length - 1]?.views) || 0;
  const trend = first ? Math.round(((last - first) / first) * 100) : null;
  const top = stats?.topArticles || [];
  const topMax = Math.max(1, ...top.map((a) => Number(a.views) || 0));
  const firstName = displayName(user).split(" ")[0];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6 lg:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="font-expanded text-3xl font-extrabold tracking-tight md:text-4xl">
            Good to see you{firstName ? `, ${firstName}` : ""}.
          </h1>
        </div>
        <Link to="/admin/create-article" className="btn-apex btn-primary-apex">
          <PenSquare className="h-4 w-4" aria-hidden="true" /> New article
        </Link>
      </div>

      {error ? (
        <ErrorState title="Couldn't load the dashboard" message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      ) : !stats ? (
        <DashboardSkeleton />
      ) : (
        <M.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <Kpi label="Published" value={totals.published} icon={FileText} hint="Live on the site" />
            <Kpi label="Drafts" value={totals.drafts} icon={PencilLine} hint="Waiting for an edit" />
            <Kpi label="Comments" value={totals.comments} icon={MessageSquare} hint={totals.comments == null ? "Available with stats API" : "All time"} />
            <Kpi label="Views" value={totals.views} icon={Eye} hint="All time, all articles" />
          </div>

          <Panel
            title="Views · last 7 days"
            action={
              views7d.length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono tabular-nums text-fg">{weekViews.toLocaleString()}</span>
                  {trend !== null && (
                    <span className={`inline-flex items-center gap-1 font-mono text-xs ${trend >= 0 ? "text-ok" : "text-danger"}`}>
                      <TrendingUp className={`h-3.5 w-3.5 ${trend < 0 ? "rotate-180" : ""}`} aria-hidden="true" />
                      {trend >= 0 ? "+" : ""}
                      {trend}%
                    </span>
                  )}
                </div>
              )
            }
          >
            {views7d.length > 0 ? (
              <ViewsSparkline data={views7d} />
            ) : (
              <div className="flex h-[180px] flex-col items-center justify-center rounded-[2px] border border-dashed border-line text-center">
                <p className="text-sm text-muted">Daily views appear once the stats endpoint is live.</p>
                <p className="mt-1 text-xs text-subtle">Totals above are derived from the article list.</p>
              </div>
            )}
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
            <Panel
              title="Top articles"
              action={
                <Link to="/admin/articles" className="text-xs font-medium text-muted hover:text-fg">
                  All articles
                </Link>
              }
            >
              {top.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No views recorded yet.</p>
              ) : (
                <ol className="space-y-4">
                  {top.map((a, i) => (
                    <li key={a.id}>
                      <div className="flex items-baseline gap-3">
                        <span className="w-5 font-mono text-xs text-subtle">{String(i + 1).padStart(2, "0")}</span>
                        <Link
                          to={`/admin/edit-article/${a.id}`}
                          className="min-w-0 flex-1 truncate text-sm font-medium hover:text-papaya-ink"
                        >
                          {a.title}
                        </Link>
                        <span className="font-mono text-xs tabular-nums text-muted">{Number(a.views).toLocaleString()}</span>
                      </div>
                      <div className="ml-8 mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                        <M.div
                          className="h-full rounded-full bg-data"
                          initial={{ width: 0 }}
                          animate={{ width: `${(Number(a.views) / topMax) * 100}%` }}
                          transition={{ duration: 1, ease: EASE, delay: 0.3 + i * 0.08 }}
                        />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel title="Recent comments">
              {(stats.recentComments || []).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  {stats.derived ? "Recent comments appear once the stats endpoint is live." : "No comments yet."}
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {stats.recentComments.map((c) => (
                    <li key={c.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar name={c.user_name} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{c.user_name}</span>
                          <span className="text-muted"> on </span>
                          <Link to={`/articles/${c.article_id}#comments`} className="text-fg hover:text-papaya-ink">
                            {c.article_title || "an article"}
                          </Link>
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{c.content}</p>
                        <p className="meta mt-1 normal-case tracking-normal">{timeAgo(c.created_at)}</p>
                      </div>
                      <Link
                        to={`/articles/${c.article_id}#comments`}
                        className="self-start text-subtle hover:text-fg"
                        aria-label={`Open comment on ${c.article_title || "article"}`}
                      >
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </M.div>
      )}
    </div>
  );
};

export default DashboardPage;
