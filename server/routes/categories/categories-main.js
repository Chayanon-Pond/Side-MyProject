import express from 'express';
import connectionPool from '../../utils/database.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const result = await connectionPool.query(
      'SELECT id, name, slug, description FROM categories ORDER BY name ASC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create new category (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if user is admin
    const userCheck = await connectionPool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create categories' });
    }
    
    // Validate input
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check if category with this slug already exists
    const slugCheck = await connectionPool.query(
      'SELECT id FROM categories WHERE slug = $1',
      [slug]
    );
    
    if (slugCheck.rows.length > 0) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }
    
    // Insert category
    const result = await connectionPool.query(
      'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
      [name, slug, description || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

export default router;