import connectionPool from '../../utils/database.js';

// Get all articles with filters
export const getAllArticles = async (req, res) => {
  try {
    const { 
      search, 
      status = 'published', 
      category_id, 
      author_id,
      limit = 10, 
      offset = 0,
      sort = 'newest' 
    } = req.query;
    
    let query = `
      SELECT 
        a.id,
        a.title,
        a.slug,
        a.excerpt,
        a.featured_image_url,
        a.featured_image_alt,
        a.status,
        a.view_count,
        a.published_at,
        a.created_at,
        a.updated_at,
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug,
        u.id as author_id,
        u.full_name as author_name,
        u.username as author_username
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    // Add filters
    if (status && status !== 'all') {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    if (search) {
      paramCount++;
      query += ` AND (a.title ILIKE $${paramCount} OR a.content ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    if (category_id) {
      paramCount++;
      query += ` AND a.category_id = $${paramCount}`;
      params.push(category_id);
    }

    if (author_id) {
      paramCount++;
      query += ` AND a.author_id = $${paramCount}`;
      params.push(author_id);
    }
    
    // Add sorting
    switch (sort) {
      case 'oldest':
        query += ` ORDER BY a.created_at ASC`;
        break;
      case 'popular':
        query += ` ORDER BY a.view_count DESC`;
        break;
      case 'title':
        query += ` ORDER BY a.title ASC`;
        break;
      default: // newest
        query += ` ORDER BY a.created_at DESC`;
    }
    
    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    // Execute main query
    const result = await connectionPool.query(query, params);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM articles a 
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;
    
    if (status && status !== 'all') {
      countParamCount++;
      countQuery += ` AND a.status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (a.title ILIKE $${countParamCount} OR a.content ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }
    
    if (category_id) {
      countParamCount++;
      countQuery += ` AND a.category_id = $${countParamCount}`;
      countParams.push(category_id);
    }

    if (author_id) {
      countParamCount++;
      countQuery += ` AND a.author_id = $${countParamCount}`;
      countParams.push(author_id);
    }
    
    const countResult = await connectionPool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);
    
    res.json({
      articles: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit),
        currentPage: Math.floor(offset / limit) + 1
      }
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
};

// Get single article by ID or slug
export const getArticleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if id is numeric or slug
    const isNumeric = /^\d+$/.test(id);
    
    const query = `
      SELECT 
        a.*,
        c.name as category_name,
        c.slug as category_slug,
        u.full_name as author_name,
        u.username as author_username,
        u.email as author_email
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN users u ON a.author_id = u.id
      WHERE ${isNumeric ? 'a.id = $1' : 'a.slug = $1'}
    `;
    
    const result = await connectionPool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Get related articles
    const article = result.rows[0];
    const relatedQuery = `
      SELECT 
        id, title, slug, excerpt, featured_image_url, 
        featured_image_alt, published_at
      FROM articles 
      WHERE category_id = $1 
        AND id != $2 
        AND status = 'published'
      ORDER BY RANDOM() 
      LIMIT 3
    `;
    
    const relatedResult = await connectionPool.query(
      relatedQuery, 
      [article.category_id, article.id]
    );
    
    res.json({
      article: article,
      relatedArticles: relatedResult.rows
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
};

// Increment view count
export const incrementViewCount = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get IP address for basic duplicate prevention
    const ip = req.ip || req.connection.remoteAddress;
    const sessionKey = `article_view_${id}_${ip}`;
    
    // Simple in-memory check (better to use Redis in production)
    if (!global.viewedArticles) {
      global.viewedArticles = new Set();
    }
    
    if (global.viewedArticles.has(sessionKey)) {
      return res.json({ message: 'Already viewed' });
    }
    
    await connectionPool.query(
      'UPDATE articles SET view_count = view_count + 1 WHERE id = $1',
      [id]
    );
    
    // Mark as viewed
    global.viewedArticles.add(sessionKey);
    
    // Clear old entries every hour
    setTimeout(() => {
      global.viewedArticles.delete(sessionKey);
    }, 3600000); // 1 hour
    
    res.json({ message: 'View count updated' });
  } catch (error) {
    console.error('Update view count error:', error);
    res.status(500).json({ error: 'Failed to update view count' });
  }
};