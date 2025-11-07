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
    console.log(`✅ GCS Repository initialized with bucket: ${bucketName}`);
  } catch (err) {
    console.error('❌ gcsRepository init error:', err.message);
    console.error('   Make sure GOOGLE_APPLICATION_CREDENTIALS is set or running on GCP with proper service account');
  }
} else {
  console.warn('⚠️  GCS_BUCKET environment variable not set. GCS repository will not be available.');
  console.warn('   Set GCS_BUCKET=pokemon-statistics-cache in Cloud Run environment variables');
}

async function load() {
  if (!bucket) {
    console.warn('⚠️  GCS load called but bucket not initialized (GCS_BUCKET not set)');
    return null;
  }
  try {
    const file = bucket.file(STORAGE_PATH);
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`📦 GCS: ${STORAGE_PATH} does not exist yet (first run)`);
      return null;
    }
    const [contents] = await file.download();
    const parsed = JSON.parse(contents.toString('utf8'));
    console.log(`✅ GCS: Loaded cache from gs://${bucketName}/${STORAGE_PATH} (${parsed.count} Pokemon)`);
    return parsed;
  } catch (err) {
    console.error('❌ gcsRepository.load error:', err.message);
    return null;
  }
}

async function save(payload) {
  if (!bucket) {
    console.error('❌ GCS save called but bucket not initialized (GCS_BUCKET not set)');
    return false;
  }
  try {
    const file = bucket.file(STORAGE_PATH);
    // Upload from buffer
    await file.save(JSON.stringify(payload), { 
      resumable: false, 
      metadata: { contentType: 'application/json' } 
    });
    console.log(`✅ GCS: Saved cache to gs://${bucketName}/${STORAGE_PATH} (${payload.count} Pokemon, ${(JSON.stringify(payload).length / 1024 / 1024).toFixed(2)} MB)`);
    return true;
  } catch (err) {
    console.error('❌ gcsRepository.save error:', err.message);
    if (err.code === 403) {
      console.error('   Permission denied. Ensure service account has storage.objectAdmin role on bucket');
    }
    return false;
  }
}

module.exports = {
  load,
  save
};

async function check() {
  if (!bucket) {
    return { 
      ok: false, 
      message: 'GCS_BUCKET not configured. Set environment variable GCS_BUCKET=pokemon-statistics-cache',
      bucketName: null
    };
  }
  
  const tmpName = `${CHECK_PATH_PREFIX}${Date.now()}.json`;
  const file = bucket.file(tmpName);
  const payload = { ts: Date.now(), ok: true };
  
  try {
    // Test write
    await file.save(JSON.stringify(payload), { 
      resumable: false, 
      metadata: { contentType: 'application/json' } 
    });
    
    // Test read
    const [contents] = await file.download();
    const parsed = JSON.parse(contents.toString('utf8'));
    
    // Test delete (cleanup)
    await file.delete().catch(() => {});
    
    return { 
      ok: true, 
      message: 'GCS bucket is accessible (write/read/delete succeeded)', 
      bucketName,
      parsed 
    };
  } catch (err) {
    let message = `GCS check failed: ${err.message}`;
    
    if (err.code === 403) {
      message += ' - Permission denied. Ensure service account has storage.objectAdmin role';
    } else if (err.code === 404) {
      message += ` - Bucket gs://${bucketName} not found`;
    }
    
    return { 
      ok: false, 
      message,
      bucketName,
      errorCode: err.code 
    };
  }
}

module.exports = { load, save, check };
