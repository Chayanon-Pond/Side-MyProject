import { useId, useState } from "react";
import { avatarUrl, imgFallback, DEFAULT_AVATAR } from "../../lib/assets";
import { timeAgo } from "../../lib/format";
import { MAX_COMMENT_LENGTH } from "./CommentForm";

const textareaClass =
  "field-apex resize-none";

/**
 * One comment + its replies (recursive).
 * Handlers resolve to true on success: onReply(parentId, text), onEdit(id, text). onDelete(comment) opens a confirm.
 */
function CommentItem({ comment, user, isAdmin, replyingTo, setReplyingTo, onReply, onEdit, onDelete, onLoginRequired }) {
  const id = useId();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content || "");
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwner = Boolean(user && comment.user_id === user.id);
  const canDelete = isOwner || isAdmin;
  const isReplying = replyingTo === comment.id;

  const handleReplyClick = () => {
    if (!user) {
      onLoginRequired?.();
      return;
    }
    setReplyingTo(isReplying ? null : comment.id);
  };

  const saveEdit = async () => {
    const text = editContent.trim();
    if (!text || text.length > MAX_COMMENT_LENGTH) return;
    setBusy(true);
    const ok = await onEdit(comment.id, text);
    setBusy(false);
    if (ok) setIsEditing(false);
  };

  const sendReply = async () => {
    const text = replyText.trim();
    if (!text || text.length > MAX_COMMENT_LENGTH) return;
    setBusy(true);
    const ok = await onReply(comment.id, text);
    setBusy(false);
    if (ok) {
      setReplyText("");
      setReplyingTo(null);
    }
  };

  return (
    <article id={`comment-${comment.id}`} className="rounded-[6px] border border-line bg-surface p-5 md:p-6 scroll-mt-32">
      <div className="flex space-x-4">
        <img
          className="w-10 h-10 rounded-full object-cover"
          src={avatarUrl(comment.user_profile_image_url || comment.profile_image_url || comment.user_avatar)}
          onError={imgFallback(DEFAULT_AVATAR)}
          alt=""
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-medium text-fg">{comment.user_name || "Anonymous"}</h3>
            <time className="text-sm text-subtle" dateTime={comment.created_at}>
              {timeAgo(comment.created_at)}
            </time>
          </div>

          {!isEditing ? (
            <p className="text-muted mb-3 whitespace-pre-wrap break-words">{comment.content}</p>
          ) : (
            <div>
              <label htmlFor={`${id}-edit`} className="sr-only">
                Edit comment
              </label>
              <textarea
                id={`${id}-edit`}
                className={textareaClass}
                rows={3}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  type="button"
                  className="px-3 py-1 text-sm text-subtle hover:text-muted cursor-pointer"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content || "");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-apex btn-primary-apex !min-h-9 !px-3 !text-xs rounded hover:brightness-110 disabled:opacity-50 cursor-pointer"
                  onClick={saveEdit}
                  disabled={busy || !editContent.trim()}
                >
                  {busy ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="text-sm text-subtle hover:text-papaya-ink transition-colors cursor-pointer"
              onClick={handleReplyClick}
              aria-expanded={isReplying}
            >
              Reply
            </button>
            {isOwner && !isEditing && (
              <button
                type="button"
                className="text-sm text-subtle hover:text-papaya-ink transition-colors cursor-pointer"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="text-sm text-subtle hover:text-danger transition-colors cursor-pointer"
                onClick={() => onDelete(comment)}
              >
                Delete
              </button>
            )}
          </div>

          {isReplying && user && (
            <div className="mt-4 pl-4 border-l-2 border-line">
              <div className="flex space-x-3">
                <img
                  className="w-8 h-8 rounded-full object-cover"
                  src={avatarUrl(user.profile_image_url)}
                  onError={imgFallback(DEFAULT_AVATAR)}
                  alt=""
                />
                <div className="flex-1">
                  <label htmlFor={`${id}-reply`} className="sr-only">
                    Reply to {comment.user_name || "comment"}
                  </label>
                  <textarea
                    id={`${id}-reply`}
                    className={textareaClass}
                    rows="2"
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      type="button"
                      className="px-3 py-1 text-sm text-subtle hover:text-muted cursor-pointer"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-apex btn-primary-apex !min-h-9 !px-3 !text-xs rounded hover:brightness-110 disabled:opacity-50 cursor-pointer"
                      onClick={sendReply}
                      disabled={busy || !replyText.trim() || replyText.length > MAX_COMMENT_LENGTH}
                    >
                      {busy ? "Sending..." : "Reply"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {comment.replies?.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-line space-y-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  user={user}
                  isAdmin={isAdmin}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onLoginRequired={onLoginRequired}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default CommentItem;
