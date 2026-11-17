import { ChevronLeft, ChevronRight } from "lucide-react";

/** Numbered pagination. Renders nothing when there is only one page. */
const Pagination = ({ currentPage, totalPages, onPageChange, className = "" }) => {
  if (!totalPages || totalPages <= 1) return null;

  const start = Math.max(1, Math.min(currentPage - 3, totalPages - 6));
  const end = Math.min(totalPages, start + 6);
  const pages = [];
  for (let p = start; p <= end; p += 1) pages.push(p);

  const base =
    "inline-flex h-10 min-w-10 items-center justify-center rounded-[2px] px-3 font-mono text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav className={`mt-12 flex justify-center ${className}`} aria-label="Pagination">
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`${base} text-muted hover:bg-surface-2 hover:text-fg`}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>
        {pages.map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? "page" : undefined}
              aria-label={`Page ${p}`}
              className={`${base} ${
                p === currentPage ? "bg-papaya text-papaya-contrast" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {String(p).padStart(2, "0")}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={`${base} text-muted hover:bg-surface-2 hover:text-fg`}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
