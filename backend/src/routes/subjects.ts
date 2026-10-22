import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

const router = express.Router();

// Get all subjects for user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM subjects WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get subjects error:', message);
    res.status(500).json({ error: message });
  }
});

// Create subject
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { code, name, units, room, professor } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    const result = await db.query(
      `INSERT INTO subjects (user_id, code, name, units, room, professor)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.userId, code, name, units, room, professor]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create subject error:', message);
    res.status(500).json({ error: message });
  }
});

// Update subject — only updates fields present in the request body.
// This allows null to actually clear a field (unlike COALESCE which preserves
// the old value when null is passed).
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['code', 'name', 'units', 'room', 'professor', 'grade'];
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (field in req.body) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(req.body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(id);
    values.push(req.userId as string);

    const result = await db.query(
      `UPDATE subjects SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update subject error:', message);
    res.status(500).json({ error: message });
  }
});

// Delete subject
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM subjects WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete subject error:', message);
    res.status(500).json({ error: message });
  }
});

export { router as subjectsRoutes };