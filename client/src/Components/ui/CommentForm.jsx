import React from "react";
import { useAuth } from "../../contexts/authentication";

function CommentForm({ 
  commentText, 
  setCommentText, 
  onSubmit, 
  submittingComment,
  onLoginRequired 
}) {
  const { user, token } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!user || !token) {
      onLoginRequired();
      return;
    }
    
    onSubmit(e);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
      <form onSubmit={handleSubmit}>
        <div className="flex space-x-4">
          <img
            className="w-10 h-10 rounded-full"
            src="https://res.cloudinary.com/dcbpjtd1r/image/upload/v1728449784/my-blog-post/xgfy0xnvyemkklcqodkg.jpg"
            alt={user?.full_name || user?.fullName || "Guest"}
          />
          <div className="flex-1">
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              rows="3"
              placeholder={
                user && token
                  ? "Add a comment..."
                  : "Please login to add a comment..."
              }
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={submittingComment || !user || !token}
            ></textarea>
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-gray-500">
                {commentText.length}/1000 characters
              </span>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  submittingComment ||
                  (user &&
                    token &&
                    (!commentText.trim() || commentText.length > 1000))
                }
              >
                {submittingComment ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default CommentForm;
