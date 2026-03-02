import { config } from './config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ─── Trust proxy (required for rate limiter IP detection behind proxies) ──────

app.set('trust proxy', 1);

// ─── Security middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: config.FRONTEND_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ─── Request logging ──────────────────────────────────────────────────────────

app.use(morgan('combined'));

app.use(express.json({ limit: '2mb' })); // contracts can be large

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api', routes);

// ─── Error handler (must be last) ────────────────────────────────────────────

app.use(errorHandler);

export default app;
