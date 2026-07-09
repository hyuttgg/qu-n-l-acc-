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

// Helper to make GET request
const get = (path) => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
};

const runTest = async () => {
  console.log('--- STARTING DYNAMIC LOADER API VERIFICATION TEST ---');
  
  // 1. Try to register a test user to get an API Key
  const email = `test_pirate_${Math.floor(Math.random() * 10000)}@grandline.com`;
  const username = `pirate_${Math.floor(Math.random() * 10000)}`;
  const password = 'testpassword123';
  
  console.log(`Registering test user: ${username} (${email})...`);
  const registerResult = await post('/api/auth/register', {}, { username, email, password });
  
  if (!registerResult.success) {
    console.error('Registration failed:', registerResult);
    process.exit(1);
  }
  
  console.log('Registration success!');
  const apiKey = registerResult.user.apiKey;
  console.log(`Generated API Key: ${apiKey}`);
  
  // 2. Request loader script without API Key parameter
  console.log('\nRequesting loader script WITHOUT an API key...');
  const failRes = await get('/api/lua/load');
  console.log(`Response Status: ${failRes.statusCode}`);
  console.log(`Response Body:\n${failRes.body}`);
  if (!failRes.body.includes('API Key is required')) {
    console.error('Test failed: Should have errored with missing API key message.');
    process.exit(1);
  }

  // 3. Request loader script with an invalid API Key parameter
  console.log('\nRequesting loader script WITH an INVALID API key...');
  const invalidRes = await get('/api/lua/load?key=forge_invalid123456');
  console.log(`Response Status: ${invalidRes.statusCode}`);
  console.log(`Response Body:\n${invalidRes.body}`);
  if (!invalidRes.body.includes('Invalid API Key')) {
    console.error('Test failed: Should have errored with invalid API key message.');
    process.exit(1);
  }

  // 4. Request loader script with the valid API Key parameter
  console.log('\nRequesting loader script WITH a VALID API key...');
  const successRes = await get(`/api/lua/load?key=${apiKey}`);
  console.log(`Response Status: ${successRes.statusCode}`);
  console.log(`Response Content-Type: ${successRes.headers['content-type']}`);
  
  // Verify that placeholders were replaced
  const hasKeyInjected = successRes.body.includes(`_G.ApiKey = "${apiKey}"`);
  const hasUrlInjected = successRes.body.includes('_G.ServerUrl = "http://localhost:5000"');
  
  if (hasKeyInjected && hasUrlInjected) {
    console.log('\nVerification details:');
    console.log(`- API Key Injected correctly: ${hasKeyInjected}`);
    console.log(`- Server URL Injected correctly: ${hasUrlInjected}`);
    console.log('\n--- LOADER API VERIFICATION SUCCESSFUL ---');
    process.exit(0);
  } else {
    console.error('\nVerification failed! Script content did not have key or URL injected correctly.');
    console.log('Snippet of response body (first 15 lines):');
    console.log(successRes.body.split('\n').slice(0, 15).join('\n'));
    process.exit(1);
  }
};

runTest().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
