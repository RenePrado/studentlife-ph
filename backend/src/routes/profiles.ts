import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

const router = express.Router();

// Get user profile
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, full_name, phone, location, bio, school, program, monthly_allowance, avatar_url, created_at, updated_at FROM profiles WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get profile error:', message);
    res.status(500).json({ error: message });
  }
});

// Update profile — only updates fields present in the request body.
// This allows null to actually clear a field (unlike COALESCE which
// preserves the old value when null is passed).
router.put('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowedFields = ['full_name', 'phone', 'location', 'bio', 'school', 'program', 'monthly_allowance'];
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
    values.push(req.userId as string);

    const result = await db.query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update profile error:', message);
    res.status(500).json({ error: message });
  }
});

// Delete profile
router.delete('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await db.query('DELETE FROM profiles WHERE id = $1', [req.userId]);
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete profile error:', message);
    res.status(500).json({ error: message });
  }
});

export { router as profileRoutes };