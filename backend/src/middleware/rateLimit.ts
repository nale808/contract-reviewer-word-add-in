import rateLimit from 'express-rate-limit';

// NOTE: app.set('trust proxy', 1) must be set in server.ts for req.ip to reflect
// the real client IP when behind a proxy/load-balancer. This is done in server.ts.

// ─── Per-user rate limit for AI endpoints ─────────────────────────────────────
// Claude API calls are expensive; cap per IP to prevent abuse.

export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many AI requests — please wait a moment and try again.',
    statusCode: 429,
  },
  keyGenerator: (req) => {
    // Key by user ID when auth is enabled, fall back to real client IP
    const authReq = req as { user?: { userId: string } };
    return authReq.user?.userId ??
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
      req.ip ??
      'unknown';
  },
});

// ─── General API rate limit ───────────────────────────────────────────────────

export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Too many requests — please slow down.',
    statusCode: 429,
  },
  keyGenerator: (req) => {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
  },
});
