import { m as M } from "motion/react";
import { Link } from "react-router-dom";
import { ExternalLink, Pencil, Star, Trash2 } from "lucide-react";
import { assetUrl, imgFallback, FALLBACK_IMAGE } from "../../lib/assets";
import { formatShortDate } from "../../lib/format";
import { TYPE_LABEL } from "../../api/normalize";
import { EASE } from "../../lib/motion";

const STATUS = {
  published: "text-ok border-ok/40 bg-ok/10",
  draft: "text-warn border-warn/40 bg-warn/10",
  archived: "text-muted border-line-strong bg-surface-2",
};

export const StatusPill = ({ status }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ${
      STATUS[status] || STATUS.archived
    }`}
  >
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
    {status || "unknown"}
  </span>
);

const Thumb = ({ src }) => (
  <span className="relative block h-11 w-16 shrink-0 overflow-hidden rounded-[2px] bg-surface-2">
    {src && (
      <img
        src={assetUrl(src, FALLBACK_IMAGE)}
        onError={imgFallback(FALLBACK_IMAGE)}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
    )}
  </span>
);

const row = {
  hidden: { opacity: 0, y: 8 },
  show: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE, delay: i * 0.03 } }),
};

const Actions = ({ article, onDelete }) => (
  <div className="flex items-center justify-end gap-1">
    {article.status === "published" && (
      <Link
        to={`/articles/${article.slug || article.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] text-muted hover:bg-surface-2 hover:text-fg"
        aria-label={`View "${article.title}" on the site`}
      >
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </Link>
    )}
    <Link
      to={`/admin/edit-article/${article.id}`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] text-muted hover:bg-surface-2 hover:text-fg"
      aria-label={`Edit "${article.title}"`}
    >
      <Pencil className="h-4 w-4" aria-hidden="true" />
    </Link>
    <button
      type="button"
      onClick={() => onDelete(article.id)}
      className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] text-muted hover:bg-danger/10 hover:text-danger"
      aria-label={`Delete "${article.title}"`}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
);

/** Table on md+, stacked cards on small screens. */
const ArticleTable = ({ articles, onDelete }) => (
  <>
    <div className="card-apex relative hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <caption className="sr-only">Articles</caption>
        <thead>
          <tr className="border-b border-line">
            {["Article", "Category", "Status", "Views", "Date"].map((h) => (
              <th key={h} scope="col" className={`meta px-4 py-3 text-left font-normal ${h === "Views" ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a, i) => (
            <M.tr
              key={a.id}
              custom={i}
              variants={row}
              initial="hidden"
              animate="show"
              className="border-b border-line transition-colors last:border-b-0 hover:bg-surface-2/50"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Thumb src={a.featured_image_url} />
                  <div className="min-w-0">
                    <Link to={`/admin/edit-article/${a.id}`} className="line-clamp-1 font-medium text-fg hover:text-papaya-ink">
                      {a.is_featured && <Star className="mr-1 inline h-3.5 w-3.5 fill-papaya text-papaya" aria-label="Featured" />}
                      {a.title}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-subtle">
                      {[a.make, TYPE_LABEL[a.article_type], a.author_name].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted">{a.category_name || "—"}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusPill status={a.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-muted">
                {Number(a.view_count || 0).toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                {formatShortDate(a.published_at || a.created_at) || "—"}
              </td>
              <td className="px-2 py-3">
                <Actions article={a} onDelete={onDelete} />
              </td>
            </M.tr>
          ))}
        </tbody>
      </table>
    </div>

    <ul className="space-y-3 md:hidden">
      {articles.map((a, i) => (
        <M.li key={a.id} custom={i} variants={row} initial="hidden" animate="show" className="card-apex p-3">
          <div className="flex gap-3">
            <Thumb src={a.featured_image_url} />
            <div className="min-w-0 flex-1">
              <Link to={`/admin/edit-article/${a.id}`} className="line-clamp-2 text-sm font-medium">
                {a.title}
              </Link>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <StatusPill status={a.status} />
                <span className="font-mono">{Number(a.view_count || 0).toLocaleString()} views</span>
                <span>{formatShortDate(a.published_at || a.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 border-t border-line pt-1">
            <Actions article={a} onDelete={onDelete} />
          </div>
        </M.li>
      ))}
    </ul>
  </>
);

export default ArticleTable;
