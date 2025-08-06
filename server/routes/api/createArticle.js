import connectionPool from '../../utils/database.js';
import { upload } from '../../middleware/upload.js';
import { generateSlug } from '../../middleware/helpers.js';
import fs from 'fs/promises';

// Create new article
export const createArticle = async (req, res) => {
  // Handle file upload first
  upload.single('featured_image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { 
        title, 
        slug, 
        excerpt, 
        content, 
        category_id, 
        status = 'draft',
        featured_image_alt,
        tags // comma-separated string
      } = req.body;
      
      const author_id = req.user.id; // From JWT token
      
      // Validation is handled by validator middleware
      
      // Generate slug if not provided
      let baseSlug = slug || generateSlug(title);
      let finalSlug = baseSlug;
      let counter = 1;
      
      // Check if slug already exists and generate unique slug
      while (true) {
        const slugCheck = await connectionPool.query(
          'SELECT id FROM articles WHERE slug = $1',
          [finalSlug]
        );
        
        if (slugCheck.rows.length === 0) {
          break; // Slug is unique, break the loop
        }
        
        // If slug exists, append counter and try again
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      
      // Handle featured image
      const featured_image_url = req.file 
        ? `/uploads/articles/${req.file.filename}` 
        : null;
      
      // Begin transaction
      await connectionPool.query('BEGIN');
      
      try {
        // Insert article
        const articleResult = await connectionPool.query(
          `INSERT INTO articles (
            title, slug, excerpt, content, author_id, category_id,
            featured_image_url, featured_image_alt, status, published_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
          RETURNING *`,
          [
            title, 
            finalSlug, 
            excerpt || null, 
            content, 
            author_id, 
            category_id,
            featured_image_url, 
            featured_image_alt || null, 
            status, 
            status === 'published' ? new Date() : null
          ]
        );
        
        const article = articleResult.rows[0];
        
        // Handle tags if provided
        if (tags) {
          const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          
          for (const tagName of tagArray) {
            // Insert or get tag
            const tagResult = await connectionPool.query(
              `INSERT INTO tags (name, slug) 
               VALUES ($1, $2) 
               ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
               RETURNING id`,
              [tagName, generateSlug(tagName)]
            );
            
            // Link tag to article
            await connectionPool.query(
              'INSERT INTO article_tags (article_id, tag_id) VALUES ($1, $2)',
              [article.id, tagResult.rows[0].id]
            );
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
          [article.id]
        );
        
        res.status(201).json({
          message: status === 'published' 
            ? 'Article published successfully' 
            : 'Article saved as draft',
          article: completeArticle.rows[0]
        });
        
      } catch (error) {
        await connectionPool.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Create article error:', error);
      
      // Delete uploaded file if database operation failed
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Failed to delete uploaded file:', unlinkError);
        }
      }
      
      res.status(500).json({ error: 'Failed to create article' });
    }
  });
};