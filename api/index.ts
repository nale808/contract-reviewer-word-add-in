/**
 * Vercel serverless entry point.
 *
 * Vercel treats the default export from files in /api as a request handler.
 * Express apps satisfy that interface, so we just re-export the configured app.
 *
 * All routes live in backend/src/ — this file is the thin adapter.
 * Note: dotenv is NOT imported here; Vercel injects env vars directly into process.env.
 */
import app from '../backend/src/app';

export default app;
