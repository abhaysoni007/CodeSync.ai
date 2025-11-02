// Simple test server to diagnose port 5000 issue
import express from 'express';

const app = express();
const PORT = 5000;

app.use(express.json());

app.get('/', (req, res) => {
  console.log('✅ GET / request received');
  res.json({ 
    message: 'Test server working!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log('✅ GET /health request received');
  res.json({ status: 'ok' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📡 Server bound to 0.0.0.0:${PORT}`);
  console.log(`🔍 Try: curl http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
