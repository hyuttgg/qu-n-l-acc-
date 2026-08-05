const axios = require('axios');

const appId = '1527320103476269076';
const base64AppId = Buffer.from(appId).toString('base64').replace(/=/g, '');
const secretPart = 'aUntdurcsEqbyhWSEInrSQh18KzFOxmR';

const candidateTokens = [
  secretPart,
  `${base64AppId}.${secretPart}`,
  `${base64AppId}.G00000.${secretPart}`,
  `Bot ${secretPart}`,
  `Bearer ${secretPart}`
];

async function testTokens() {
  console.log(`Base64 App ID: ${base64AppId}`);
  for (const t of candidateTokens) {
    try {
      console.log(`Testing token candidate: ${t.substring(0, 30)}...`);
      const res = await axios.get('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: t.startsWith('Bot ') || t.startsWith('Bearer ') ? t : `Bot ${t}` }
      });
      console.log(`✅ SUCCESS! Authenticated Bot User: ${res.data.username}#${res.data.discriminator} (ID: ${res.data.id})`);
      return t;
    } catch (err) {
      console.log(`❌ Failed (${err.response?.status}): ${err.response?.data?.message || err.message}`);
    }
  }
}

testTokens();
