const http = require('http');

// Helper to make POST request
const post = (path, headers, body) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ raw: body });
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

const runTest = async () => {
  console.log('--- STARTING OCEANFORGE END-TO-END INGESTION TEST ---');
  
  // 1. Try to register a test user
  const email = `test_pirate_${Math.floor(Math.random() * 10000)}@grandline.com`;
  const username = `pirate_${Math.floor(Math.random() * 10000)}`;
  const password = 'testpassword123';
  
  console.log(`Registering test user: ${username} (${email})...`);
  const registerResult = await post('/api/auth/register', {}, { username, email, password });
  
  if (!registerResult.success) {
    console.error('Registration failed:', registerResult);
    return;
  }
  
  console.log('Registration success!');
  const apiKey = registerResult.user.apiKey;
  console.log(`Generated API Key: ${apiKey}`);
  
  // 2. Mimic Roblox Lua script updating a character named "StrawHatLuffy"
  console.log('\nSending mock Roblox update for character "StrawHatLuffy"...');
  const payload = {
    username: 'StrawHatLuffy',
    level: 1850,
    beli: 8200000,
    fragments: 4200,
    race: 'Mink',
    sea: 2,
    fruit_equipped: 'Dough',
    fruit_mastery: 420,
    sword: 'Yama',
    gun: 'Acidum Rifle',
    fighting_style: 'Superhuman',
    accessory_equipped: 'Dark Coat',
    status: 'grinding',
    location: 'Green Zone',
    playtime: 4800,
    inventory: {
      fruits: ['Dragon', 'Spirit', 'Dough'],
      swords: ['Yama', 'Tushita', 'Katana'],
      guns: ['Acidum Rifle'],
      styles: ['Superhuman', 'Dark Step'],
      accessories: ['Pale Scarf'],
      materials: [
        { name: 'Conjured Cocoa', quantity: 3 },
        { name: 'Dragon Scale', quantity: 8 }
      ]
    }
  };
  
  const updateResult = await post('/api/lua/update', { 'x-api-key': apiKey }, payload);
  console.log('Update response from server:', updateResult);
  
  if (updateResult.success) {
    console.log('\n--- TEST COMPLETED SUCCESSFULLY! ---');
  } else {
    console.error('\n--- TEST FAILED! ---');
  }
};

runTest().catch(console.error);
