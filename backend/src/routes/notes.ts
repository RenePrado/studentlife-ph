import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.query('SELECT * FROM notes WHERE user_id = $1 ORDER BY is_pinned DESC, updated_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, content, tags } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Note title is required' });
    }

    const result = await db.query(
      'INSERT INTO notes (user_id, title, content, tags) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, title, content, tags]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Update note — only updates fields present in the request body.
// This allows partial updates (e.g. pin toggle without sending title/content)
// and allows null to actually clear a field (unlike COALESCE which preserves
// the old value when null is passed).
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowedFields = ['title', 'content', 'tags', 'is_pinned'];
    const updates: string[] = [];
    const values: (string | string[] | boolean | null)[] = [];
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
    values.push(req.params.id);
    values.push(req.userId as string);

    const result = await db.query(
      `UPDATE notes SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
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
    const result = await db.query('DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export { router as notesRoutes };
