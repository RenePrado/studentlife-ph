import rateLimit from 'express-rate-limit';

// Strict limiter for authentication-sensitive endpoints.
// 5 requests per 15 minutes per IP. In-memory store (resets on restart,
// not shared across instances — fine for single-instance deploys).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later' },
});

// General API limiter. 100 requests per 15 minutes per IP.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later' },
});
