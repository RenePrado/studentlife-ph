import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

const router = express.Router();

// Get all tasks for user
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM tasks WHERE user_id = $1 ORDER BY due_date ASC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get tasks error:', message);
    res.status(500).json({ error: message });
  }
});

// Create task
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, description, priority, due_date, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const result = await db.query(
      `INSERT INTO tasks (user_id, title, description, priority, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.userId, title, description, priority || 'medium', due_date, status || 'todo']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create task error:', message);
    res.status(500).json({ error: message });
  }
});

// Update task — only updates fields present in the request body.
// This allows null to actually clear a field (unlike COALESCE which preserves
// the old value when null is passed).
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['title', 'description', 'priority', 'due_date', 'status'];
    const updates: string[] = [];
    const values: (string | null)[] = [];
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
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update task error:', message);
    res.status(500).json({ error: message });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete task error:', message);
    res.status(500).json({ error: message });
  }
});

export { router as tasksRoutes };