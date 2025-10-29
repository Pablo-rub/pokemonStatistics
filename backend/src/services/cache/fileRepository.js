const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', '..', 'cache', 'pokemon-data.json');

async function load() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error('fileRepository.load error:', err.message);
    return null;
  }
}

async function save(payload) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Atomic write: write to temp then rename
    const tmp = CACHE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(payload));
    fs.renameSync(tmp, CACHE_FILE);
    return true;
  } catch (err) {
    console.error('fileRepository.save error:', err.message);
    return false;
  }
}

module.exports = {
  load,
  save
};
