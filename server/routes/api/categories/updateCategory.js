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

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    // Check if user is admin
    const isAdmin = await checkAdminRole(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can update categories' });
    }
    
    // Check if category exists
    const categoryCheck = await connectionPool.query(
      'SELECT id FROM categories WHERE id = $1',
      [id]
    );
    
    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    // Generate new slug
    const slug = generateSlug(name);
    
    // Check if another category with this slug exists
    const slugCheck = await connectionPool.query(
      'SELECT id FROM categories WHERE slug = $1 AND id != $2',
      [slug, id]
    );
    
    if (slugCheck.rows.length > 0) {
      return res.status(400).json({ error: 'A category with this name already exists' });
    }
    
    // Update category
    const result = await connectionPool.query(
      'UPDATE categories SET name = $1, slug = $2, description = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [name.trim(), slug, description || null, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};