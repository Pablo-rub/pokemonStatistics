// Factory repository: selects Redis -> GCS -> File repository based on environment
const path = require('path');

let repo = null;
let repoName = 'file';

try {
  if (process.env.REDIS_URL) {
    // prefer redis if configured
    repo = require('./redisRepository');
    repoName = 'redis';
  } else if (process.env.GCS_BUCKET) {
    repo = require('./gcsRepository');
    repoName = 'gcs';
  }
} catch (err) {
  console.warn('cacheRepository: optional provider load failed:', err.message);
  repo = null;
}

if (!repo) {
  repo = require('./fileRepository');
  repoName = 'file';
}

module.exports = {
  load: (...args) => repo.load(...args),
  save: (...args) => repo.save(...args),
  repoName,
  // expose underlying for advanced ops
  _impl: repo,
  // optional check if implementation exposes it
  check: async (...args) => {
    if (typeof repo.check === 'function') return repo.check(...args);
    return { ok: false, message: 'check not implemented for repo ' + repoName };
  }
};
