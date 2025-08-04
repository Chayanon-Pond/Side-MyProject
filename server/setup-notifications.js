import fs from 'fs/promises';
import connectionPool from './utils/database.js';

const setupNotifications = async () => {
  try {
    console.log('Setting up notifications table...');
    
    // Read the SQL file
    const sqlContent = await fs.readFile('./setup-notifications.sql', 'utf8');
    
    // Execute the SQL
    await connectionPool.query(sqlContent);
    
    console.log('✅ Notifications table created successfully!');
    console.log('Features:');
    console.log('- Notifications table with types: comment, like, article_published, mention, system');
    console.log('- Sample notifications inserted');
    console.log('- Indexes for performance');
    console.log('- Triggers for updated_at');
    
  } catch (error) {
    console.error('❌ Error setting up notifications:', error);
  } finally {
    await connectionPool.end();
  }
};

setupNotifications();
