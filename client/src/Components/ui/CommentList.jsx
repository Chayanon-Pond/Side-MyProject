import React from "react";
import CommentItem from "./CommentItem";

function CommentList({ 
  comments, 
  user,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  onReplySubmit,
  onLoginRequired,
  formatCommentDate 
}) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          user={user}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          replyText={replyText}
          setReplyText={setReplyText}
          onReplySubmit={onReplySubmit}
          onLoginRequired={onLoginRequired}
          formatCommentDate={formatCommentDate}
        />
      ))}
    </div>
  );
}

export default CommentList;
