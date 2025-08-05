import React from "react";
import { useAuth } from "../../contexts/authentication";

function CommentItem({
  comment,
  user,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  onReplySubmit,
  onLoginRequired,
  formatCommentDate,
}) {
  const { token } = useAuth();

  const handleReplyClick = () => {
    if (!user || !token) {
      onLoginRequired();
      return;
    }
    setReplyingTo(replyingTo === comment.id ? null : comment.id);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex space-x-4">
        <img
          className="w-10 h-10 rounded-full"
          src="https://res.cloudinary.com/dcbpjtd1r/image/upload/v1728449784/my-blog-post/xgfy0xnvyemkklcqodkg.jpg"
          alt={comment.user_name}
        />
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="font-medium text-gray-900">{comment.user_name}</h4>
            <span className="text-sm text-gray-500">
              {formatCommentDate(comment.created_at)}
            </span>
          </div>
          <p className="text-gray-700 mb-3 whitespace-pre-wrap">
            {comment.content}
          </p>
          <div className="flex items-center space-x-4">
            <button
              className="text-sm text-gray-500 hover:text-blue-500 transition-colors"
              onClick={handleReplyClick}
            >
              Reply
            </button>
            {comment.user_id === user?.id && (
              <button className="text-sm text-gray-500 hover:text-red-500 transition-colors">
                Delete
              </button>
            )}
          </div>

          {/* Reply Form */}
          {replyingTo === comment.id && user && (
            <div className="mt-4 pl-4 border-l-2 border-gray-200">
              <div className="flex space-x-3">
                <img
                  className="w-8 h-8 rounded-full"
                  src="https://res.cloudinary.com/dcbpjtd1r/image/upload/v1728449784/my-blog-post/xgfy0xnvyemkklcqodkg.jpg"
                  alt={user.full_name || user.fullName || user.name || "User"}
                />
                <div className="flex-1">
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    rows="2"
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  ></textarea>
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      onClick={() => onReplySubmit(comment.id)}
                      disabled={!replyText.trim()}
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-4">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex space-x-3">
                  <img
                    className="w-8 h-8 rounded-full"
                    src="https://res.cloudinary.com/dcbpjtd1r/image/upload/v1728449784/my-blog-post/xgfy0xnvyemkklcqodkg.jpg"
                    alt={reply.user_name}
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="text-sm font-medium text-gray-900">
                        {reply.user_name}
                      </h5>
                      <span className="text-xs text-gray-500">
                        {formatCommentDate(reply.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {reply.content}
                    </p>
                    {reply.user_id === user?.id && (
                      <button className="text-xs text-gray-500 hover:text-red-500 mt-1">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommentItem;
