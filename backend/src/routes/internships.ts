import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.query('SELECT * FROM internships WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { company, position, location, status, applied_date, interview_date, notes } = req.body;

    if (!company || !position) {
      return res.status(400).json({ error: 'Company and position are required' });
    }

    const result = await db.query(
      'INSERT INTO internships (user_id, company, position, location, status, applied_date, interview_date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.userId, company, position, location, status || 'wishlist', applied_date, interview_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { company, position, location, status, applied_date, interview_date, notes } = req.body;
    const { id } = req.params;
    const result = await db.query(
      'UPDATE internships SET company = $1, position = $2, location = $3, status = $4, applied_date = $5, interview_date = $6, notes = $7, updated_at = NOW() WHERE id = $8 AND user_id = $9 RETURNING *',
      [company, position, location, status, applied_date, interview_date, notes, id, req.userId]
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
    const result = await db.query('DELETE FROM internships WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export { router as internshipsRoutes };