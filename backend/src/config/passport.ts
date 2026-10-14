import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import { db } from './database';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } from './env';

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const fullName = profile.displayName;

        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Check if user exists by Google ID
        const userResult = await db.query(
          'SELECT * FROM profiles WHERE google_id = $1',
          [googleId]
        );

        if (userResult.rows.length > 0) {
          return done(null, userResult.rows[0]);
        }

        // Check if user exists by email
        const emailResult = await db.query(
          'SELECT * FROM profiles WHERE email = $1',
          [email]
        );

        if (emailResult.rows.length > 0) {
          // Link Google account to existing user
          const updatedUser = await db.query(
            'UPDATE profiles SET google_id = $1 WHERE id = $2 RETURNING *',
            [googleId, emailResult.rows[0].id]
          );
          return done(null, updatedUser.rows[0]);
        }

        // Create new user
        const newUser = await db.query(
          `INSERT INTO profiles (email, full_name, google_id)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [email, fullName, googleId]
        );

        return done(null, newUser.rows[0]);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, (user as { id: string }).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await db.query('SELECT * FROM profiles WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error);
  }
});

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId, purpose: 'access' }, JWT_SECRET, {
    expiresIn: '15m',
  });
};

// Generates a random refresh token plus its SHA-256 hash. The hash is what
// we store in the DB; the raw token is returned to the client and never
// persisted. Rotation: every /auth/refresh call revokes the presented token
// and issues a new pair, so a stolen token is usable at most once.
export const generateRefreshToken = (): { token: string; hash: string } => {
  const token = crypto.randomBytes(48).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

export default passport;