import { Router } from 'express';
import analyzeRouter from './analyze';
import rewriteRouter from './rewrite';
import summarizeRouter from './summarize';
import playbookRouter from './playbook';
import leaderboardRouter from './leaderboard';
import chatRouter from './chat';
import cronRouter from './cron';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

router.use('/analyze', analyzeRouter);
router.use('/rewrite', rewriteRouter);
router.use('/summarize', summarizeRouter);
router.use('/playbook', playbookRouter);
router.use('/leaderboard', leaderboardRouter);
router.use('/stats', leaderboardRouter); // /api/stats/record shares the same router
router.use('/chat', chatRouter);
router.use('/cron', cronRouter); // Vercel Cron Job endpoints

export default router;
