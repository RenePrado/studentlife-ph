import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.query('SELECT * FROM pomodoro_sessions WHERE user_id = $1 ORDER BY session_date DESC LIMIT 30', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { duration, subject, completed } = req.body;

    if (duration === undefined) {
      return res.status(400).json({ error: 'Duration is required' });
    }

    const result = await db.query(
      'INSERT INTO pomodoro_sessions (user_id, duration, subject, completed, session_date) VALUES ($1, $2, $3, $4, CURRENT_DATE) RETURNING *',
      [req.userId, duration, subject, completed !== undefined ? completed : true]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export { router as pomodoroSessionsRoutes };