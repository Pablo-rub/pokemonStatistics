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

// Run a non-blocking health check at startup to help diagnostics (logs repo and check result)
(async () => {
  try {
    const r = module.exports;
    // Give implementation a chance to initialize (non-blocking)
    const checkResult = await r.check().catch(err => ({ ok: false, message: err && err.message ? err.message : String(err) }));
    console.log(`cacheRepository: selected repo=${r.repoName}; check=${JSON.stringify(checkResult)}`);
    if (r.repoName === 'gcs' && (!checkResult || !checkResult.ok)) {
      console.warn('cacheRepository: GCS selected but check failed. Ensure GCS_BUCKET is set in Cloud Run and the service account has storage object permissions. You can call GET /api/pokemon-cache/check for details.');
    }
    if (r.repoName === 'file') {
      console.warn('cacheRepository: using local file repository. On Cloud Run this is ephemeral — set GCS_BUCKET or REDIS_URL to enable durable cache.');
    }
  } catch (err) {
    console.warn('cacheRepository: startup check error:', err && err.message ? err.message : String(err));
  }
})();
