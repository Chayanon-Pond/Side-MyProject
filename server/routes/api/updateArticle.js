import connectionPool from '../../utils/database.js';
import { upload } from '../../middleware/upload.js';
import { generateSlug} from '../..'
import fs from 'fs/promises';

export const updateArticle = async (req, res) => {
  // Handle file upload first
  upload.single('featured_image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { id } = req.params;
      const { 
        title, 
        slug, 
        excerpt, 
        content, 
        category_id, 
        status,
        featured_image_alt,
        tags,
        remove_image // flag to remove existing image
      } = req.body;
      
      const user_id = req.user.userId;
      
      // Check if article exists and user has permission
      const articleCheck = await connectionPool.query(
        'SELECT id, author_id, featured_image_url, status as current_status FROM articles WHERE id = $1',
        [id]
      );
      
      if (articleCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      const existingArticle = articleCheck.rows[0];
      
      // Check if user is the author or admin
      const isAdmin = await checkAdminRole(user_id);
      if (existingArticle.author_id !== user_id && !isAdmin) {
        return res.status(403).json({ error: 'You do not have permission to edit this article' });
      }
      
      // Generate slug if title changed and no custom slug provided
      const finalSlug = slug || (title ? generateSlug(title) : undefined);
      
      // Check if new slug already exists (if slug is being changed)
      if (finalSlug) {
        const slugCheck = await connectionPool.query(
          'SELECT id FROM articles WHERE slug = $1 AND id != $2',
          [finalSlug, id]
        );
        
        if (slugCheck.rows.length > 0) {
          // Delete newly uploaded file if exists
          if (req.file) {
            try {
              await fs.unlink(req.file.path);
            } catch (unlinkError) {
              console.error('Failed to delete uploaded file:', unlinkError);
            }
          }
          
          return res.status(400).json({ 
            error: 'An article with this slug already exists' 
          });
        }
      }
      
      // Handle featured image
      let featured_image_url = existingArticle.featured_image_url;
      
      if (remove_image === 'true') {
        // Remove existing image
        if (existingArticle.featured_image_url) {
          try {
            const imagePath = `./uploads/articles/${path.basename(existingArticle.featured_image_url)}`;
            await fs.unlink(imagePath);
          } catch (unlinkError) {
            console.error('Failed to delete old image:', unlinkError);
          }
        }
        featured_image_url = null;
      }
      
      if (req.file) {
        // Delete old image if exists
        if (existingArticle.featured_image_url) {
          try {
            const imagePath = `./uploads/articles/${path.basename(existingArticle.featured_image_url)}`;
            await fs.unlink(imagePath);
          } catch (unlinkError) {
            console.error('Failed to delete old image:', unlinkError);
          }
        }
        featured_image_url = `/uploads/articles/${req.file.filename}`;
      }
      
      // Begin transaction
      await connectionPool.query('BEGIN');
      
      try {
        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;
        
        if (title !== undefined) {
          updateFields.push(`title = $${paramCount++}`);
          updateValues.push(title);
        }
        
        if (finalSlug !== undefined) {
          updateFields.push(`slug = $${paramCount++}`);
          updateValues.push(finalSlug);
        }
        
        if (excerpt !== undefined) {
          updateFields.push(`excerpt = $${paramCount++}`);
          updateValues.push(excerpt || null);
        }
        
        if (content !== undefined) {
          updateFields.push(`content = $${paramCount++}`);
          updateValues.push(content);
        }
        
        if (category_id !== undefined) {
          updateFields.push(`category_id = $${paramCount++}`);
          updateValues.push(category_id);
        }
        
        if (status !== undefined) {
          updateFields.push(`status = $${paramCount++}`);
          updateValues.push(status);
          
          // Update published_at if status changed to published
          if (status === 'published' && existingArticle.current_status !== 'published') {
            updateFields.push(`published_at = $${paramCount++}`);
            updateValues.push(new Date());
          }
        }
        
        if (featured_image_url !== existingArticle.featured_image_url) {
          updateFields.push(`featured_image_url = $${paramCount++}`);
          updateValues.push(featured_image_url);
        }
        
        if (featured_image_alt !== undefined) {
          updateFields.push(`featured_image_alt = $${paramCount++}`);
          updateValues.push(featured_image_alt || null);
        }
        
        // Always update updated_at
        updateFields.push(`updated_at = $${paramCount++}`);
        updateValues.push(new Date());
        
        // Add ID to values
        updateValues.push(id);
        
        // Update article
        const updateQuery = `
          UPDATE articles 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;
        
        const articleResult = await connectionPool.query(updateQuery, updateValues);
        const article = articleResult.rows[0];
        
        // Handle tags if provided
        if (tags !== undefined) {
          // Delete existing tags
          await connectionPool.query(
            'DELETE FROM article_tags WHERE article_id = $1',
            [id]
          );
          
          // Add new tags
          if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            
            for (const tagName of tagArray) {
              const tagResult = await connectionPool.query(
                `INSERT INTO tags (name, slug) 
                 VALUES ($1, $2) 
                 ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                 RETURNING id`,
                [tagName, generateSlug(tagName)]
              );
              
              await connectionPool.query(
                'INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2)',
                [id, tagResult.rows[0].id]
              );
            }
          }
        }
        
        // Commit transaction
        await connectionPool.query('COMMIT');
        
        // Get complete article with relations
        const completeArticle = await connectionPool.query(
          `SELECT 
            a.*,
            c.name as category_name,
            u.full_name as author_name,
            array_agg(t.name) as tags
          FROM articles a
          LEFT JOIN categories c ON a.category_id = c.id
          LEFT JOIN users u ON a.author_id = u.id
          LEFT JOIN article_tags at ON a.id = at.article_id
          LEFT JOIN tags t ON at.tag_id = t.id
          WHERE a.id = $1
          GROUP BY a.id, c.name, u.full_name`,
          [id]
        );
        
        res.json({
          message: 'Article updated successfully',
          article: completeArticle.rows[0]
        });
        
      } catch (error) {
        await connectionPool.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Update article error:', error);
      
      // Delete uploaded file if database operation failed
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      
      res.status(500).json({ error: 'Failed to update article' });
    }
  });
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