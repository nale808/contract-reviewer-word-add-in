import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    displayName: string;
    email?: string;
  };
}

// ─── JWKS client (fetches Microsoft public keys to verify tokens) ─────────────

const jwks = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.MSAL_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600_000, // 10 minutes
});

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    jwks.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Dev bypass — never enable in production
  if (process.env.SKIP_AUTH === 'true' && process.env.NODE_ENV === 'development') {
    req.user = {
      userId: 'dev-user-001',
      displayName: 'Dev User',
      email: 'dev@localhost',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing Bearer token', statusCode: 401 });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid token format', statusCode: 401 });
      return;
    }

    const signingKey = await getSigningKey(decoded.header);

    const payload = jwt.verify(token, signingKey, {
      audience: process.env.MSAL_CLIENT_ID,
      issuer: `https://login.microsoftonline.com/${process.env.MSAL_TENANT_ID}/v2.0`,
    }) as jwt.JwtPayload;

    req.user = {
      userId: payload.oid ?? payload.sub ?? '',
      displayName: payload.name ?? payload.preferred_username ?? 'Unknown',
      email: payload.email ?? payload.preferred_username,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized', message: 'Token validation failed', statusCode: 401 });
  }
}
