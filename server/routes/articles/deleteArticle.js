import path from 'path';
import { fileURLToPath } from 'url';
import connectionPool from '../../utils/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Delete article
export const deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const author_id = req.user.userId;
    
    // Begin transaction
    await connectionPool.query('BEGIN');
    
    try {
      // Check if article exists and get details
      const checkResult = await connectionPool.query(
        `SELECT a.*, u.role 
         FROM articles a 
         JOIN users u ON u.id = $2
         WHERE a.id = $1`,
        [id, author_id]
      );
      
      if (checkResult.rows.length === 0) {
        await connectionPool.query('ROLLBACK');
        return res.status(404).json({ error: 'Article not found' });
      }
      
      const article = checkResult.rows[0];
      const userRole = checkResult.rows[0].role;
      
      // Check ownership (allow if owner or admin)
      if (article.author_id !== author_id && userRole !== 'admin') {
        await connectionPool.query('ROLLBACK');
        return res.status(403).json({ error: 'Unauthorized to delete this article' });
      }
      
      // Delete related data first
      // Delete article tags
      await connectionPool.query(
        'DELETE FROM article_tags WHERE article_id = $1',
        [id]
      );
      
      // Delete comments if you have a comments table
      // await connectionPool.query(
      //   'DELETE FROM comments WHERE article_id = $1',
      //   [id]
      // );
      
      // Delete the article
      const deleteResult = await connectionPool.query(
        'DELETE FROM articles WHERE id = $1 RETURNING id, featured_image_url',
        [id]
      );
      
      if (deleteResult.rows.length === 0) {
        await connectionPool.query('ROLLBACK');
        return res.status(404).json({ error: 'Failed to delete article' });
      }
      
      // Commit transaction
      await connectionPool.query('COMMIT');
      
      // Delete image file if exists
      if (article.featured_image_url) {
        const fs = await import('fs/promises');
        const imagePath = path.join(__dirname, '../../..', article.featured_image_url);
        
        try {
          await fs.unlink(imagePath);
          console.log('Deleted image file:', article.featured_image_url);
        } catch (error) {
          console.error('Failed to delete image file:', error);
          // Don't fail the request if image deletion fails
        }
      }
      
      // Log the deletion (optional)
      await connectionPool.query(
        `INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [author_id, 'delete', 'article', id, JSON.stringify({ title: article.title })]
      ).catch(err => {
        console.error('Failed to log deletion:', err);
        // Don't fail the request if logging fails
      });
      
      res.json({ 
        message: 'Article deleted successfully',
        deletedId: id 
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

// Bulk delete articles (admin only)
export const bulkDeleteArticles = async (req, res) => {
  try {
    const { ids } = req.body; // Array of article IDs
    const user_id = req.user.userId;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid article IDs' });
    }
    
    // Check if user is admin
    const userCheck = await connectionPool.query(
      'SELECT role FROM users WHERE id = $1',
      [user_id]
    );
    
    if (userCheck.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Begin transaction
    await connectionPool.query('BEGIN');
    
    try {
      // Get articles to be deleted (for image cleanup)
      const articlesResult = await connectionPool.query(
        'SELECT id, featured_image_url FROM articles WHERE id = ANY($1)',
        [ids]
      );
      
      // Delete related data
      await connectionPool.query(
        'DELETE FROM article_tags WHERE article_id = ANY($1)',
        [ids]
      );
      
      // Delete articles
      const deleteResult = await connectionPool.query(
        'DELETE FROM articles WHERE id = ANY($1) RETURNING id',
        [ids]
      );
      
      // Commit transaction
      await connectionPool.query('COMMIT');
      
      // Clean up image files
      const fs = await import('fs/promises');
      for (const article of articlesResult.rows) {
        if (article.featured_image_url) {
          const imagePath = path.join(__dirname, '../../..', article.featured_image_url);
          try {
            await fs.unlink(imagePath);
          } catch (error) {
            console.error('Failed to delete image:', error);
          }
        }
      }
      
      res.json({
        message: 'Articles deleted successfully',
        deletedCount: deleteResult.rowCount,
        deletedIds: deleteResult.rows.map(row => row.id)
      });
      
    } catch (error) {
      await connectionPool.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete articles' });
  }
};

// Soft delete (archive) article
export const archiveArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const author_id = req.user.userId;
    
    // Check ownership
    const checkResult = await connectionPool.query(
      `SELECT author_id, status FROM articles WHERE id = $1`,
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    if (checkResult.rows[0].author_id !== author_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Update status to archived
    const updateResult = await connectionPool.query(
      `UPDATE articles 
       SET status = 'archived', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING id, title, status`,
      [id]
    );
    
    res.json({
      message: 'Article archived successfully',
      article: updateResult.rows[0]
    });
    
  } catch (error) {
    console.error('Archive article error:', error);
    res.status(500).json({ error: 'Failed to archive article' });
  }
};