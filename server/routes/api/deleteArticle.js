import connectionPool from '../../utils/database';
import fs from 'fs/promises';
import path from 'path';

export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    
    // Check if article exists and get details
    const articleCheck = await connectionPool.query(
      'SELECT id, author_id, featured_image_url FROM articles WHERE id = $1',
      [id]
    );
    
    if (articleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    const article = articleCheck.rows[0];
    
    // Check if user is the author or admin
    const isAdmin = await checkAdminRole(user_id);
    if (article.author_id !== user_id && !isAdmin) {
      return res.status(403).json({ 
        error: 'You do not have permission to delete this article' 
      });
    }
    
    // Begin transaction
    await connectionPool.query('BEGIN');
    
    try {
      // Delete article tags first (due to foreign key)
      await connectionPool.query(
        'DELETE FROM article_tags WHERE article_id = $1',
        [id]
      );
      
      // Delete article
      await connectionPool.query(
        'DELETE FROM articles WHERE id = $1',
        [id]
      );
      
      // Commit transaction
      await connectionPool.query('COMMIT');
      
      // Delete featured image if exists
      if (article.featured_image_url) {
        try {
          const imagePath = `./uploads/articles/${path.basename(article.featured_image_url)}`;
          await fs.unlink(imagePath);
        } catch (unlinkError) {
          console.error('Failed to delete article image:', unlinkError);
          // Don't throw error, image deletion is not critical
        }
      }
      
      res.json({ 
        message: 'Article deleted successfully' 
      });
      
    } catch (error) {
      await connectionPool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
};

// Helper function to check admin role
async function checkAdminRole(userId) {
  try {
    const result = await connectionPool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    return result.rows.length > 0 && result.rows[0].role === 'admin';
  } catch (error) {
    return false;
  }
}