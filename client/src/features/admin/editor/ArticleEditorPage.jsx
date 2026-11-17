import { lazy, Suspense, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, m as M } from "motion/react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Clock, History, ImagePlus, Trash2, X } from "lucide-react";
import { toast } from "../../../lib/toast";
import { createArticle, deleteArticle, getArticle, updateArticle } from "../../../api/articles";
import { TYPE_LABEL } from "../../../api/normalize";
import { getErrorMessage, isAbortError } from "../../../lib/apiClient";
import { articleHtml } from "../../../lib/sanitize";
import { timeAgo } from "../../../lib/format";
import { EASE } from "../../../lib/motion";
import { useCategories } from "../../../hooks/useCategories";
import { useMakes } from "../../../hooks/useMakes";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import ConfirmModal from "../../../components/ui/ConfirmModal";
import { ErrorState, Skeleton } from "../../../components/ui/States";
import GalleryManager from "./GalleryManager";
import { EMPTY_VALUES, SPEC_FIELDS, clearDraft, draftDiffers, fromArticle, readDraft, slugify, toFormData, writeDraft } from "./editorModel";

const RichEditor = lazy(() => import("./RichEditor"));

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SEO_TITLE_MAX = 70; // same limits as the API (migration 005)
const SEO_DESC_MAX = 160;

const EditorSkeleton = () => (
  <div className="rounded-[6px] border border-line bg-surface p-4" aria-busy="true" aria-label="Loading editor">
    <Skeleton className="mb-6 h-9 w-full" />
    {[100, 92, 96, 70].map((w, i) => (
      <Skeleton key={i} className="mb-3 h-4" style={{ width: `${w}%` }} />
    ))}
  </div>
);

function Section({ title, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-b border-line last:border-b-0">
      <h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left text-sm font-semibold"
        >
          <span className="flex items-center gap-2">
            {title}
            {badge}
          </span>
          <ChevronDown className={`h-4 w-4 text-subtle transition-transform duration-300 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
      </h2>
      <AnimatePresence initial={false}>
        {open && (
          <M.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4 pb-5">{children}</div>
          </M.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Counter({ value, max }) {
  const n = value.length;
  return (
    <span className={`font-mono text-[11px] tabular-nums ${n > max ? "text-danger" : n > max * 0.9 ? "text-warn" : "text-subtle"}`}>
      {n}/{max}
    </span>
  );
}

const FieldError = ({ id, children }) =>
  children ? (
    <p id={id} className="mt-1.5 text-xs text-danger" role="alert">
      {children}
    </p>
  ) : null;

/** Create + edit. Tiptap body, live preview in the public reading style, meta panel, local autosave. */
export default function ArticleEditorPage() {
  const { id: articleId } = useParams();
  const isEdit = Boolean(articleId);
  useDocumentTitle(isEdit ? "Newsroom · Edit article" : "Newsroom · New article");
  const navigate = useNavigate();
  const uid = useId();
  const coverInputRef = useRef(null);
  const { categories } = useCategories();
  const { makes } = useMakes();

  const [values, setValues] = useState(EMPTY_VALUES);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editorKey, setEditorKey] = useState(0);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [tab, setTab] = useState("write");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [, setTick] = useState(0);

  // ---- load ---------------------------------------------------------------
  useEffect(() => {
    const draft = readDraft(articleId);
    if (!isEdit) {
      setValues(EMPTY_VALUES);
      setCoverPreview(null);
      setEditorKey((k) => k + 1);
      setPendingDraft(draftDiffers(draft?.values, EMPTY_VALUES) ? draft : null);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    getArticle(articleId, { signal: controller.signal })
      .then(({ article }) => {
        if (!article) throw new Error("Article not found");
        const v = fromArticle(article);
        setValues(v);
        setCoverPreview(v.coverUrl);
        setEditorKey((k) => k + 1);
        const updated = new Date(article.updated_at || article.created_at || 0).getTime();
        // Offer the local draft when it is newer and differs in ANY field, not just the body.
        if (draft && draft.savedAt > updated && draftDiffers(draft.values, v)) setPendingDraft(draft);
        else if (draft) clearDraft(articleId); // stale or identical: do not leave an orphaned key behind
      })
      .catch((err) => !isAbortError(err) && setLoadError(getErrorMessage(err, "Failed to load article")))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [articleId, isEdit, reloadKey]);

  // ---- autosave (debounced) + "saved Xs ago" ticker ------------------------
  useEffect(() => {
    if (!dirty) return undefined;
    const t = setTimeout(() => {
      const at = writeDraft(articleId, values);
      if (at) setSavedAt(at);
    }, 1200);
    return () => clearTimeout(t);
  }, [values, dirty, articleId]);

  useEffect(() => {
    if (!savedAt) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, [savedAt]);

  useEffect(() => () => coverPreview?.startsWith("blob:") && URL.revokeObjectURL(coverPreview), [coverPreview]);

  const update = (patch) => {
    setDirty(true);
    setValues((v) => {
      const next = { ...v, ...patch };
      if ("title" in patch && !v.slugTouched) next.slug = slugify(patch.title);
      return next;
    });
    setErrors((e) => {
      const keys = Object.keys(patch).filter((k) => e[k]);
      if (!keys.length) return e;
      const n = { ...e };
      keys.forEach((k) => delete n[k]);
      return n;
    });
  };
  const onField = (e) => update({ [e.target.name]: e.target.value });
  const updateSpec = (name, value) => update({ specs: { ...values.specs, [name]: value } });

  const restoreDraft = () => {
    setValues((v) => ({ ...v, ...pendingDraft.values, coverUrl: v.coverUrl }));
    setEditorKey((k) => k + 1);
    setPendingDraft(null);
    setDirty(true);
    toast.success("Local draft restored");
  };
  const discardDraft = () => {
    clearDraft(articleId);
    setPendingDraft(null);
  };

  const onCover = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_IMAGE_BYTES) return toast.error("Cover image must be under 5 MB");
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setDirty(true);
  };

  // ---- validate + submit --------------------------------------------------
  const validate = () => {
    const next = {};
    if (!values.title.trim()) next.title = "Give the story a headline.";
    if (!values.category_id) next.category_id = "Choose a category.";
    if (!values.content.trim()) next.content = "The article body is empty.";
    if (coverPreview && !values.featured_image_alt.trim()) next.featured_image_alt = "Alt text is required for the cover image.";
    if (values.seo_title.length > SEO_TITLE_MAX) next.seo_title = `Keep it under ${SEO_TITLE_MAX} characters.`;
    if (values.seo_description.length > SEO_DESC_MAX) next.seo_description = `Keep it under ${SEO_DESC_MAX} characters.`;
    setErrors(next);
    const first = Object.values(next)[0];
    if (first) {
      toast.error(first);
      setTab("write");
    }
    return !first;
  };

  const submit = async (status) => {
    if (submitting || !validate()) return;
    setSubmitting(true);
    const verb = status === "published" ? "Publishing" : "Saving";
    const toastId = toast.loading(`${verb}…`);
    try {
      const body = toFormData(values, coverFile, status);
      const res = isEdit ? await updateArticle(articleId, body) : await createArticle(body);
      clearDraft(articleId);
      setDirty(false);
      toast.success(res?.message || (status === "published" ? "Published" : "Saved"), { id: toastId });
      navigate("/admin/articles");
    } catch (err) {
      toast.error(getErrorMessage(err, `${verb} failed`), { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    const toastId = toast.loading("Deleting…");
    try {
      await deleteArticle(articleId);
      clearDraft(articleId);
      toast.success("Article deleted", { id: toastId });
      navigate("/admin/articles");
    } catch (err) {
      toast.error(getErrorMessage(err, "Delete failed"), { id: toastId });
    }
  };

  const previewHtml = useMemo(() => (tab === "preview" ? articleHtml(values.content) : ""), [tab, values.content]);
  const seoTitle = values.seo_title || (values.title ? `${values.title} | APEX` : "Headline | APEX");
  const seoDesc = values.seo_description || values.dek || "The dek doubles as the search description when you leave this empty.";
  const categoryName = categories.find((c) => String(c.id) === String(values.category_id))?.name;

  if (loading)
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
        <Skeleton className="mb-6 h-12 w-2/3" />
        <EditorSkeleton />
      </div>
    );
  if (loadError)
    return <ErrorState title="Couldn't load this article" message={loadError} onRetry={() => setReloadKey((k) => k + 1)} />;

  const err = (k) => (errors[k] ? `${uid}-${k}-err` : undefined);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:py-8">
      <h1 className="sr-only">{isEdit ? "Edit article" : "New article"}</h1>
      {/* Action bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/admin/articles" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Articles
        </Link>
        <span className="meta flex items-center gap-1.5 normal-case tracking-normal" aria-live="polite">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {savedAt ? `Draft saved locally ${timeAgo(savedAt)}` : dirty ? "Unsaved changes" : "No local changes"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {isEdit && (
            <button type="button" onClick={() => setDeleteOpen(true)} className="btn-apex btn-danger-apex">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Delete</span>
            </button>
          )}
          {isEdit ? (
            <button type="button" disabled={submitting} onClick={() => submit(values.status)} className="btn-apex btn-primary-apex">
              {submitting ? "Saving…" : "Save changes"}
            </button>
          ) : (
            <>
              <button type="button" disabled={submitting} onClick={() => submit("draft")} className="btn-apex btn-ghost-apex">
                Save draft
              </button>
              <button type="button" disabled={submitting} onClick={() => submit("published")} className="btn-apex btn-primary-apex">
                {submitting ? "Publishing…" : "Publish"}
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {pendingDraft && (
          <M.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mb-6 flex flex-wrap items-center gap-3 rounded-[6px] border border-papaya/40 bg-papaya/10 px-4 py-3 text-sm"
            role="status"
          >
            <History className="h-4 w-4 text-papaya-ink" aria-hidden="true" />
            <span className="flex-1">
              You have a newer local draft from <strong>{timeAgo(pendingDraft.savedAt)}</strong>. Restore it?
            </span>
            <button type="button" onClick={restoreDraft} className="btn-apex btn-primary-apex !min-h-9">
              Restore draft
            </button>
            <button type="button" onClick={discardDraft} className="btn-apex btn-quiet-apex !min-h-9">
              Discard
            </button>
          </M.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------------- main column ---------------- */}
        <div className="min-w-0">
          <div role="tablist" aria-label="Editor mode" className="mb-4 inline-flex rounded-[2px] border border-line p-0.5">
            {[
              ["write", "Write"],
              ["preview", "Preview"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`relative h-8 px-4 text-sm font-medium transition-colors ${tab === key ? "text-papaya-contrast" : "text-muted hover:text-fg"}`}
              >
                {tab === key && (
                  <M.span layoutId="editor-tab" className="absolute inset-0 rounded-[2px] bg-papaya" transition={{ duration: 0.3, ease: EASE }} />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>

          {tab === "write" ? (
            <div className="space-y-4">
              <div>
                <label htmlFor={`${uid}-title`} className="sr-only">
                  Headline
                </label>
                <textarea
                  id={`${uid}-title`}
                  name="title"
                  rows={1}
                  value={values.title}
                  onChange={onField}
                  placeholder="Headline"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={err("title")}
                  className="field-sizing-content w-full resize-none border-0 bg-transparent font-expanded text-3xl font-extrabold leading-tight tracking-tight text-fg placeholder:text-subtle focus:outline-none md:text-4xl"
                />
                <FieldError id={err("title")}>{errors.title}</FieldError>
              </div>
              <div>
                <label htmlFor={`${uid}-dek`} className="sr-only">
                  Dek (standfirst)
                </label>
                <textarea
                  id={`${uid}-dek`}
                  name="dek"
                  rows={2}
                  maxLength={300}
                  value={values.dek}
                  onChange={onField}
                  placeholder="Dek — one or two sentences that make people read on."
                  className="field-sizing-content w-full resize-none border-0 bg-transparent font-serif text-xl leading-snug text-muted placeholder:text-subtle focus:outline-none"
                />
                <div className="text-right">
                  <Counter value={values.dek} max={300} />
                </div>
              </div>
              <div id={`${uid}-body-label`} className="sr-only">
                Article body
              </div>
              <Suspense fallback={<EditorSkeleton />}>
                <RichEditor
                  key={editorKey}
                  initialContent={values.content}
                  ariaLabelledBy={`${uid}-body-label`}
                  onChange={(html) => update({ content: html })}
                />
              </Suspense>
              <FieldError id={err("content")}>{errors.content}</FieldError>
            </div>
          ) : (
            <M.article
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden rounded-[6px] border border-line bg-bg"
              aria-label="Preview"
            >
              {coverPreview && (
                <div className="relative aspect-[21/9] bg-surface-2">
                  <img src={coverPreview} alt={values.featured_image_alt} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="hero-gradient absolute inset-0" aria-hidden="true" />
                </div>
              )}
              <div className="mx-auto max-w-[680px] px-5 py-10">
                <p className="kicker mb-3">
                  {[values.make, TYPE_LABEL[values.article_type], categoryName].filter(Boolean).join(" · ") || "Story"}
                </p>
                <h1 className="font-expanded text-4xl font-extrabold leading-[1.05] tracking-tight">{values.title || "Headline"}</h1>
                {values.dek && <p className="mt-4 font-serif text-xl leading-snug text-muted">{values.dek}</p>}
                <div className="my-8 h-px bg-line" />
                {previewHtml ? (
                  <div className="apex-prose" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                ) : (
                  <p className="text-muted">Nothing written yet.</p>
                )}
              </div>
            </M.article>
          )}
        </div>

        {/* ---------------- meta panel ---------------- */}
        <aside className="h-fit overflow-hidden rounded-[6px] border border-line bg-surface xl:sticky xl:top-20" aria-label="Article settings">
          <Section title="Publishing">
            {isEdit && (
              <div>
                <label htmlFor={`${uid}-status`} className="label-apex">
                  Status
                </label>
                <select id={`${uid}-status`} name="status" value={values.status} onChange={onField} className="field-apex">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}
            <div>
              <label htmlFor={`${uid}-slug`} className="label-apex">
                URL slug
              </label>
              <div className="flex items-center rounded-[2px] border border-line-strong bg-surface focus-within:border-[var(--ring)]">
                <span className="pl-3 font-mono text-xs text-subtle">/articles/</span>
                <input
                  id={`${uid}-slug`}
                  value={values.slug}
                  onChange={(e) => update({ slug: slugify(e.target.value), slugTouched: true })}
                  placeholder="auto-from-title"
                  className="min-h-[42px] w-full bg-transparent px-1 font-mono text-sm text-fg focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span id={`${uid}-feat`} className="text-sm">
                Feature on the home page
                <span className="block text-xs text-subtle">Newest featured story becomes the cover.</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={values.is_featured}
                aria-labelledby={`${uid}-feat`}
                onClick={() => update({ is_featured: !values.is_featured })}
                className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150 ${
                  values.is_featured ? "border-papaya bg-papaya" : "border-line-strong bg-surface-2"
                }`}
              >
                <M.span
                  className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-fg"
                  animate={{ left: values.is_featured ? 22 : 2 }}
                  transition={{ duration: 0.15, ease: EASE }}
                  style={values.is_featured ? { background: "var(--papaya-contrast)" } : undefined}
                />
              </button>
            </div>
          </Section>

          <Section title="Organisation">
            <div>
              <label htmlFor={`${uid}-cat`} className="label-apex">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id={`${uid}-cat`}
                name="category_id"
                value={values.category_id}
                onChange={onField}
                aria-invalid={Boolean(errors.category_id)}
                aria-describedby={err("category_id")}
                className="field-apex"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError id={err("category_id")}>{errors.category_id}</FieldError>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${uid}-make`} className="label-apex">
                  Make
                </label>
                <input
                  id={`${uid}-make`}
                  name="make"
                  list={`${uid}-makes`}
                  value={values.make}
                  onChange={onField}
                  placeholder="McLaren"
                  className="field-apex"
                />
                <datalist id={`${uid}-makes`}>
                  {makes.map((mk) => (
                    <option key={mk.make} value={mk.make} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor={`${uid}-type`} className="label-apex">
                  Type
                </label>
                <select id={`${uid}-type`} name="article_type" value={values.article_type} onChange={onField} className="field-apex">
                  {Object.entries(TYPE_LABEL).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor={`${uid}-tags`} className="label-apex">
                Tags
              </label>
              <input id={`${uid}-tags`} name="tags" value={values.tags} onChange={onField} placeholder="v8, track, review" className="field-apex" />
            </div>
          </Section>

          <Section title="Cover image">
            {coverPreview ? (
              <div className="group relative overflow-hidden rounded-[6px] border border-line">
                <img src={coverPreview} alt="" className="aspect-video w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <button type="button" onClick={() => coverInputRef.current?.click()} className="btn-apex btn-ghost-apex !min-h-8 !border-white/40 !px-3 !text-xs !text-white">
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(null);
                      update({ featured_image_alt: values.featured_image_alt });
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] bg-black/60 text-white"
                    aria-label="Remove cover image"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-line-strong text-sm text-muted transition-colors hover:border-muted hover:text-fg"
              >
                <ImagePlus className="h-6 w-6" aria-hidden="true" />
                Upload cover (max 5 MB)
              </button>
            )}
            <label htmlFor={`${uid}-cover`} className="sr-only">
              Cover image file
            </label>
            <input id={`${uid}-cover`} ref={coverInputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={onCover} />
            <div>
              <label htmlFor={`${uid}-alt`} className="label-apex">
                Alt text {coverPreview && <span className="text-danger">*</span>}
              </label>
              <input
                id={`${uid}-alt`}
                name="featured_image_alt"
                value={values.featured_image_alt}
                onChange={onField}
                placeholder="What's in the photo, for screen readers"
                aria-invalid={Boolean(errors.featured_image_alt)}
                aria-describedby={err("featured_image_alt")}
                className="field-apex"
              />
              <FieldError id={err("featured_image_alt")}>{errors.featured_image_alt}</FieldError>
            </div>
          </Section>

          <Section title="Search appearance" defaultOpen={false}>
            <div className="rounded-[6px] border border-line bg-bg p-3" aria-label="Google result preview">
              <p className="truncate text-xs text-muted">apex.example.com › articles › {values.slug || "slug"}</p>
              <p className="mt-1 line-clamp-1 text-[17px] leading-snug text-[#8ab4f8] [[data-theme=apex-light]_&]:text-[#1a0dab]">{seoTitle}</p>
              <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{seoDesc}</p>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor={`${uid}-seot`} className="label-apex">
                  SEO title
                </label>
                <Counter value={values.seo_title} max={SEO_TITLE_MAX} />
              </div>
              <input
                id={`${uid}-seot`}
                name="seo_title"
                value={values.seo_title}
                onChange={onField}
                placeholder={values.title || "Defaults to the headline"}
                aria-invalid={Boolean(errors.seo_title)}
                aria-describedby={err("seo_title")}
                className="field-apex"
              />
              <FieldError id={err("seo_title")}>{errors.seo_title}</FieldError>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor={`${uid}-seod`} className="label-apex">
                  Meta description
                </label>
                <Counter value={values.seo_description} max={SEO_DESC_MAX} />
              </div>
              <textarea
                id={`${uid}-seod`}
                name="seo_description"
                rows={3}
                value={values.seo_description}
                onChange={onField}
                placeholder="Defaults to the dek"
                aria-invalid={Boolean(errors.seo_description)}
                aria-describedby={err("seo_description")}
                className="field-apex resize-none"
              />
              <FieldError id={err("seo_description")}>{errors.seo_description}</FieldError>
            </div>
          </Section>

          <Section
            title="Spec sheet"
            defaultOpen={false}
            badge={
              Object.values(values.specs).some((v) => v !== "" && v !== null) && (
                <span className="rounded-[2px] bg-data-soft px-1.5 font-mono text-[10px] text-data">ON</span>
              )
            }
          >
            <p className="text-xs text-subtle">Filled specs show as a Spec Sheet card and unlock Compare. Leave empty to hide.</p>
            <div className="grid grid-cols-2 gap-3">
              {SPEC_FIELDS.map((f) => (
                <div key={f.name} className={f.type === "text" && f.name !== "drivetrain" ? "col-span-2" : ""}>
                  <label htmlFor={`${uid}-spec-${f.name}`} className="label-apex">
                    {f.label}
                    {f.unit && <span className="ml-1 font-mono text-[11px] text-subtle">{f.unit}</span>}
                  </label>
                  <input
                    id={`${uid}-spec-${f.name}`}
                    type={f.type}
                    inputMode={f.type === "number" ? "decimal" : undefined}
                    step={f.step}
                    min={f.type === "number" ? 0 : undefined}
                    value={values.specs[f.name] ?? ""}
                    onChange={(e) => updateSpec(f.name, e.target.value)}
                    placeholder={f.placeholder}
                    className="field-apex font-mono tabular-nums"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Gallery"
            defaultOpen={false}
            badge={values.gallery.length > 0 && <span className="font-mono text-[11px] text-subtle">{values.gallery.length}</span>}
          >
            <GalleryManager value={values.gallery} onChange={(gallery) => update({ gallery })} />
          </Section>
        </aside>
      </div>

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        itemType="article"
        message={`"${values.title || "This article"}" will be permanently deleted. This can't be undone.`}
      />
    </div>
  );
}
