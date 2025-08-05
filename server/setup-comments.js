import connectionPool from './utils/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupComments() {
  try {
    console.log('Setting up comments table...');
    
    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'setup-comments.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await connectionPool.query(sql);
    
    console.log('Comments table setup completed successfully!');
  } catch (error) {
    console.error('Error setting up comments table:', error);
  } finally {
    await connectionPool.end();
  }
}

setupComments();
