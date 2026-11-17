import { useEffect, useId, useState } from "react";
import { AnimatePresence, m as M } from "motion/react";
import { FolderTree, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "../../lib/toast";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { createCategory, deleteCategory, updateCategory } from "../../api/categories";
import { getErrorMessage } from "../../lib/apiClient";
import { EASE } from "../../lib/motion";
import { useCategories } from "../../hooks/useCategories";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const EMPTY = { name: "", description: "" };

const CategoryManagementPage = () => {
  useDocumentTitle("Newsroom · Categories");
  const id = useId();
  const { categories, loading, error, reload } = useCategories();
  const [searchTerm, setSearchTerm] = useState("");
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', values, id? }
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const openCreate = () => setModal({ mode: "create", values: EMPTY });
  const openEdit = (c) => setModal({ mode: "edit", id: c.id, values: { name: c.name || "", description: c.description || "" } });
  const closeModal = () => {
    setModal(null);
    setNameError("");
  };

  useEffect(() => {
    if (!modal) return undefined;
    const onKey = (e) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") setNameError("");
    setModal((md) => ({ ...md, values: { ...md.values, [name]: value } }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!modal.values.name.trim()) {
      setNameError("Category name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: modal.values.name.trim(), description: modal.values.description };
      if (modal.mode === "edit") {
        await updateCategory(modal.id, payload);
        toast.success("Category updated");
      } else {
        await createCategory(payload);
        toast.success("Category created");
      }
      closeModal();
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err, `Failed to ${modal.mode === "edit" ? "update" : "create"} category`));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteCategory(toDelete.id);
      toast.success("Category deleted");
      reload();
    } catch (err) {
      toast.error(
        err?.status === 409
          ? "This category is still used by articles. Move or delete those articles first."
          : getErrorMessage(err, "Failed to delete category")
      );
    }
  };

  const filtered = categories.filter((c) => (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 md:px-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Structure</p>
          <h1 className="font-expanded text-3xl font-extrabold tracking-tight">Categories</h1>
        </div>
        <button type="button" onClick={openCreate} className="btn-apex btn-primary-apex">
          <Plus className="h-4 w-4" aria-hidden="true" /> New category
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <label htmlFor={`${id}-search`} className="sr-only">
          Search categories
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
        <input
          id={`${id}-search`}
          type="search"
          placeholder="Search categories…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="field-apex pl-9"
        />
      </div>

      <div className="card-apex">
        {error ? (
          <ErrorState title="Couldn't load categories" message={error} onRetry={reload} />
        ) : loading ? (
          <div className="divide-y divide-line" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FolderTree} title={searchTerm ? "No matching categories" : "No categories yet"} />
        ) : (
          <M.ul
            className="divide-y divide-line"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          >
            {filtered.map((c) => (
              <M.li
                key={c.id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } } }}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}</p>
                  {c.description && <p className="mt-0.5 truncate text-sm text-muted">{c.description}</p>}
                </div>
                {c.article_count != null && (
                  <span className="font-mono text-xs tabular-nums text-subtle">
                    {c.article_count} article{Number(c.article_count) === 1 ? "" : "s"}
                  </span>
                )}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] text-muted hover:bg-surface-2 hover:text-fg"
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToDelete(c)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-[2px] text-muted hover:bg-danger/10 hover:text-danger"
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </M.li>
            ))}
          </M.ul>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <M.div
            className="fixed inset-0 z-[85] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
            <M.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-modal-title`}
              className="relative w-full max-w-md rounded-[12px] border border-line bg-surface text-fg shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div className="flex items-center justify-between border-b border-line px-6 py-4">
                <h2 id={`${id}-modal-title`} className="font-display text-xl font-semibold">
                  {modal.mode === "edit" ? "Edit category" : "New category"}
                </h2>
                <button type="button" onClick={closeModal} className="text-muted hover:text-fg" aria-label="Close dialog">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <form onSubmit={handleSave} noValidate>
                <div className="space-y-4 px-6 py-5">
                  <div>
                    <label htmlFor={`${id}-name`} className="label-apex">
                      Name
                    </label>
                    <input
                      id={`${id}-name`}
                      type="text"
                      name="name"
                      value={modal.values.name}
                      onChange={handleChange}
                      className="field-apex"
                      placeholder="e.g. Reviews"
                      aria-invalid={Boolean(nameError)}
                      aria-describedby={nameError ? `${id}-name-err` : undefined}
                      autoFocus
                    />
                    {nameError && (
                      <p id={`${id}-name-err`} className="mt-1.5 text-xs text-danger">
                        {nameError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor={`${id}-description`} className="label-apex">
                      Description <span className="text-subtle">(optional)</span>
                    </label>
                    <textarea
                      id={`${id}-description`}
                      name="description"
                      value={modal.values.description}
                      onChange={handleChange}
                      className="field-apex resize-none"
                      rows={3}
                      placeholder="What belongs here?"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
                  <button type="button" onClick={closeModal} className="btn-apex btn-quiet-apex">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="btn-apex btn-primary-apex">
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </form>
            </M.div>
          </M.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete category?"
        message={`"${toDelete?.name || ""}" will be deleted. This can't be undone.`}
      />
    </div>
  );
};

export default CategoryManagementPage;
