/**
 * Schema definition and validation for replay data to BigQuery
 * Ensures data structure matches BigQuery table schema exactly
 */

/**
 * BigQuery table schema for replays
 * Define this based on your actual table structure
 */
const BIGQUERY_REPLAY_SCHEMA = {
  replay_id: { type: 'STRING', mode: 'REQUIRED' },
  format: { type: 'STRING', mode: 'NULLABLE' },
  timestamp: { type: 'TIMESTAMP', mode: 'NULLABLE' },
  winner: { type: 'STRING', mode: 'NULLABLE' },
  player1: { type: 'STRING', mode: 'NULLABLE' },
  player2: { type: 'STRING', mode: 'NULLABLE' },
  player1_rating: { type: 'INTEGER', mode: 'NULLABLE' },
  player2_rating: { type: 'INTEGER', mode: 'NULLABLE' },
  // RECORD fields (nested structures)
  teams: {
    type: 'RECORD',
    mode: 'NULLABLE',
    fields: {
      p1: { type: 'RECORD', mode: 'REPEATED', fields: { name: 'STRING', species: 'STRING' } },
      p2: { type: 'RECORD', mode: 'REPEATED', fields: { name: 'STRING', species: 'STRING' } }
    }
  },
  turns: {
    type: 'RECORD',
    mode: 'REPEATED',
    fields: {
      turn_number: { type: 'INTEGER', mode: 'NULLABLE' },
      actions: { type: 'STRING', mode: 'REPEATED' }
    }
  }
};

/**
 * Validates and transforms a parsed replay object to match BigQuery schema
 * @param {Object} replayData - Raw replay data from parser
 * @returns {Object} Validated and transformed data ready for BigQuery
 */
function validateAndTransformReplay(replayData) {
  if (!replayData || !replayData.replay_id) {
    throw new Error('Missing required field: replay_id');
  }

  // Base structure with required fields
  const transformed = {
    replay_id: String(replayData.replay_id),
    format: replayData.format ? String(replayData.format) : null,
    timestamp: replayData.timestamp || replayData.meta?.uploadtime || new Date().toISOString(),
    winner: replayData.winner || null,
    player1: replayData.player1 || replayData.meta?.p1 || null,
    player2: replayData.player2 || replayData.meta?.p2 || null,
    player1_rating: safeParseInt(replayData.player1_rating || replayData.meta?.p1rating),
    player2_rating: safeParseInt(replayData.player2_rating || replayData.meta?.p2rating)
  };

  // Transform teams structure
  transformed.teams = transformTeams(replayData.teams);

  // Transform turns structure
  transformed.turns = transformTurns(replayData.turns);

  return transformed;
}

/**
 * Safely parse integer values, return null if invalid
 */
function safeParseInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Transform teams object to BigQuery RECORD structure
 */
function transformTeams(teams) {
  if (!teams || typeof teams !== 'object') {
    return { p1: [], p2: [] };
  }

  return {
    p1: transformTeamArray(teams.p1),
    p2: transformTeamArray(teams.p2)
  };
}

/**
 * Transform team array to BigQuery REPEATED RECORD structure
 */
function transformTeamArray(teamArray) {
  if (!Array.isArray(teamArray)) return [];

  return teamArray.map(pokemon => ({
    name: String(pokemon.name || pokemon.species || 'Unknown'),
    species: String(pokemon.species || pokemon.name || 'Unknown')
  }));
}

/**
 * Transform turns array to BigQuery REPEATED RECORD structure
 */
function transformTurns(turns) {
  if (!Array.isArray(turns)) return [];

  return turns.map((turn, index) => ({
    turn_number: safeParseInt(turn.turn_number) || index + 1,
    actions: Array.isArray(turn.actions) 
      ? turn.actions.map(a => String(a)) 
      : []
  }));
}

/**
 * Validate transformed data against schema (basic type checking)
 */
function validateSchema(data) {
  const errors = [];

  if (typeof data.replay_id !== 'string' || !data.replay_id) {
    errors.push('replay_id must be a non-empty string');
  }

  if (data.player1_rating !== null && typeof data.player1_rating !== 'number') {
    errors.push('player1_rating must be a number or null');
  }

  if (data.player2_rating !== null && typeof data.player2_rating !== 'number') {
    errors.push('player2_rating must be a number or null');
  }

  if (!data.teams || !Array.isArray(data.teams.p1) || !Array.isArray(data.teams.p2)) {
    errors.push('teams.p1 and teams.p2 must be arrays');
  }

  if (!Array.isArray(data.turns)) {
    errors.push('turns must be an array');
  }

  return errors;
}

module.exports = {
  BIGQUERY_REPLAY_SCHEMA,
  validateAndTransformReplay,
  validateSchema,
  safeParseInt,
  transformTeams,
  transformTurns
};