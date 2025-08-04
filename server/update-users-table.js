import fs from 'fs/promises';
import connectionPool from './utils/database.js';

const updateUsersTable = async () => {
  try {
    console.log('Updating users table...');
    
    // Read the SQL file
    const sqlContent = await fs.readFile('./update-users-table.sql', 'utf8');
    
    // Execute the SQL
    await connectionPool.query(sqlContent);
    
    // Create uploads/profiles directory if it doesn't exist
    try {
      await fs.mkdir('./uploads/profiles', { recursive: true });
      console.log('✅ Created uploads/profiles directory');
    } catch (dirError) {
      console.log('📁 uploads/profiles directory already exists or created');
    }
    
    console.log('✅ Users table updated successfully!');
    console.log('Added columns:');
    console.log('- bio (TEXT)');
    console.log('- profile_image_url (VARCHAR)');
    console.log('- updated_at (TIMESTAMP)');
    
  } catch (error) {
    console.error('❌ Error updating users table:', error);
  } finally {
    await connectionPool.end();
  }
};

updateUsersTable();
