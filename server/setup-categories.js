import connectionPool from './utils/database.js';

async function createCategoriesTable() {
  try {
    console.log('🚀 Setting up categories table...');

    // Create categories table
    await connectionPool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        slug VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Categories table created/verified');

    // Insert sample categories
    const sampleCategories = [
      {
        name: 'Technology',
        description: 'Articles about technology and innovation',
        slug: 'technology'
      },
      {
        name: 'Lifestyle',
        description: 'Lifestyle and personal development articles',
        slug: 'lifestyle'
      },
      {
        name: 'Travel',
        description: 'Travel guides and experiences',
        slug: 'travel'
      },
      {
        name: 'Food',
        description: 'Food reviews and recipes',
        slug: 'food'
      },
      {
        name: 'Business',
        description: 'Business and entrepreneurship content',
        slug: 'business'
      }
    ];

    for (const category of sampleCategories) {
      await connectionPool.query(`
        INSERT INTO categories (name, description, slug)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `, [category.name, category.description, category.slug]);
    }

    // Show created categories
    const result = await connectionPool.query('SELECT * FROM categories ORDER BY id');
    console.log('✅ Sample categories created:');
    result.rows.forEach(cat => {
      console.log(`   ${cat.id}. ${cat.name} (${cat.slug})`);
    });
    
    console.log('\n✅ Categories setup completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error setting up categories:', error);
    process.exit(1);
  }
}

// Run the setup
createCategoriesTable();
