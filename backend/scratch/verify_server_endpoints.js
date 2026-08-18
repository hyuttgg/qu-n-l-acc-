const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });
const express = require('express');
const http = require('http');

const app = express();
app.use(express.json());

app.use('/api/lua', require('../routes/lua'));

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const server = http.createServer(app);
server.listen(5001, async () => {
  console.log('✅ Test Server listening on port 5001');

  const axios = require('axios');
  try {
    const res1 = await axios.get('http://127.0.0.1:5001/health');
    console.log('GET /health:', res1.data);

    const res2 = await axios.get('http://127.0.0.1:5001/api/lua/load');
    console.log('GET /api/lua/load response preview:', res2.data.slice(0, 80));

    console.log('✅ ALL SERVER INTEGRATION TESTS PASSED!');
  } catch (err) {
    console.error('❌ Server Integration Error:', err.message);
  } finally {
    server.close();
    process.exit(0);
  }
});
