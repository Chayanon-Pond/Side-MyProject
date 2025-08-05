import connectionPool from '../../utils/database.js';
import { getPaginationParams } from '../../middleware/helpers.js';
// Get all articles (with pagination, filtering, search)
export const getArticles = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      status = 'published',
      search,
      sort = 'created_at',
      order = 'DESC' 
    } = req.query;
    
    const { limit: limitNum, offset } = getPaginationParams(page, limit);
    
    // Build query
    let query = `
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.excerpt,
        a.featured_image_url,
        a.featured_image_alt,
        a.status,
        a.published_at,
        a.created_at,
        a.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug,
        u.id as author_id,
        u.full_name as author_name,
        u.username as author_username,
        array_agg(DISTINCT t.name) as tags
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;
    
    // Filter by status (for public routes, only show published)
    if (!req.user || req.query.status !== undefined) {
      query += ` AND a.status = $${++paramCount}`;
      queryParams.push(status);
    }
    
    // Filter by category
    if (category) {
      query += ` AND c.slug = $${++paramCount}`;
      queryParams.push(category);
    }
    
    // Search in title and content
    if (search) {
      query += ` AND (a.title ILIKE $${++paramCount} OR a.content ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }
    
    // Group by
    query += ` GROUP BY a.id, c.id, c.name, c.slug, u.id, u.full_name, u.username`;
    
    // Order
    const allowedSortFields = ['created_at', 'published_at', 'title', 'updated_at'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY a.${sortField} ${sortOrder}`;
    
    // Pagination
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    queryParams.push(limitNum, offset);
    
    // Execute query
    const result = await connectionPool.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT a.id) as total
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      WHERE 1=1
    `;
    
    const countParams = [];
    paramCount = 0;
    
    if (!req.user || req.query.status !== undefined) {
      countQuery += ` AND a.status = $${++paramCount}`;
      countParams.push(status);
    }
    
    if (category) {
      countQuery += ` AND c.slug = $${++paramCount}`;
      countParams.push(category);
    }
    
    if (search) {
      countQuery += ` AND (a.title ILIKE $${++paramCount} OR a.content ILIKE $${paramCount})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await connectionPool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      articles: result.rows,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
};

// Get single article by ID
export const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.full_name as author_name,
        u.username as author_username,
        u.email as author_email,
        array_agg(DISTINCT t.name) as tags
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.id = $1
      GROUP BY a.id, c.name, c.slug, u.full_name, u.username, u.email
    `;
    
    const result = await connectionPool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    const article = result.rows[0];
    
    // Check if article is published or user is the author
    if (article.status !== 'published' && 
        (!req.user || req.user.id !== article.author_id)) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json(article);
    
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
};

// Get article by slug
export const getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const query = `
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.full_name as author_name,
        u.username as author_username,
        array_agg(DISTINCT t.name) as tags
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN article_tags at ON a.id = at.article_id
      LEFT JOIN tags t ON at.tag_id = t.id
      WHERE a.slug = $1 AND a.status = 'published'
      GROUP BY a.id, c.name, c.slug, u.full_name, u.username
    `;
    
    const result = await connectionPool.query(query, [slug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('Error fetching article by slug:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
};