const logger = require('./logger');

/**
 * BigQuery error handling utilities
 * Provides detailed error logging and parsing for debugging insertion failures
 */

/**
 * Extract detailed error information from BigQuery PartialFailureError
 * @param {Error} error - The BigQuery error object
 * @param {string} replayId - The replay ID being processed
 * @returns {Object} Structured error information
 */
function extractBigQueryError(error, replayId) {
  const errorInfo = {
    replayId,
    errorType: error.name || 'UnknownError',
    message: error.message,
    details: []
  };

  // Extract detailed errors from BigQuery PartialFailureError
  if (error.errors && Array.isArray(error.errors)) {
    error.errors.forEach((errorRow, index) => {
      if (errorRow.errors && Array.isArray(errorRow.errors)) {
        errorRow.errors.forEach(err => {
          errorInfo.details.push({
            rowIndex: index,
            reason: err.reason,
            location: err.location,
            message: err.message,
            debugInfo: err.debugInfo || 'No debug info'
          });
        });
      }
      
      // Log the problematic row data
      if (errorRow.row) {
        const rowStr = JSON.stringify(errorRow.row);
        errorInfo.details.push({
          rowIndex: index,
          rowDataSample: rowStr.substring(0, 1000), // Increased to 1000 chars
          rowDataLength: rowStr.length
        });
      }
    });
  }

  // Include response details
  if (error.response) {
    errorInfo.response = {
      kind: error.response.kind,
      hasInsertErrors: !!error.response.insertErrors,
      errorCount: error.response.insertErrors?.length || 0
    };
    
    // Extract specific error details from insertErrors
    if (error.response.insertErrors && Array.isArray(error.response.insertErrors)) {
      error.response.insertErrors.forEach((insertError, idx) => {
        if (insertError.errors) {
          insertError.errors.forEach(err => {
            errorInfo.details.push({
              source: 'insertError',
              index: idx,
              reason: err.reason,
              location: err.location,
              message: err.message
            });
          });
        }
      });
    }
  }

  return errorInfo;
}

/**
 * Log BigQuery error with full details
 * @param {Error} error - The error object
 * @param {string} replayId - The replay ID
 * @param {string} additionalContext - Additional context about the operation
 */
function logBigQueryError(error, replayId, additionalContext = '') {
  const errorInfo = extractBigQueryError(error, replayId);
  
  // Log main error
  logger.error(`BigQuery insertion failed: ${replayId}`, {
    context: additionalContext,
    errorType: errorInfo.errorType,
    message: errorInfo.message,
    detailsCount: errorInfo.details.length
  });

  // Log each detail separately for better visibility
  if (errorInfo.details.length > 0) {
    errorInfo.details.forEach((detail, idx) => {
      logger.error(`BigQuery error detail ${idx + 1}/${errorInfo.details.length}`, {
        replayId,
        ...detail
      });
    });
  } else {
    logger.warn(`No detailed error information available for ${replayId}`);
  }

  // Log response info if available
  if (errorInfo.response) {
    logger.error('BigQuery response details', {
      replayId,
      ...errorInfo.response
    });
  }
}

/**
 * Validate data before BigQuery insertion
 * @param {Object} data - The data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateReplayData(data) {
  const errors = [];

  // Check required fields
  if (!data.replay_id) {
    errors.push({ field: 'replay_id', message: 'Missing replay_id' });
  }

  if (!data.player1 || !data.player2) {
    errors.push({ field: 'players', message: 'Missing player names' });
  }

  if (!data.format) {
    errors.push({ field: 'format', message: 'Missing format' });
  }

  if (!Array.isArray(data.turns) || data.turns.length === 0) {
    errors.push({ field: 'turns', message: 'Missing or empty turns array' });
  }

  // Validate turns structure
  if (Array.isArray(data.turns)) {
    data.turns.forEach((turn, idx) => {
      if (typeof turn.turn_number !== 'number') {
        errors.push({ 
          field: `turns[${idx}].turn_number`, 
          message: 'Invalid turn_number type' 
        });
      }
      
      // Check for required nested structures
      if (!turn.starts_with || !turn.ends_with) {
        errors.push({ 
          field: `turns[${idx}]`, 
          message: 'Missing starts_with or ends_with' 
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
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
  extractBigQueryError,
  logBigQueryError,
  validateReplayData,
  extractFieldErrors,
  isSchemaError,
  getErrorSummary
};