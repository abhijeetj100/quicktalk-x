const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const usersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});
router.use(usersLimiter);
router.use(authMiddleware);

router.get('/me', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, display_name, avatar_url, status FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/me', async (req, res) => {
  const { display_name, avatar_url } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET display_name = COALESCE($1, display_name), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() WHERE id = $3 RETURNING id, username, email, display_name, avatar_url, status',
      [display_name, avatar_url, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
