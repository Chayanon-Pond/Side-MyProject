import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple articles endpoint
app.get('/api/articles', (req, res) => {
  res.json({
    articles: [
      {
        id: 1,
        title: "Test Article",
        excerpt: "This is a test article",
        featured_image_url: "/img/test.jpg",
        author_name: "Test Author",
        category_name: "Test Category",
        published_at: new Date().toISOString()
      }
    ],
    pagination: {
      total: 1,
      limit: 10,
      offset: 0,
      pages: 1,
      currentPage: 1
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📰 Articles: http://localhost:${PORT}/api/articles`);
});
