import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import connectionPool from '../../utils/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer configuration (same as create)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads/articles'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).single('featured_image');

// Update article
export const updateArticle = async (req, res) => {
  upload(req, res, async (err) => {
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
        meta_title, 
        meta_description, 
        status,
        featured_image_alt,
        remove_image,
        tags
      } = req.body;
      
      const author_id = req.user.userId;
      
      // Check if article exists and belongs to user (or user is admin)
      const checkResult = await connectionPool.query(
        `SELECT a.*, u.role 
         FROM articles a 
         JOIN users u ON u.id = $2
         WHERE a.id = $1`,
        [id, author_id]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      const article = checkResult.rows[0];
      const userRole = checkResult.rows[0].role;
      
      // Check ownership (allow if owner or admin)
      if (article.author_id !== author_id && userRole !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized to edit this article' });
      }
      
      // Check slug uniqueness if changed
      if (slug && slug !== article.slug) {
        const slugCheck = await connectionPool.query(
          'SELECT id FROM articles WHERE slug = $1 AND id != $2',
          [slug, id]
        );
        
        if (slugCheck.rows.length > 0) {
          return res.status(400).json({ 
            error: 'An article with this slug already exists' 
          });
        }
      }
      
      // Begin transaction
      await connectionPool.query('BEGIN');
      
      try {
        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramCount = 0;
        
        if (title !== undefined) {
          paramCount++;
          updates.push(`title = $${paramCount}`);
          values.push(title);
        }
        
        if (slug !== undefined) {
          paramCount++;
          updates.push(`slug = $${paramCount}`);
          values.push(slug);
        }
        
        if (excerpt !== undefined) {
          paramCount++;
          updates.push(`excerpt = $${paramCount}`);
          values.push(excerpt);
        }
        
        if (content !== undefined) {
          paramCount++;
          updates.push(`content = $${paramCount}`);
          values.push(content);
        }
        
        if (category_id !== undefined) {
          paramCount++;
          updates.push(`category_id = $${paramCount}`);
          values.push(category_id);
        }
        
        if (meta_title !== undefined) {
          paramCount++;
          updates.push(`meta_title = $${paramCount}`);
          values.push(meta_title);
        }
        
        if (meta_description !== undefined) {
          paramCount++;
          updates.push(`meta_description = $${paramCount}`);
          values.push(meta_description);
        }
        
        if (status !== undefined) {
          paramCount++;
          updates.push(`status = $${paramCount}`);
          values.push(status);
          
          // Update published_at if changing to published
          if (status === 'published' && article.status !== 'published') {
            paramCount++;
            updates.push(`published_at = $${paramCount}`);
            values.push(new Date());
          }
        }
        
        // Handle image
        if (req.file) {
          paramCount++;
          updates.push(`featured_image_url = $${paramCount}`);
          values.push(`/uploads/articles/${req.file.filename}`);
          
          // Delete old image
          if (article.featured_image_url) {
            const fs = await import('fs/promises');
            const oldImagePath = path.join(__dirname, '../../..', article.featured_image_url);
            try {
              await fs.unlink(oldImagePath);
            } catch (error) {
              console.error('Failed to delete old image:', error);
            }
          }
        } else if (remove_image === 'true') {
          paramCount++;
          updates.push(`featured_image_url = $${paramCount}`);
          values.push(null);
          
          // Delete existing image
          if (article.featured_image_url) {
            const fs = await import('fs/promises');
            const imagePath = path.join(__dirname, '../../..', article.featured_image_url);
            try {
              await fs.unlink(imagePath);
            } catch (error) {
              console.error('Failed to delete image:', error);
            }
          }
        }
        
        if (featured_image_alt !== undefined) {
          paramCount++;
          updates.push(`featured_image_alt = $${paramCount}`);
          values.push(featured_image_alt);
        }
        
        // Always update updated_at
        updates.push('updated_at = CURRENT_TIMESTAMP');
        
        // Add article id for WHERE clause
        paramCount++;
        values.push(id);
        
        // Execute update
        const updateQuery = `
          UPDATE articles 
          SET ${updates.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;
        
        const updateResult = await connectionPool.query(updateQuery, values);
        
        // Handle tags
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
                [tagName, tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')]
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
        
        // Get updated article with relations
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
        const fs = await import('fs/promises');
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