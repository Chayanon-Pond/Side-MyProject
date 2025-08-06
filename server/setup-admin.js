import bcrypt from 'bcrypt';
import connectionPool from './utils/database.js';

async function createAdminUser() {
  try {
    console.log('🚀 Setting up admin user...');

    // Check if users table exists
    const tableExists = await connectionPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ Users table does not exist. Please run setup-tables.js first');
      throw new Error('Users table does not exist');
    }

    // Add role column if it doesn't exist
    await connectionPool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'
    `);
    console.log('✅ Role column added/verified');

    // Update existing users to have 'user' role
    await connectionPool.query(`
      UPDATE users SET role = 'user' WHERE role IS NULL
    `);
    console.log('✅ Updated existing users with default role');

    // Hash the admin password
    const adminPassword = 'ppond333';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Create or update admin user
    const result = await connectionPool.query(`
      INSERT INTO users (full_name, username, email, password_hash, role, created_at) 
      VALUES ($1, $2, $3, $4, $5, NOW()) 
      ON CONFLICT (email) 
      DO UPDATE SET 
        role = 'admin',
        full_name = 'Chayanon Admin',
        username = 'chayanon',
        password_hash = $4
      RETURNING id, full_name, username, email, role
    `, [
      'Chayanon Admin',
      'chayanon', 
      'chayanon.5723@gmail.com',
      hashedPassword,
      'admin'
    ]);

    const adminUser = result.rows[0];
    console.log('✅ Admin user created/updated:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Name: ${adminUser.full_name}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    
    console.log('\n🔐 Admin login credentials:');
    console.log(`   Email: chayanon.5723@gmail.com`);
    console.log(`   Password: ppond333`);
    
    console.log('\n✅ Admin setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up admin user:', error);
    throw error;
  }
}

// Export the function
export { createAdminUser as setupAdmin };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminUser().finally(() => process.exit(0));
}
