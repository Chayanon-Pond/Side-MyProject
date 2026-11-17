import { useId, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { avatarUrl, imgFallback, DEFAULT_AVATAR } from "../../lib/assets";

/** Same limit as the API (content 1–2000 characters). */
export const MAX_COMMENT_LENGTH = 2000;

/** New top-level comment. `onSubmit(text)` resolves to true on success. */
function CommentForm({ onSubmit, onLoginRequired }) {
  const { user } = useAuth();
  const id = useId();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      onLoginRequired?.();
      return;
    }
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_COMMENT_LENGTH || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit(trimmed);
    setSubmitting(false);
    if (ok) setText("");
  };

  const tooLong = text.length > MAX_COMMENT_LENGTH;

  return (
    <div className="rounded-[6px] border border-line bg-surface p-5 md:p-6 mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-4">
          <img
            className="w-10 h-10 rounded-full object-cover"
            src={avatarUrl(user?.profile_image_url)}
            onError={imgFallback(DEFAULT_AVATAR)}
            alt=""
          />
          <div className="flex-1">
            <label htmlFor={`${id}-comment`} className="sr-only">
              Add a comment
            </label>
            <textarea
              id={`${id}-comment`}
              className="field-apex resize-none"
              rows="3"
              placeholder={user ? "Add a comment..." : "Please login to add a comment..."}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => !user && onLoginRequired?.()}
              readOnly={!user}
              disabled={submitting}
              aria-describedby={`${id}-count`}
            />
            <div className="flex justify-between items-center mt-3">
              <span id={`${id}-count`} className={`text-sm ${tooLong ? "text-danger" : "text-subtle"}`}>
                {text.length}/{MAX_COMMENT_LENGTH} characters
              </span>
              <button
                type="submit"
                className="btn-apex btn-primary-apex"
                disabled={submitting || (user && (!text.trim() || tooLong))}
              >
                {submitting ? "Posting..." : user ? "Post Comment" : "Log in to comment"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CommentForm;
