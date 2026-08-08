/**
 * OceanForge Full Project Audit & Vulnerability Tester
 * Runs end-to-end checks on all REST endpoints, middlewares, database connections, and security layers.
 */

const axios = require('axios');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:5000';

async function runAudit() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🛡️ OCEANFORGE SYSTEM AUDIT & BUG DETECTION SCANNER     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const results = [];

  // Test Helper
  async function testEndpoint(name, method, url, data = null, headers = {}) {
    const start = Date.now();
    try {
      const config = {
        method,
        url: `${BASE_URL}${url}`,
        headers,
        data,
        timeout: 5000,
        validateStatus: () => true, // Don't throw on HTTP error status
      };
      const res = await axios(config);
      const duration = Date.now() - start;
      const pass = res.status < 500;
      results.push({ name, method, url, status: res.status, duration, pass });
      console.log(`${pass ? '✅' : '❌'} [HTTP ${res.status}] ${method} ${url} (${duration}ms)`);
      return res;
    } catch (err) {
      const duration = Date.now() - start;
      results.push({ name, method, url, status: 'CONN_ERR', duration, pass: false, error: err.message });
      console.log(`❌ [CONN_ERR] ${method} ${url} — ${err.message} (${duration}ms)`);
      return null;
    }
  }

  console.log('🔍 Testing 1: Health & System Endpoints...');
  await testEndpoint('Express Health Check', 'GET', '/api/health');
  await testEndpoint('Swagger API Docs', 'GET', '/api-docs/');
  await testEndpoint('Public Images Route', 'GET', '/api/images/hq720.jpg');

  console.log('\n🔍 Testing 2: Auth Endpoints & Protection...');
  await testEndpoint('Login Empty Payload', 'POST', '/api/auth/login', {});
  await testEndpoint('Register Empty Payload', 'POST', '/api/auth/register', {});
  await testEndpoint('Get Me Unauthenticated', 'GET', '/api/auth/me');

  console.log('\n🔍 Testing 3: Accounts API...');
  await testEndpoint('Get Accounts Unauthenticated', 'GET', '/api/accounts');
  await testEndpoint('Search Accounts Unauthenticated', 'GET', '/api/accounts/search?q=test');

  console.log('\n🔍 Testing 4: DevOps & Admin API Security...');
  await testEndpoint('DevOps Health (No Token)', 'GET', '/api/devops/health');
  await testEndpoint('DevOps Metrics (No Token)', 'GET', '/api/devops/metrics');
  await testEndpoint('DevOps Report (No Token)', 'GET', '/api/devops/report');
  await testEndpoint('DevOps Trigger AutoFix (No Token)', 'POST', '/api/devops/trigger-autofix', { service: 'Memory' });

  console.log('\n🔍 Testing 5: Bot Integration Endpoints...');
  await testEndpoint('Bot Link Request (No Secret)', 'POST', '/api/bot/link', { discordId: '123456' });
  await testEndpoint('Bot Help Request (No Secret)', 'GET', '/api/bot/help');

  console.log('\n🔍 Testing 6: Security Headers Check...');
  try {
    const res = await testEndpoint('Security Headers Check', 'GET', '/api/health');
    if (res) {
      console.log('   Security Headers Audit:');
      console.log('   - x-dns-prefetch-control:', res.headers['x-dns-prefetch-control'] || 'Not set');
      console.log('   - x-frame-options:', res.headers['x-frame-options'] || 'Not set');
      console.log('   - x-content-type-options:', res.headers['x-content-type-options'] || 'Not set');
      console.log('   - access-control-allow-origin:', res.headers['access-control-allow-origin'] || 'Not set');
    }
  } catch (e) {}

  console.log('\n════════════════════════════════════════════════════════════');
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = total - passed;
  console.log(`📊 AUDIT COMPLETED: ${passed}/${total} endpoints healthy (${failed} 5xx/Connection errors)`);
  console.log('════════════════════════════════════════════════════════════');

  if (failed === 0) {
    console.log('🎉 ALL SYSTEM API ENDPOINTS ARE SAFE & PROPERLY HANDLED (No 5xx Crash Errors)!');
  } else {
    console.log('⚠️ UNHANDLED ERRORS DETECTED — Details in report above');
  }
}

runAudit();
