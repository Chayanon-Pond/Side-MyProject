import { useState } from "react";
import CommentItem from "./CommentItem";

function CommentList({ comments, ...handlers }) {
  const [replyingTo, setReplyingTo] = useState(null);

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-subtle">
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
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          {...handlers}
        />
      ))}
    </div>
  );
}

export default CommentList;
