// GCS-based repository: requires process.env.GCS_BUCKET and credentials via
// GOOGLE_APPLICATION_CREDENTIALS or service account environment on GCP.
const { Storage } = require('@google-cloud/storage');
const STORAGE_PATH = 'pokemon-data.json';

const CHECK_PATH_PREFIX = 'pokemon-data-check-';

const bucketName = process.env.GCS_BUCKET;
let storage = null;
let bucket = null;

if (bucketName) {
  try {
    storage = new Storage();
    bucket = storage.bucket(bucketName);
  } catch (err) {
    console.error('gcsRepository init error:', err.message);
  }
}

async function load() {
  if (!bucket) return null;
  try {
    const file = bucket.file(STORAGE_PATH);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [contents] = await file.download();
    return JSON.parse(contents.toString('utf8'));
  } catch (err) {
    console.error('gcsRepository.load error:', err.message);
    return null;
  }
}

async function save(payload) {
  if (!bucket) return false;
  try {
    const file = bucket.file(STORAGE_PATH);
    // Upload from buffer
    await file.save(JSON.stringify(payload), { resumable: false, metadata: { contentType: 'application/json' } });
    return true;
  } catch (err) {
    console.error('gcsRepository.save error:', err.message);
    return false;
  }
}

module.exports = {
  load,
  save
};

async function check() {
  if (!bucket) return { ok: false, message: 'No bucket configured' };
  const tmpName = `${CHECK_PATH_PREFIX}${Date.now()}.json`;
  const file = bucket.file(tmpName);
  const payload = { ts: Date.now(), ok: true };
  try {
    await file.save(JSON.stringify(payload), { resumable: false, metadata: { contentType: 'application/json' } });
    const [contents] = await file.download();
    const parsed = JSON.parse(contents.toString('utf8'));
    // cleanup
    await file.delete().catch(() => {});
    return { ok: true, message: 'write/read/delete succeeded', parsed };
  } catch (err) {
    return { ok: false, message: `gcs check failed: ${err.message}` };
  }
}

module.exports = { load, save, check };
