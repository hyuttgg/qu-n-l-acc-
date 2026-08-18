const Redis = require('ioredis');

let redisClient = null;
let isRedisReady = false;

const redisUri = process.env.REDIS_URI || process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;

if (redisUri || redisHost) {
  try {
    const config = redisUri || {
      host: redisHost || '127.0.0.1',
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) {
          console.warn('⚠️ Redis reconnection limit reached. Operating in In-Memory fallback mode.');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    };

    redisClient = new Redis(config);

    redisClient.on('connect', () => {
      isRedisReady = true;
      console.log('🔴 Redis Client Connected Successfully!');
    });

    redisClient.on('error', (err) => {
      isRedisReady = false;
      console.warn(`⚠️ Redis Client Warning: ${err.message}. Fallback to In-Memory Cache.`);
    });

    redisClient.on('end', () => {
      isRedisReady = false;
    });
  } catch (err) {
    console.warn(`⚠️ Redis Initialization Warning: ${err.message}. Using In-Memory Cache.`);
    redisClient = null;
    isRedisReady = false;
  }
} else {
  console.log('ℹ️  No REDIS_URI configured in environment. Operating in High-Speed In-Memory Cache mode.');
}

module.exports = {
  getRedisClient: () => redisClient,
  isReady: () => isRedisReady && redisClient && redisClient.status === 'ready',
};
