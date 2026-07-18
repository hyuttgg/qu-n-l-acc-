const http = require('http');
const jwt = require('jsonwebtoken');

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

// Helper to make GET request
const get = (path, headers = {}) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: JSON.parse(body)
          });
        } catch {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
          });
        }
      });
    });
    
    req.on('error', reject);
    req.end();
  });
};

const runTest = async () => {
  console.log('--- STARTING SECURE TOKEN LOADER VERIFICATION TEST ---');

  // 1. Register a test user
  const email = `pirate_secure_${Math.floor(Math.random() * 10000)}@grandline.com`;
  const username = `secure_pirate_${Math.floor(Math.random() * 10000)}`;
  const password = 'testpassword123';

  console.log(`\n[1/5] Registering test user: ${username} (${email})...`);
  const registerResult = await post('/api/auth/register', {}, { username, email, password });
  if (!registerResult.success) {
    console.error('Registration failed:', registerResult);
    process.exit(1);
  }
  const userToken = registerResult.token;
  console.log('User registered successfully.');

  // 2. Generate short-lived loader token
  console.log('\n[2/5] Requesting short-lived loader token from website context...');
  const tokenRes = await post('/api/auth/loader-token', {
    'Authorization': `Bearer ${userToken}`
  }, {});

  if (!tokenRes.success || !tokenRes.token) {
    console.error('Failed to generate loader token:', tokenRes);
    process.exit(1);
  }
  const loaderToken = tokenRes.token;
  console.log(`Loader token generated successfully! (Expires in 24 hours)`);

  // 3. Request loader script using the loader token
  console.log('\n[3/5] Requesting sender.lua script using the loader token...');
  const loadScriptRes = await get(`/api/lua/load?token=${loaderToken}`);
  console.log(`Response Status Code: ${loadScriptRes.statusCode}`);
  
  if (loadScriptRes.statusCode !== 200) {
    console.error('Failed to load script with token:', loadScriptRes.body);
    process.exit(1);
  }

  const scriptBody = loadScriptRes.body;
  console.log(`First 500 chars of script body:\n${scriptBody.substring(0, 500)}`);
  
  // Verify that ApiKey placeholder was replaced with a JWT session token instead of permanent API key
  const apiKeyLine = scriptBody.split('\n').find(l => l.includes('_G.OceanForgeApiKey ='));
  console.log(`Injected Key Line: ${apiKeyLine}`);

  if (!apiKeyLine) {
    console.error('Verification failed: _G.OceanForgeApiKey injection line not found in script.');
    process.exit(1);
  }

  const match = apiKeyLine.match(/_G\.OceanForgeApiKey = "([^"]+)"/);
  if (!match || !match[1]) {
    console.error('Verification failed: ApiKey string could not be extracted.');
    process.exit(1);
  }
  const sessionToken = match[1];
  console.log(`Extracted Session Token: ${sessionToken.substring(0, 30)}...`);

  if (!sessionToken.startsWith('ey')) {
    console.error('Verification failed: Extracted key does not look like a JWT session token!');
    process.exit(1);
  }
  console.log('Session token is a valid JWT!');

  // 4. Test expired bootstrap token behavior
  console.log('\n[4/5] Testing behavior with expired/invalid bootstrap token...');
  // We can create an expired token manually since we know the secret
  const expiredLoaderToken = jwt.sign(
    { userId: registerResult.user.id || registerResult.user._id, purpose: 'loader_token' },
    'super_secret_oceanforge_jwt_key_129847', // must match .env JWT_SECRET
    { expiresIn: '0s' }
  );

  const expiredRes = await get(`/api/lua/load?token=${expiredLoaderToken}`);
  console.log(`Expired Token Request Status Code: ${expiredRes.statusCode}`);
  console.log(`Expired Token Response Body: ${expiredRes.body.trim()}`);
  if (!expiredRes.body.includes('expired')) {
    console.error('Verification failed: Server should reject expired bootstrap token.');
    process.exit(1);
  }
  console.log('Server correctly rejected the expired bootstrap token!');

  // 5. Test update endpoint using the Roblox session token
  console.log('\n[5/5] Testing telemetry update endpoint using the session token...');
  const updatePayload = {
    username: 'RobloxTester',
    level: 1550,
    beli: 5000000,
    fragments: 25000,
    race: 'Fishman',
    sea: 2,
    status: 'grinding',
    location: 'Kingdom of Rose',
    playtime: 3600,
    fruit_equipped: 'Light-Light',
    fruit_mastery: 350,
    sword: 'Saber',
    gun: 'Refined Musket',
    fighting_style: 'Water Kung Fu',
    accessory_equipped: 'Black Spikey Coat',
    inventory: {
      fruits: ['Flame-Flame', 'Ice-Ice'],
      weapons: ['Saber', 'Cutlass'],
      guns: ['Refined Musket'],
      styles: ['Water Kung Fu', 'Combat'],
      materials: [
        { name: 'Fish Tail', quantity: 15 },
        { name: 'Magma Ore', quantity: 8 }
      ],
      accessories: ['Black Spikey Coat']
    }
  };

  const updateRes = await post('/api/lua/update', {
    'x-api-key': sessionToken
  }, updatePayload);

  console.log('Update Response:', updateRes);
  if (updateRes.success) {
    console.log('Telemetry update using session token succeeded!');
    console.log('\n--- ALL SECURE TOKEN LOADER TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } else {
    console.error('Telemetry update failed:', updateRes);
    process.exit(1);
  }
};

runTest().catch(err => {
  console.error('Test crashed:', err);
  process.exit(1);
});
