const http = require('http');

// Helper to make requests
const request = (method, path, headers, body) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseBody));
        } catch {
          resolve({ raw: responseBody, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', reject);
    if (data) {
      req.write(data);
    }
    req.end();
  });
};

const runTest = async () => {
  console.log('--- STARTING OCEANFORGE CREDENTIALS UPDATE TEST ---');
  
  // 1. Register a test user
  const email = `test_profile_${Math.floor(Math.random() * 10000)}@grandline.com`;
  const username = `profile_${Math.floor(Math.random() * 10000)}`;
  const password = 'testpassword123';
  
  console.log(`Registering test user: ${username} (${email})...`);
  const registerResult = await request('POST', '/api/auth/register', {}, { username, email, password });
  
  if (!registerResult.success) {
    console.error('Registration failed:', registerResult);
    return;
  }
  
  console.log('Registration success!');
  const token = registerResult.token;
  console.log(`Received JWT Token: ${token.substring(0, 15)}...`);
  
  // 2. Try to update email with incorrect password
  console.log('\n1. Testing update-email with incorrect password...');
  const badEmailRes = await request('PUT', '/api/auth/update-email', { 'Authorization': `Bearer ${token}` }, {
    newEmail: `updated_${email}`,
    password: 'wrongpassword'
  });
  console.log('Response (Expected Failure):', badEmailRes);
  if (badEmailRes.success) {
    console.error('Error: Email update succeeded with wrong password!');
  } else {
    console.log('Success: Correctly failed with message:', badEmailRes.message);
  }

  // 3. Try to update email with correct password
  console.log('\n2. Testing update-email with correct password...');
  const newEmailValue = `updated_${email}`;
  const goodEmailRes = await request('PUT', '/api/auth/update-email', { 'Authorization': `Bearer ${token}` }, {
    newEmail: newEmailValue,
    password: password
  });
  console.log('Response (Expected Success):', goodEmailRes);
  if (goodEmailRes.success && goodEmailRes.user.email === newEmailValue) {
    console.log('Success: Email updated successfully to:', goodEmailRes.user.email);
  } else {
    console.error('Error: Email update failed:', goodEmailRes);
  }

  // 4. Try to log in with the old email (should fail)
  console.log('\n3. Testing login with old email (should fail)...');
  const oldLoginRes = await request('POST', '/api/auth/login', {}, { email, password });
  console.log('Response (Expected Failure):', oldLoginRes);

  // 5. Try to log in with the new email (should succeed)
  console.log('\n4. Testing login with new email (should succeed)...');
  const newLoginRes = await request('POST', '/api/auth/login', {}, { email: newEmailValue, password });
  console.log('Response (Expected Success):', newLoginRes);
  if (!newLoginRes.success) {
    console.error('Error: Login with new email failed!');
    return;
  }
  const newToken = newLoginRes.token;

  // 6. Try to update password with incorrect current password
  console.log('\n5. Testing update-password with incorrect current password...');
  const badPassRes = await request('PUT', '/api/auth/update-password', { 'Authorization': `Bearer ${newToken}` }, {
    currentPassword: 'wrongpassword',
    newPassword: 'newpassword123'
  });
  console.log('Response (Expected Failure):', badPassRes);

  // 7. Try to update password with correct current password
  console.log('\n6. Testing update-password with correct current password...');
  const goodPassRes = await request('PUT', '/api/auth/update-password', { 'Authorization': `Bearer ${newToken}` }, {
    currentPassword: password,
    newPassword: 'newpassword123'
  });
  console.log('Response (Expected Success):', goodPassRes);

  // 8. Try to login with new password
  console.log('\n7. Testing login with new password (should succeed)...');
  const finalLoginRes = await request('POST', '/api/auth/login', {}, { email: newEmailValue, password: 'newpassword123' });
  console.log('Response (Expected Success):', finalLoginRes);
  if (finalLoginRes.success) {
    console.log('\n--- CREDENTIALS TEST COMPLETED SUCCESSFULLY! All flows passed. ---');
  } else {
    console.error('\n--- CREDENTIALS TEST FAILED! Login with new password failed. ---');
  }
};

runTest().catch(console.error);
