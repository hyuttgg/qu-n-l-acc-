const axios = require('axios');

const appId = '1527320103476269076';
const p1 = Buffer.from(appId).toString('base64').replace(/=/g, '');
const p2 = 'c9LYE8fgA-WOZPl-MibloXVhI-eLz-eT';
const secrets = [
  'aUntdurcsEqbyhWSEInrSQh18KzFOxmR',
  'yJ8PvTCTuzMYjmcBN4DhF3XqfU0h1q0w',
  '0572951958a27eaaa64180fda995692882a845fe1b187cf8135d96e51265a685'
];

const candidates = [
  p2,
  `${p1}.${p2}`,
];

for (const s of secrets) {
  candidates.push(`${p1}.${p2}.${s}`);
  candidates.push(`${p1}.${s}.${p2}`);
  candidates.push(`${p2}.${s}`);
}

async function testAll() {
  for (const c of candidates) {
    const tokenHeader = c.startsWith('Bot ') ? c : `Bot ${c}`;
    try {
      console.log(`Testing token: ${c.substring(0, 45)}...`);
      const res = await axios.get('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: tokenHeader }
      });
      console.log(`\n🎉 MATCH SUCCESSFUL!`);
      console.log(`Bot Name: ${res.data.username}#${res.data.discriminator} (ID: ${res.data.id})`);
      console.log(`FULL VALID TOKEN: ${c}\n`);
      return c;
    } catch (err) {
      console.log(`❌ Failed (${err.response?.status}): ${err.response?.data?.message || err.message}`);
    }
  }
}

testAll();
