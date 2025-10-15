/**
 * Utility for structured logging with different log levels
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Safely stringify objects, handling circular references
 */
function safeStringify(obj, maxDepth = 10) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, 2);
}

function formatMessage(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const base = {
    timestamp,
    level,
    message,
    severity: level // Cloud Logging uses 'severity' field
  };
  
  // Merge metadata if present
  const metaKeys = Object.keys(metadata);
  if (metaKeys.length > 0) {
    // Truncate very large metadata fields
    const processedMetadata = {};
    for (const key of metaKeys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.length > 10000) {
        processedMetadata[key] = value.substring(0, 10000) + '... [truncated]';
      } else if (typeof value === 'object' && value !== null) {
        try {
          const str = safeStringify(value);
          if (str.length > 10000) {
            processedMetadata[key] = str.substring(0, 10000) + '... [truncated]';
          } else {
            processedMetadata[key] = value;
          }
        } catch (err) {
          processedMetadata[key] = '[Unable to stringify]';
        }
      } else {
        processedMetadata[key] = value;
      }
    }
    return { ...base, ...processedMetadata };
  }
  
  return base;
}

function error(message, metadata = {}) {
  if (currentLevel >= LOG_LEVELS.ERROR) {
    const formatted = formatMessage('ERROR', message, metadata);
    console.error(safeStringify(formatted));
  }
}

function warn(message, metadata = {}) {
  if (currentLevel >= LOG_LEVELS.WARN) {
    const formatted = formatMessage('WARN', message, metadata);
    console.warn(safeStringify(formatted));
  }
}

function info(message, metadata = {}) {
  if (currentLevel >= LOG_LEVELS.INFO) {
    const formatted = formatMessage('INFO', message, metadata);
    console.info(safeStringify(formatted));
  }
}

function debug(message, metadata = {}) {
  if (currentLevel >= LOG_LEVELS.DEBUG) {
    const formatted = formatMessage('DEBUG', message, metadata);
    console.log(safeStringify(formatted));
  }
}

module.exports = {
  error,
  warn,
  info,
  debug
};