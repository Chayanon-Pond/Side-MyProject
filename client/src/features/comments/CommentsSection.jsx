import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "../../lib/toast";
import { useAuth } from "../auth/AuthContext";
import CommentForm from "./CommentForm";
import CommentList from "./CommentList";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { ErrorState, Spinner } from "../../components/ui/States";
import { COMMENTS_PAGE_SIZE, countComments, createComment, deleteComment, listComments, updateComment } from "../../api/comments";
import { getErrorMessage, isAbortError } from "../../lib/apiClient";

/** Comments for one article: list, post, reply, edit (owner), delete (owner/admin). */
function CommentsSection({ articleId, onLoginRequired }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [comments, setComments] = useState([]);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);
  const shownRef = useRef(0); // top-level comments currently shown (for refresh after load more)
  const shownFor = useRef(articleId);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!articleId) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    if (shownFor.current !== articleId) {
      shownFor.current = articleId;
      shownRef.current = 0;
    }
    // A refresh reloads every page already shown, so posting/editing never collapses the list.
    const pages = Math.max(1, Math.ceil(shownRef.current / COMMENTS_PAGE_SIZE));
    Promise.all(
      Array.from({ length: pages }, (_, i) => listComments(articleId, { offset: i * COMMENTS_PAGE_SIZE, signal: controller.signal }))
    )
      .then((results) => {
        const last = results[results.length - 1];
        const merged = results.flatMap((r) => r.comments);
        shownRef.current = merged.length;
        setComments(merged);
        setTotalComments(last.totalComments);
        setHasMore(last.hasMore);
      })
      .catch((err) => {
        if (isAbortError(err)) return;
        setComments([]);
        setHasMore(false);
        setError(getErrorMessage(err, "Failed to load comments"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [articleId, reloadKey]);

  // Deep link from a notification: /articles/:id?comment=123#comments
  useEffect(() => {
    if (loading) return undefined;
    const commentId = new URLSearchParams(location.search).get("comment");
    const targetId = commentId ? `comment-${commentId}` : location.hash === "#comments" ? "comments" : null;
    if (!targetId) return undefined;
    const t = setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: commentId ? "center" : "start" });
    }, 100);
    return () => clearTimeout(t);
  }, [loading, location.search, location.hash]);

  const handleSessionError = (err, fallback) => {
    // 401s are handled globally by the API client (logout + redirect).
    if (err?.status !== 401) toast.error(getErrorMessage(err, fallback));
  };

  const submitComment = async (text) => {
    try {
      await createComment(articleId, text);
      toast.success("Comment posted successfully!");
      refresh();
      return true;
    } catch (err) {
      handleSessionError(err, "Failed to post comment. Please try again.");
      return false;
    }
  };

  const submitReply = async (parentId, text) => {
    if (!user) {
      onLoginRequired?.();
      return false;
    }
    try {
      await createComment(articleId, text, parentId);
      toast.success("Reply posted successfully!");
      refresh();
      return true;
    } catch (err) {
      handleSessionError(err, "Failed to post reply. Please try again.");
      return false;
    }
  };

  const saveEdit = async (commentId, text) => {
    try {
      await updateComment(commentId, text);
      toast.success("Comment updated");
      refresh();
      return true;
    } catch (err) {
      handleSessionError(err, "Failed to update comment");
      return false;
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteComment(pendingDelete.id);
      toast.success("Comment deleted");
      refresh();
    } catch (err) {
      handleSessionError(err, "Failed to delete comment");
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await listComments(articleId, { offset: comments.length });
      const known = new Set(comments.map((c) => c.id));
      const merged = [...comments, ...page.comments.filter((c) => !known.has(c.id))];
      shownRef.current = merged.length;
      setComments(merged);
      setTotalComments(page.totalComments);
      setHasMore(page.hasMore);
    } catch (err) {
      if (!isAbortError(err)) toast.error(getErrorMessage(err, "Failed to load more comments"));
    } finally {
      setLoadingMore(false);
    }
  };

  const total = Math.max(totalComments, countComments(comments));

  return (
    <section id="comments" className="mb-8 scroll-mt-32" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="mb-6 font-display text-2xl font-bold text-fg">
        The conversation <span className="font-mono text-base font-normal text-subtle">({total})</span>
      </h2>

      <CommentForm onSubmit={submitComment} onLoginRequired={onLoginRequired} />

      {loading ? (
        <Spinner label="Loading comments" />
      ) : error ? (
        <ErrorState title="Couldn't load comments" message={error} onRetry={refresh} />
      ) : (
        <>
          <CommentList
            comments={comments}
            user={user}
            isAdmin={isAdmin}
            onReply={submitReply}
            onEdit={saveEdit}
            onDelete={setPendingDelete}
            onLoginRequired={onLoginRequired}
          />
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={loadMore} disabled={loadingMore} className="btn-apex btn-ghost-apex min-w-48">
                {loadingMore ? "Loading…" : "Load more comments"}
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        itemType="comment"
        message={
          pendingDelete?.replies?.length
            ? "Delete this comment and all of its replies? This cannot be undone."
            : "Delete this comment? This cannot be undone."
        }
      />
    </section>
  );
}

export default CommentsSection;
