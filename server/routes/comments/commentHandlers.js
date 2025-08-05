import connectionPool from '../../utils/database.js';

// Get comments for an article
export const getCommentsByArticle = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Get comments with user information
    const query = `
      SELECT 
        c.id,
        c.content,
        c.parent_id,
        c.status,
        c.created_at,
        c.updated_at,
        u.id as user_id,
        u.full_name as user_name,
        u.username as user_username,
        u.email as user_email
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.article_id = $1 AND c.status = 'approved'
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await connectionPool.query(query, [articleId, limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM comments WHERE article_id = $1 AND status = $2';
    const countResult = await connectionPool.query(countQuery, [articleId, 'approved']);
    const total = parseInt(countResult.rows[0].total);

    // Organize comments by parent/child structure
    const comments = result.rows;
    const commentMap = new Map();
    const topLevelComments = [];

    // First pass: create all comment objects
    comments.forEach(comment => {
      commentMap.set(comment.id, {
        ...comment,
        replies: []
      });
    });

    // Second pass: organize hierarchy
    comments.forEach(comment => {
      if (comment.parent_id) {
        // This is a reply
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentMap.get(comment.id));
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(commentMap.get(comment.id));
      }
    });

    res.json({
      comments: topLevelComments,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit),
        currentPage: Math.floor(offset / limit) + 1
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

// Create a new comment
export const createComment = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { content, parent_id = null } = req.body;
    const userId = req.user?.id; // From auth middleware

    console.log('Create comment request:');
    console.log('- Article ID:', articleId);
    console.log('- User from req:', req.user);
    console.log('- User ID:', userId);
    console.log('- Content:', content);

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' });
    }

    // Check if article exists
    const articleCheck = await connectionPool.query(
      'SELECT id FROM articles WHERE id = $1 AND status = $2',
      [articleId, 'published']
    );

    if (articleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // If parent_id is provided, check if parent comment exists
    if (parent_id) {
      const parentCheck = await connectionPool.query(
        'SELECT id FROM comments WHERE id = $1 AND article_id = $2',
        [parent_id, articleId]
      );

      if (parentCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }

    // Insert new comment
    const insertQuery = `
      INSERT INTO comments (article_id, user_id, parent_id, content, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await connectionPool.query(insertQuery, [
      articleId,
      userId,
      parent_id,
      content.trim(),
      'approved' // Auto-approve for now, can be changed to 'pending' for moderation
    ]);

    // Get the comment with user information
    const commentQuery = `
      SELECT 
        c.id,
        c.content,
        c.parent_id,
        c.status,
        c.created_at,
        c.updated_at,
        u.id as user_id,
        u.full_name as user_name,
        u.username as user_username
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;

    const commentResult = await connectionPool.query(commentQuery, [result.rows[0].id]);

    res.status(201).json({
      message: 'Comment created successfully',
      comment: commentResult.rows[0]
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
};

// Update a comment (only by the author)
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' });
    }

    // Check if comment exists and belongs to the user
    const commentCheck = await connectionPool.query(
      'SELECT id, user_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    // Update comment
    const updateQuery = `
      UPDATE comments 
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await connectionPool.query(updateQuery, [content.trim(), commentId]);

    res.json({
      message: 'Comment updated successfully',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
};

// Delete a comment (only by the author)
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // Check if comment exists and belongs to the user
    const commentCheck = await connectionPool.query(
      'SELECT id, user_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (commentCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Delete comment (cascade will handle replies)
    await connectionPool.query('DELETE FROM comments WHERE id = $1', [commentId]);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};
