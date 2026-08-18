const { generateUserCode, generateNickname, PREFIXES, SUFFIXES } = require('./utils/identityGenerator');
const { handleBotCommand, COMMANDS } = require('./bot/index');

async function testIdentityAndBot() {
  console.log('=== 1. Testing Identity Generators ===');
  for (let i = 1; i <= 5; i++) {
    const userCode = await generateUserCode();
    const nickname = await generateNickname();
    console.log(`Sample ${i}: UserCode=${userCode} | Nickname=${nickname}`);

    // Verify UserCode format (USR-XXXX-XXXX)
    if (!/^USR-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(userCode)) {
      console.error(`❌ UserCode test failed for ${userCode}`);
      process.exit(1);
    }
  }
  console.log('✅ Identity Generators PASSED!\n');

  console.log('=== 2. Testing Discord Bot Command Definitions ===');
  console.log(`Registered Commands Count: ${COMMANDS.length}`);
  COMMANDS.forEach(cmd => {
    console.log(`- /${cmd.name}: ${cmd.description}`);
  });
  if (COMMANDS.length >= 13) {
    console.log('✅ Bot Slash Command definitions PASSED!\n');
  } else {
    console.error('❌ Bot Slash Commands count mismatch');
    process.exit(1);
  }

  console.log('🎉 ALL USER IDENTITY & DISCORD BOT TESTS COMPLETED SUCCESSFULLY!');
}

testIdentityAndBot();
