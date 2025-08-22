const express = require('express');
const router = express.Router();
const bigQuery = require('../db/bigquery');


// Create a new user with empty saved_replays
router.post('/saved-replays', async (req, res) => {
const { userId } = req.body;
const query = `
    INSERT INTO \`pokemon-statistics.pokemon_replays.saved_replays\`
    (user_id, replays_saved)
    VALUES (@userId, [])
`;
try {
    await bigQuery.query({ query, params: { userId } });
    res.status(200).json({ message: 'User record created' });
} catch (error) {
    console.error('Error creating user record:', error);
    res.status(500).send('Error creating user');
}
});

// Save one replay for a user
router.post('/:userId/saved-replays', async (req, res) => {
const { userId } = req.params;
const { replayId } = req.body;
if (!replayId) {
    return res.status(400).json({ error: 'Missing replayId' });
}

const query = `
    UPDATE \`pokemon-statistics.pokemon_replays.saved_replays\`
    SET replays_saved = ARRAY_CONCAT(
    replays_saved,
    [STRUCT(@replayId AS replay_id)]
    )
    WHERE user_id = @userId
`;
try {
    await bigQuery.query({ query, params: { userId, replayId } });
    res.json({ message: 'Replay saved' });
} catch (err) {
    console.error('Error saving replay:', err);
    res.status(500).json({ error: 'Error saving replay' });
}
});

// Remove a saved replay
router.delete('/:userId/saved-replays/:replayId', async (req, res) => {
const { userId, replayId } = req.params;
const query = `
    UPDATE \`pokemon-statistics.pokemon_replays.saved_replays\`
    SET replays_saved = (
    SELECT ARRAY_AGG(r) FROM UNNEST(replays_saved) AS r
    WHERE r.replay_id != @replayId
    )
    WHERE user_id = @userId
`;
try {
    await bigQuery.query({ query, params: { userId, replayId } });
    res.json({ message: 'Replay removed' });
} catch (err) {
    console.error('Error removing replay:', err);
    res.status(500).json({ error: 'Error removing replay' });
}
});

// Get all saved replays for a user
router.get('/:userId/saved-replays', async (req, res) => {
const { userId } = req.params;

try {
    // 1) fetch the array of saved IDs
    const [userRows] = await bigQuery.query({
    query: `
        SELECT replays_saved
        FROM \`pokemon-statistics.pokemon_replays.saved_replays\`
        WHERE user_id = @userId
    `,
    params: { userId }
    });
    if (!userRows.length || !userRows[0].replays_saved.length) {
    return res.json([]);
    }

    // 2) build an IN‐clause to fetch the full replay objects
    const ids = userRows[0].replays_saved.map(r => r.replay_id);
    const placeholders = ids.map((_, i) => `@id${i}`).join(', ');
    const params = ids.reduce((p, id, i) => ({
    ...p,
    [`id${i}`]: id
    }), {});

    const [games] = await bigQuery.query({
    query: `
        SELECT *
        FROM \`pokemon-statistics.pokemon_replays.replays\`
        WHERE replay_id IN (${placeholders})
    `,
    params
    });

    res.json(games);
} catch (error) {
    console.error('Error fetching saved replays:', error);
    res.status(500).send('Error fetching saved replays');
}
});

// Borra todas las partidas guardadas de un usuario
router.delete('/:userId/saved-replays', async (req, res) => {
const { userId } = req.params;
try {
    // Instead of deleting the entire user row, just clear their saved_replays array
    const query = `
    UPDATE \`pokemon-statistics.pokemon_replays.saved_replays\`
    SET replays_saved = []
    WHERE user_id = @userId
    `;
    await bigQuery.query({ query, params: { userId } });
    return res.status(200).json({ message: 'All saved replays cleared.' });
} catch (err) {
    console.error('Error clearing saved replays:', err);
    return res.status(500).json({ error: 'Failed to clear saved replays.' });
}
});

module.exports = router;