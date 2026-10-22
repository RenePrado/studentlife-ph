import express from 'express';
import passport from '../config/passport';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { generateAccessToken, generateRefreshToken } from '../config/passport';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limiter';
import { JWT_SECRET, FRONTEND_URL } from '../config/env';

const router = express.Router();

const REFRESH_TOKEN_TTL_DAYS = 30;

// Issue an access + refresh token pair, persisting the refresh token hash.
// Throws on DB failure — callers wrap in try/catch.
async function issueTokenPair(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = generateAccessToken(userId);
  const { token: refreshToken, hash } = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt]
  );
  return { accessToken, refreshToken };
}

function publicUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    school: row.school,
    program: row.program,
    avatarUrl: row.avatar_url,
  };
}

// Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login` }),
  async (req: AuthRequest, res) => {
    try {
      const user = req.user as { id: string } | undefined;
      if (!user) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      const { accessToken, refreshToken } = await issueTokenPair(user.id);
      res.redirect(
        `${FRONTEND_URL}/google-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Google callback error:', message);
      res.status(500).json({ error: 'Authentication failed during token issuance' });
    }
  }
);

// Email/Password Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, fullName, school, program } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT * FROM profiles WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      `INSERT INTO profiles (email, password_hash, full_name, school, program)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, school, program, avatar_url`,
      [email, passwordHash, fullName, school, program]
    );

    const user = result.rows[0];
    const { accessToken, refreshToken } = await issueTokenPair(user.id);

    res.status(201).json({
      user: publicUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Register error:', message);
    res.status(500).json({ error: message || 'Registration failed' });
  }
});

// Email/Password Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await db.query(
      'SELECT * FROM profiles WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if user has password (Google users might not)
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Please use Google OAuth to login' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = await issueTokenPair(user.id);

    res.json({
      user: publicUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Login error:', message);
    res.status(500).json({ error: message || 'Login failed' });
  }
});

// Refresh access token. Rotates the refresh token: the presented token is
// revoked and a new pair is issued. Reuse of a revoked token is a no-op
// (returns 401), which also defeats attempted reuse-detection bypasses.
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Atomic conditional revoke: only succeeds if the token is not yet
    // revoked and not expired. This prevents the race where two concurrent
    // requests both pass the SELECT check before either revokes.
    const revokeResult = await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW() RETURNING user_id',
      [hash]
    );

    if (revokeResult.rows.length > 0) {
      // Successfully revoked — issue a new pair.
      // Opportunistically clean up old revoked/expired tokens for this user.
      await db.query(
        'DELETE FROM refresh_tokens WHERE user_id = $1 AND (revoked_at IS NOT NULL OR expires_at <= NOW())',
        [revokeResult.rows[0].user_id]
      );
      const pair = await issueTokenPair(revokeResult.rows[0].user_id);
      return res.json(pair);
    }

    // Token not found, already revoked, or expired — check for reuse detection.
    const result = await db.query(
      'SELECT user_id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = $1',
      [hash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const row = result.rows[0];
    if (row.revoked_at) {
      // Reuse of a revoked token — revoke the entire family to invalidate
      // any stolen chain.
      await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [row.user_id]);
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }

    // Token exists, not revoked, but expired (the atomic UPDATE didn't match).
    return res.status(401).json({ error: 'Refresh token expired' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Refresh error:', message);
    res.status(500).json({ error: message || 'Failed to refresh token' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, full_name, school, program, avatar_url FROM profiles WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get user error:', message);
    res.status(500).json({ error: message || 'Failed to get user' });
  }
});

// Logout — revoke the presented refresh token and destroy the session.
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [hash]);
    }
  } catch (error) {
    // Non-fatal: even if revoke fails, the client clears its tokens.
    console.error('Logout revoke error:', error instanceof Error ? error.message : 'Unknown error');
  }

  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Forgot password — generate a reset token.
// NOTE: No email infrastructure is wired up. In development the reset token
// and URL are returned in the response so you can test the flow manually.
// In production this should send an email instead.
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await db.query('SELECT id FROM profiles WHERE email = $1', [email]);

    // Always return 200 to avoid user enumeration.
    if (result.rows.length === 0) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    const userId = result.rows[0].id;
    const resetToken = jwt.sign(
      { userId, purpose: 'reset' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const isDev = process.env.NODE_ENV !== 'production';
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    res.json({
      message: 'If the email exists, a reset link has been sent.',
      ...(isDev && { devResetUrl: resetUrl, devResetToken: resetToken }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Forgot password error:', message);
    res.status(500).json({ error: message || 'Failed to process request' });
  }
});

// Reset password — validate token and set new password.
// Also revokes all refresh tokens for the user (force re-login everywhere).
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.query('UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      decoded.userId,
    ]);
    // Invalidate any existing sessions.
    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [
      decoded.userId,
    ]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reset password error:', message);
    res.status(500).json({ error: message || 'Failed to reset password' });
  }
});

// Change password — requires authentication, verifies current password.
// Revokes all other refresh tokens for the user (force re-login elsewhere).
router.post('/change-password', authLimiter, authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const result = await db.query('SELECT password_hash FROM profiles WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (!user.password_hash) {
      return res.status(400).json({ error: 'No password set — use Google OAuth or set a password first' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      req.userId,
    ]);
    // Revoke all refresh tokens — the caller will get a fresh pair on next login.
    await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [
      req.userId,
    ]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Change password error:', message);
    res.status(500).json({ error: message || 'Failed to change password' });
  }
});

export { router as authRoutes };
