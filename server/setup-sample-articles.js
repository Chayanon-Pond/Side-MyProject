import connectionPool from './utils/database.js';

async function createSampleArticles() {
  try {
    console.log('🚀 Creating sample articles...');

    // First, let's make sure we have categories and a user
    const categoryResult = await connectionPool.query('SELECT id FROM categories LIMIT 1');
    if (categoryResult.rows.length === 0) {
      console.log('❌ No categories found. Please run setup-categories.js first');
      process.exit(1);
    }

    const userResult = await connectionPool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (userResult.rows.length === 0) {
      console.log('❌ No admin user found. Please run setup-admin.js first');
      process.exit(1);
    }

    const categoryId = categoryResult.rows[0].id;
    const userId = userResult.rows[0].id;

    // Sample articles
    const sampleArticles = [
      {
        title: 'Getting Started with Modern Web Development',
        slug: 'getting-started-modern-web-development',
        excerpt: 'Learn the fundamentals of modern web development with React, Node.js, and PostgreSQL.',
        content: `<h2>Introduction</h2>
        <p>Modern web development has evolved significantly over the past few years. In this comprehensive guide, we'll explore the latest technologies and best practices.</p>
        
        <h3>Key Technologies</h3>
        <ul>
          <li>React.js for frontend development</li>
          <li>Node.js for backend services</li>
          <li>PostgreSQL for database management</li>
          <li>Express.js for API development</li>
        </ul>
        
        <h3>Getting Started</h3>
        <p>To begin your journey in modern web development, start by understanding the fundamentals of JavaScript and then move on to frameworks like React.</p>
        
        <p>Remember to always keep learning and stay updated with the latest trends in web development!</p>`,
        status: 'published',
        category_id: categoryId,
        author_id: userId,
        featured_image_alt: 'Modern web development setup',
        tags: ['web development', 'react', 'nodejs', 'programming']
      },
      {
        title: 'The Future of Artificial Intelligence',
        slug: 'future-artificial-intelligence',
        excerpt: 'Exploring how AI will transform industries and change the way we work and live.',
        content: `<h2>AI Revolution</h2>
        <p>Artificial Intelligence is not just a buzzword anymore. It's transforming industries and reshaping our future.</p>
        
        <h3>Current Applications</h3>
        <ul>
          <li>Machine Learning in healthcare</li>
          <li>Natural Language Processing</li>
          <li>Computer Vision applications</li>
          <li>Autonomous vehicles</li>
        </ul>
        
        <h3>Future Possibilities</h3>
        <p>The potential applications of AI are limitless. From solving climate change to advancing space exploration, AI will play a crucial role.</p>`,
        status: 'published',
        category_id: categoryId,
        author_id: userId,
        featured_image_alt: 'AI and technology concept',
        tags: ['ai', 'technology', 'future', 'innovation']
      },
      {
        title: 'Building Scalable Applications with Microservices',
        slug: 'building-scalable-applications-microservices',
        excerpt: 'Learn how to design and implement microservices architecture for better scalability.',
        content: `<h2>Microservices Architecture</h2>
        <p>Microservices architecture has become the go-to solution for building scalable and maintainable applications.</p>
        
        <h3>Benefits</h3>
        <ul>
          <li>Independent deployment</li>
          <li>Technology diversity</li>
          <li>Fault isolation</li>
          <li>Scalability</li>
        </ul>
        
        <h3>Best Practices</h3>
        <p>When implementing microservices, focus on proper service boundaries, API design, and monitoring.</p>`,
        status: 'published',
        category_id: categoryId,
        author_id: userId,
        featured_image_alt: 'Microservices architecture diagram',
        tags: ['microservices', 'architecture', 'scalability', 'backend']
      }
    ];

    for (const article of sampleArticles) {
      await connectionPool.query(`
        INSERT INTO articles (
          title, slug, excerpt, content, status, category_id, author_id, 
          featured_image_alt, tags, created_at, updated_at, published_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (slug) DO NOTHING
      `, [
        article.title,
        article.slug,
        article.excerpt,
        article.content,
        article.status,
        article.category_id,
        article.author_id,
        article.featured_image_alt,
        article.tags
      ]);
    }

    // Show created articles
    const result = await connectionPool.query(`
      SELECT a.id, a.title, a.status, c.name as category_name, u.username as author_name
      FROM articles a 
      LEFT JOIN categories c ON a.category_id = c.id 
      LEFT JOIN users u ON a.author_id = u.id
      ORDER BY a.created_at DESC
    `);
    
    console.log('✅ Sample articles created:');
    result.rows.forEach(article => {
      console.log(`   ${article.id}. "${article.title}" by ${article.author_name} (${article.status})`);
    });
    
    console.log('\n✅ Sample articles setup completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error setting up sample articles:', error);
    process.exit(1);
  }
}

// Run the setup
createSampleArticles();
