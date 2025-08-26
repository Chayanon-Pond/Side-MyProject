import http from 'http';

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/api/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'OK', port: 3001 }));
  } else if (req.url.startsWith('/api/articles')) {
    res.writeHead(200);
    res.end(JSON.stringify({
      articles: [
        {
          id: 1,
          title: "McLaren 720S Review",
          excerpt: "Experience the ultimate supercar",
          featured_image_url: "/img/mc_homepage.jpg",
          author_name: "Auto Expert",
          category_name: "McLaren",
          published_at: new Date().toISOString()
        },
        {
          id: 2,
          title: "Lamborghini Urus Performance", 
          excerpt: "The fastest SUV in the world",
          featured_image_url: "/img/urus.jpg",
          author_name: "Speed Reviewer",
          category_name: "Lamborghini",
          published_at: new Date().toISOString()
        }
      ],
      pagination: {
        total: 2,
        limit: 10,
        offset: 0,
        pages: 1,
        currentPage: 1
      }
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Minimal Server running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`📰 Articles: http://localhost:${PORT}/api/articles`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
