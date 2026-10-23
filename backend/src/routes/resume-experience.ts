import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.query('SELECT * FROM resume_experience WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { role, company, start_date, end_date, description } = req.body;

    if (!role || !company) {
      return res.status(400).json({ error: 'Role and company are required' });
    }

    const result = await db.query(
      'INSERT INTO resume_experience (user_id, role, company, start_date, end_date, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.userId, role, company, start_date, end_date, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { role, company, start_date, end_date, description } = req.body;
    const { id } = req.params;
    const result = await db.query(
      'UPDATE resume_experience SET role = $1, company = $2, start_date = $3, end_date = $4, description = $5 WHERE id = $6 AND user_id = $7 RETURNING *',
      [role, company, start_date, end_date, description, id, req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM resume_experience WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export { router as resumeExperienceRoutes };