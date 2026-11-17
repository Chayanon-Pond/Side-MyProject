import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, Search } from "lucide-react";
import { toast } from "../../lib/toast";
import ArticleTable from "./ArticleTable";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Pagination from "../../components/ui/Pagination";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { deleteArticle, listArticles } from "../../api/articles";
import { getErrorMessage, isAbortError } from "../../lib/apiClient";
import { useCategories } from "../../hooks/useCategories";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const PAGE_SIZE = 10;

const TableSkeleton = () => (
  <div className="card-apex divide-y divide-line" aria-busy="true" aria-label="Loading articles">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="flex items-center gap-3 p-3">
        <Skeleton className="h-11 w-16" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="hidden h-5 w-20 md:block" />
        <Skeleton className="hidden h-4 w-12 md:block" />
      </div>
    ))}
  </div>
);

const ArticlesManagePage = () => {
  useDocumentTitle("Newsroom · Articles");
  const id = useId();
  const { categories } = useCategories();

  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, categoryFilter]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listArticles(
      { page, limit: PAGE_SIZE, search: debouncedSearch, status: statusFilter || "all", categoryId: categoryFilter },
      { signal: controller.signal }
    )
      .then((res) => {
        setArticles(res.articles);
        setTotal(res.pagination.total);
        setTotalPages(res.pagination.totalPages);
        if (res.articles.length === 0 && page > 1) setPage((p) => Math.max(1, p - 1));
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setArticles([]);
        setError(getErrorMessage(err, "Failed to load articles"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, debouncedSearch, statusFilter, categoryFilter, reloadKey]);

  const confirmDelete = async () => {
    const toastId = toast.loading("Deleting article…");
    try {
      await deleteArticle(pendingDeleteId);
      toast.success("Article deleted", { id: toastId });
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete article"), { id: toastId });
    }
  };

  const filtered = Boolean(debouncedSearch || statusFilter || categoryFilter);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Content</p>
          <h1 className="font-expanded text-3xl font-extrabold tracking-tight">Articles</h1>
          <p className="mt-1 text-sm text-muted">{loading ? " " : `${total} article${total === 1 ? "" : "s"}`}</p>
        </div>
        <Link to="/admin/create-article" className="btn-apex btn-primary-apex">
          <Plus className="h-4 w-4" aria-hidden="true" /> New article
        </Link>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-[1fr_200px_220px]">
        <div className="relative">
          <label htmlFor={`${id}-search`} className="sr-only">
            Search articles
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input
            id={`${id}-search`}
            type="search"
            placeholder="Search titles…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="field-apex pl-9"
          />
        </div>
        <div>
          <label htmlFor={`${id}-status`} className="sr-only">
            Status
          </label>
          <select id={`${id}-status`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field-apex">
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-category`} className="sr-only">
            Category
          </label>
          <select id={`${id}-category`} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="field-apex">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.article_count != null ? ` (${c.article_count})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="card-apex">
          <ErrorState title="Couldn't load articles" message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      ) : articles.length === 0 ? (
        <div className="card-apex">
          <EmptyState
            icon={FileText}
            title={filtered ? "No matching articles" : "No articles yet"}
            message={filtered ? "Try a different search or filter." : "Write the first story for APEX."}
          >
            {!filtered && (
              <Link to="/admin/create-article" className="btn-apex btn-primary-apex mt-6">
                <Plus className="h-4 w-4" aria-hidden="true" /> New article
              </Link>
            )}
          </EmptyState>
        </div>
      ) : (
        <>
          <ArticleTable articles={articles} onDelete={setPendingDeleteId} />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className="!mt-8" />
        </>
      )}

      <ConfirmModal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
        itemType="article"
      />
    </div>
  );
};

export default ArticlesManagePage;
