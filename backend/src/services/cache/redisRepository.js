// Redis repository using ioredis. Expects process.env.REDIS_URL (redis://...)
const IORedis = require('ioredis');
const KEY = process.env.REDIS_KEY || 'pokemon:cache:data';

let client = null;
if (process.env.REDIS_URL) {
  try {
    client = new IORedis(process.env.REDIS_URL);
  } catch (err) {
    console.error('redisRepository init error:', err.message);
    client = null;
  }
}

async function load() {
  if (!client) return null;
  try {
    const raw = await client.get(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('redisRepository.load error:', err.message);
    return null;
  }
}

async function save(payload) {
  if (!client) return false;
  try {
    await client.set(KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('redisRepository.save error:', err.message);
    return false;
  }
}

module.exports = { load, save };
