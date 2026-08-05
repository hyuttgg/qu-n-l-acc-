const axios = require('axios');

const appId = '1527320103476269076';
const base64AppId = Buffer.from(appId).toString('base64').replace(/=/g, '');
const secretPart = 'yJ8PvTCTuzMYjmcBN4DhF3XqfU0h1q0w';

const candidates = [
  secretPart,
  `${base64AppId}.${secretPart}`,
  `Bot ${secretPart}`,
  `Bearer ${secretPart}`,
  process.env.DISCORD_BOT_TOKEN || '',
];

async function run() {
  for (const c of candidates) {
    const tokenHeader = c.startsWith('Bot ') || c.startsWith('Bearer ') ? c : `Bot ${c}`;
    try {
      console.log(`Testing token: ${c.substring(0, 35)}...`);
      const res = await axios.get('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: tokenHeader }
      });
      console.log(`✅ MATCH SUCCESSFUL! Bot Name: ${res.data.username} (ID: ${res.data.id})`);
      process.env.VALID_TOKEN = c;
      return c;
    } catch (err) {
      console.log(`❌ Failed (${err.response?.status}): ${err.response?.data?.message || err.message}`);
    }
  }
}

run();
