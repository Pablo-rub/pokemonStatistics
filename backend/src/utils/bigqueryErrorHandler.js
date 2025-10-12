/**
 * BigQuery error handling utilities
 * Provides detailed error logging and parsing for debugging insertion failures
 */

/**
 * Parse and log detailed BigQuery insertion errors
 * @param {Error} error - BigQuery PartialFailureError
 * @param {Object} data - The data that failed to insert
 * @param {string} replayId - Replay ID for tracking
 */
function logBigQueryError(error, data, replayId) {
  console.error(`\n========== BigQuery Insertion Error: ${replayId} ==========`);

  if (error.name === 'PartialFailureError' && error.errors) {
    error.errors.forEach((err, idx) => {
      console.error(`\n--- Row ${idx} Errors ---`);
      
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach(fieldError => {
          console.error(`Field: ${fieldError.location || 'unknown'}`);
          console.error(`Reason: ${fieldError.reason || 'unknown'}`);
          console.error(`Message: ${fieldError.message || 'no message'}`);
        });
      }

      if (err.row) {
        console.error('\n--- Problematic Row Structure ---');
        console.error(JSON.stringify(err.row, null, 2));
      }
    });
  } else {
    console.error('Non-PartialFailure error:', error.message);
    console.error('Stack:', error.stack);
  }

  // Log the full data structure that failed
  console.error('\n--- Full Data Attempted ---');
  console.error(JSON.stringify(data, null, 2));
  console.error('========================================\n');
}

/**
 * Extract specific field errors from BigQuery response
 * @param {Error} error - BigQuery error
 * @returns {Array} Array of field-specific error messages
 */
function extractFieldErrors(error) {
  const fieldErrors = [];

  if (error.name === 'PartialFailureError' && error.errors) {
    error.errors.forEach(err => {
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach(fieldError => {
          fieldErrors.push({
            field: fieldError.location || 'unknown',
            reason: fieldError.reason || 'unknown',
            message: fieldError.message || 'no message'
          });
        });
      }
    });
  }

  return fieldErrors;
}

/**
 * Check if error is due to schema mismatch
 * @param {Error} error
 * @returns {boolean}
 */
function isSchemaError(error) {
  if (error.name !== 'PartialFailureError') return false;
  
  const fieldErrors = extractFieldErrors(error);
  return fieldErrors.some(err => 
    err.reason === 'invalid' || 
    err.reason === 'required' ||
    err.message.toLowerCase().includes('schema')
  );
}

/**
 * Generate user-friendly error summary
 * @param {Error} error
 * @returns {string}
 */
function getErrorSummary(error) {
  if (!error) return 'Unknown error';

  if (error.name === 'PartialFailureError') {
    const fieldErrors = extractFieldErrors(error);
    if (fieldErrors.length === 0) return 'BigQuery insertion failed (no specific field errors)';

    const summary = fieldErrors
      .map(e => `${e.field}: ${e.message}`)
      .join('; ');
    
    return `Schema validation errors: ${summary}`;
  }

  return error.message || error.toString();
}

module.exports = {
  logBigQueryError,
  extractFieldErrors,
  isSchemaError,
  getErrorSummary
};