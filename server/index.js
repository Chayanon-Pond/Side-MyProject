const express = require('express');
const app = express();
const PORT = 5000;

// Basic middleware
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running!',
    status: 'OK',
    port: PORT
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});