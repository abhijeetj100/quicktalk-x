const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const roomsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});
router.use(roomsLimiter);
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.* FROM rooms r
       JOIN room_members rm ON r.id = rm.room_id
       WHERE rm.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  const { name, description, type = 'group', is_public = true } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const roomResult = await client.query(
        'INSERT INTO rooms (name, description, type, is_public, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, description, type, is_public, req.user.id]
      );
      const room = roomResult.rows[0];
      await client.query(
        'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)',
        [room.id, req.user.id, 'owner']
      );
      await client.query('COMMIT');
      res.status(201).json(room);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/messages', async (req, res) => {
  const { before, limit = 50 } = req.query;
  try {
    let query, params;
    if (before) {
      query = `SELECT m.*, u.username, u.display_name FROM messages m
               JOIN users u ON m.user_id = u.id
               WHERE m.room_id = $1 AND m.is_deleted = false AND m.created_at < $2
               ORDER BY m.created_at DESC LIMIT $3`;
      params = [req.params.id, before, Math.min(parseInt(limit), 100)];
    } else {
      query = `SELECT m.*, u.username, u.display_name FROM messages m
               JOIN users u ON m.user_id = u.id
               WHERE m.room_id = $1 AND m.is_deleted = false
               ORDER BY m.created_at DESC LIMIT $2`;
      params = [req.params.id, Math.min(parseInt(limit), 100)];
    }
    const result = await pool.query(query, params);
    res.json(result.rows.reverse());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
