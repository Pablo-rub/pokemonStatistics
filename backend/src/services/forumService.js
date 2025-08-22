const express = require('express');
const router = express.Router();
const bigQuery = require('../db/bigquery');
const { formatTimeSince } = require('../utils/helpers');

// GET /topics
router.get('/topics', async (req, res) => {
  try {
    const query = `
      SELECT *
      FROM \`pokemon-statistics.pokemon_replays.forum_topics\`
      ORDER BY last_active DESC
    `;
    const [rows] = await bigQuery.query(query);
    const formattedRows = rows.map(row => ({
      ...row,
      lastActive: formatTimeSince(new Date(row.last_active.value)),
      posts: row.posts_count
    }));
    res.json(formattedRows);
  } catch (error) {
    console.error("Error fetching forum topics:", error);
    res.status(500).send("Error fetching forum topics");
  }
});

// GET /topics/:topicId
router.get('/topics/:topicId', async (req, res) => {
  const { topicId } = req.params;
  try {
    const topicQuery = `
      SELECT *
      FROM \`pokemon-statistics.pokemon_replays.forum_topics\`
      WHERE topic_id = @topicId
    `;
    const topicOptions = { query: topicQuery, params: { topicId } };
    const [topicRows] = await bigQuery.query(topicOptions);
    if (topicRows.length === 0) return res.status(404).send("Topic not found");

    const messagesQuery = `
      SELECT *
      FROM \`pokemon-statistics.pokemon_replays.forum_messages\`
      WHERE topic_id = @topicId
      ORDER BY created_at ASC
    `;
    const messagesOptions = { query: messagesQuery, params: { topicId } };
    const [messagesRows] = await bigQuery.query(messagesOptions);

    const formattedTopic = {
      ...topicRows[0],
      created_at: topicRows[0].created_at.value,
      last_active: topicRows[0].last_active.value,
      posts_count: Number(topicRows[0].posts_count)
    };

    const formattedMessages = messagesRows.map(msg => ({
      ...msg,
      id: msg.message_id,
      content: msg.content,
      userId: msg.userId,
      userName: msg.userName,
      userAvatar: msg.userAvatar,
      timestamp: msg.created_at.value
    }));

    res.json({ topic: formattedTopic, messages: formattedMessages });
  } catch (error) {
    console.error("Error fetching topic details:", error);
    res.status(500).send("Error fetching topic details");
  }
});

// POST /topics
router.post('/topics', async (req, res) => {
  const { title, description, icon } = req.body;
  if (!title) return res.status(400).send("Title is required");
  try {
    const topicId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();
    const insertTopicQuery = `
      INSERT INTO \`pokemon-statistics.pokemon_replays.forum_topics\`
      (topic_id, title, description, icon, created_at, last_active, posts_count)
      VALUES(@topicId, @title, @description, @icon, @now, @now, 0)
    `;
    const params = { topicId, title, description: description || "", icon: icon || "", now };
    await bigQuery.query({ query: insertTopicQuery, params });
    res.status(201).json({
      topicId,
      title,
      description,
      icon,
      created_at: now,
      last_active: now,
      posts_count: 0
    });
  } catch (error) {
    console.error("Error creating new topic:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /topics/:topicId/messages
router.post('/topics/:topicId/messages', async (req, res) => {
  const { topicId } = req.params;
  const { content, userId, userName, userAvatar } = req.body;
  if (!content || !userId || !userName) {
    return res.status(400).send("Content, userId, and userName are required");
  }

  try {
    const topicQuery = `
      SELECT * FROM \`pokemon-statistics.pokemon_replays.forum_topics\`
      WHERE topic_id = @topicId
    `;
    const [topicRows] = await bigQuery.query({ query: topicQuery, params: { topicId } });
    if (topicRows.length === 0) return res.status(404).send("Topic not found");

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();
    const insertMessageQuery = `
      INSERT INTO \`pokemon-statistics.pokemon_replays.forum_messages\`
      (message_id, topic_id, content, userId, userName, userAvatar, created_at)
      VALUES(@messageId, @topicId, @content, @userId, @userName, @userAvatar, @now)
    `;
    const params = { messageId, topicId, content, userId, userName, userAvatar: userAvatar || "", now };
    await bigQuery.query({ query: insertMessageQuery, params });

    const updateTopicQuery = `
      UPDATE \`pokemon-statistics.pokemon_replays.forum_topics\`
      SET last_active = @now, posts_count = posts_count + 1
      WHERE topic_id = @topicId
    `;
    await bigQuery.query({ query: updateTopicQuery, params: { now, topicId } });

    res.status(201).json({
      id: messageId,
      topic_id: topicId,
      content,
      userId,
      userName,
      userAvatar,
      timestamp: now
    });
  } catch (error) {
    console.error("Error creating new message:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;