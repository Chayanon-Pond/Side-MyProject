import fs from 'fs/promises';
import connectionPool from './utils/database.js';

const setupTables = async () => {
  try {
    console.log('Setting up database tables...');
    
    // Read the SQL file
    const sqlContent = await fs.readFile('./setup-tables.sql', 'utf8');
    
    // Execute the SQL
    await connectionPool.query(sqlContent);
    
    console.log('✅ Database tables created successfully!');
    console.log('Tables created:');
    console.log('- users');
    console.log('- categories');
    console.log('- articles');
    console.log('- tags');
    console.log('- article_tags');
    console.log('- comments');
    console.log('- notifications');
    console.log('- notifications');
    
  } catch (error) {
    console.error('❌ Error setting up tables:', error);
    throw error;
  }
};

// Export the function
export { setupTables };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupTables().finally(() => connectionPool.end());
}
