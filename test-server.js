const express = require('express');
const app = express();
const PORT = 3000;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Test server running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Test server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});