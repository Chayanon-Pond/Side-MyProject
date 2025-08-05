import connectionPool from "../../../utils/database.js";
import { generateSlug } from "../../../middleware/helpers.js";

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

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
   
    // Check if user is admin
    const isAdmin = await checkAdminRole(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can create categories' });
    }
   
    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
   
    // Generate slug
    const slug = generateSlug(name);
   
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
      [name.trim(), slug, description || null]
    );
   
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};