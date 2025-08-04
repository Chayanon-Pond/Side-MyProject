import connectionPool from "../../../utils/database.js";

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

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user is admin
    const isAdmin = await checkAdminRole(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete categories' });
    }
    
    // Delete category
    const result = await connectionPool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    
    // Handle foreign key constraint error
    if (error.code === '23503') {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing articles. Please reassign or delete the articles first.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to delete category' });
  }
};