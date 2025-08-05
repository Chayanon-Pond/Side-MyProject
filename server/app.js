import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRouter from './apps/auth.js';
import articlesRouter from './routes/articles/articles-main.js';
import categoriesRouter from './routes/categories/categories-main.js';
import notificationsRouter from './routes/notifications/notifications-main.js';
import commentsRouter from './routes/comments/comments-main.js';
import profileRouter from './routes/profile/profile-main.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://side-my-project-two.vercel.app',
      'https://side-myproject-git-dev-ponds-projects-dd08bd05.vercel.app',
      'https://side-my-project-git-d0bd05.vercel.app',
      'https://side-myproject-production.up.railway.app',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    
    // Check if origin is in allowed list or is a Vercel deployment
    if (allowedOrigins.includes(origin) || 
        origin.includes('vercel.app') || 
        origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   POST http://localhost:${PORT}/api/auth/login`);
});