import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './apps/auth.js';
import articlesRouter from './routes/articles/articles-main.js';
import categoriesRouter from './routes/categories/categories-main.js';
import notificationsRouter from './routes/notifications/notifications-main.js';
import commentsRouter from './routes/comments/comments-main.js';
import profileRouter from './routes/profile/profile-main.js';

dotenv.config();

// Database initialization function
async function initializeDatabase() {
  try {
    console.log('🔄 Checking database status...');
    const { pool } = await import('./utils/database.js');
    
    // Check if articles table exists and has data
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'articles'
      );
    `);
    
    const dataCheck = await pool.query('SELECT COUNT(*) as count FROM articles');
    const articleCount = parseInt(dataCheck.rows[0].count);
    
    if (!tableCheck.rows[0].exists || articleCount === 0) {
      console.log('🔄 Database setup needed. Running database initialization...');
      
      // Import and run setup functions in sequence
      const { setupTables } = await import('./setup-tables.js');
      await setupTables();
      console.log('✅ Tables setup completed');
      
      // Wait a bit to ensure tables are fully created
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { setupCategories } = await import('./setup-categories.js');
      await setupCategories();
      console.log('✅ Categories setup completed');
      
      const { setupAdmin } = await import('./setup-admin.js');
      await setupAdmin();
      console.log('✅ Admin setup completed');
      
      const { setupSampleArticles } = await import('./setup-sample-articles.js');
      await setupSampleArticles();
      console.log('✅ Sample articles setup completed');
      
      console.log('✅ Full database setup completed!');
    } else {
      // Add missing columns if they don't exist
      try {
        await pool.query('ALTER TABLE articles ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0');
        console.log('✅ Added view_count column if missing');
        
        // Create comments table if not exists
        await pool.query(`
          CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            article_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            parent_id INTEGER NULL,
            content TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_comments_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
            CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
          )
        `);
        console.log('✅ Added comments table if missing');
        
        // Create notifications table if not exists
        await pool.query(`
          CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            data JSONB DEFAULT '{}',
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        console.log('✅ Added notifications table if missing');
        // Ensure notifications table has required columns even if it already existed
        try {
          await pool.query(`
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          `);
          await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
          await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`);
          await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)`);

          // Drop legacy CHECK constraints on notifications.type that restrict allowed values
          // Some earlier migrations may have created a constraint that blocks values like 'system'
          const constraints = await pool.query(`
            SELECT conname
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace nsp ON nsp.oid = t.relnamespace
            WHERE t.relname = 'notifications' AND c.contype = 'c' AND pg_get_constraintdef(c.oid) ILIKE '%type%'
          `);
          for (const row of constraints.rows) {
            const name = row.conname;
            try {
              await pool.query(`ALTER TABLE notifications DROP CONSTRAINT IF EXISTS ${name}`);
              console.log(`🧹 Dropped legacy constraint: ${name}`);
            } catch (dropErr) {
              console.log(`⚠️  Could not drop constraint ${name}:`, dropErr.message);
            }
          }
        } catch (e) {
          console.log('⚠️  Notifications table migration check skipped:', e.message);
        }
      } catch (error) {
        console.log('⚠️  Could not add missing tables/columns:', error.message);
      }
      
      console.log(`✅ Database tables exist with ${articleCount} articles`);
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    console.log('⚠️  Server will continue running, but some features may not work properly');
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Helper: determine whether to serve client production build locally
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const shouldServeClientBuild = (process.env.NODE_ENV === 'production') || (String(process.env.SERVE_CLIENT_BUILD || '').toLowerCase() === 'true');


// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
// CORS: reflect request origin to allow Vercel previews and local dev
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Handle preflight across all routes
app.options('*', cors({ origin: true, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Serve client build in production or when explicitly requested
const shouldServeClient = process.env.NODE_ENV === 'production' || process.env.SERVE_CLIENT_BUILD === 'true';
if (shouldServeClient) {
  const path = await import('path');
  const clientDist = path.resolve(process.cwd(), '..', 'client', 'dist');
  console.log(`📦 Serving client build from: ${clientDist}`);

  // Serve static assets
  app.use(express.static(clientDist));

  // SPA fallback for non-API routes
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Side MyProject API Server', 
    status: 'Running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      articles: '/api/articles',
      categories: '/api/categories',
      notifications: '/api/notifications',
      comments: '/api/comments',
      profile: '/api/profile',
      health: '/api/health'
    }
  });
});

app.use('/api/auth', authRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/profile', profileRouter);

// Serve client production build when requested (serves files from client/dist)
if (shouldServeClientBuild) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  console.log(`📦 Serving client build from: ${clientDist}`);
  app.use(express.static(clientDist));

  // For SPA routes not starting with /api, return index.html
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const { pool, getDbTarget } = await import('./utils/database.js');
    const testQuery = await pool.query('SELECT 1 as test');
    
    res.json({ 
      status: 'OK', 
      message: 'Server is running',
      database: testQuery.rows[0] ? 'Connected' : 'Disconnected',
      dbTarget: getDbTarget?.(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message,
      dbTarget: (await import('./utils/database.js')).getDbTarget?.(),
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check articles data
app.get('/api/debug/articles', async (req, res) => {
  try {
    const { pool, getDbTarget } = await import('./utils/database.js');
    const result = await pool.query('SELECT COUNT(*) as total FROM articles');
    const sampleData = await pool.query('SELECT id, title, status FROM articles LIMIT 3');
    
    res.json({
      total_articles: result.rows[0]?.total || 0,
      sample_data: sampleData.rows,
      dbTarget: getDbTarget?.(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Debug failed',
      message: error.message,
      dbTarget: (await import('./utils/database.js')).getDbTarget?.(),
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize database and start server
async function startServer() {
  try {
    // Start server first
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth endpoints:`);
      console.log(`   POST http://localhost:${PORT}/api/auth/register`);
      console.log(`   POST http://localhost:${PORT}/api/auth/login`);
    });

    // Then initialize database
    await initializeDatabase();
    console.log('✅ Database initialization completed');
    
    return server;
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();