// Centralized environment variable access with fail-fast guards for secrets.
// Import from here instead of reading process.env directly so missing secrets
// crash the server at startup with a clear message rather than silently
// falling back to an insecure default.

import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in backend/.env before starting the server.`
    );
  }
  return value;
}

// Eagerly validate secrets and config on first import so the server fails fast.
export const JWT_SECRET = requireEnv('JWT_SECRET');
export const SESSION_SECRET = requireEnv('SESSION_SECRET');
export const DATABASE_URL = requireEnv('DATABASE_URL');

// Optional config with sensible dev defaults (not security-sensitive).
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
export const PORT = process.env.PORT || '4000';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/auth/google/callback';
