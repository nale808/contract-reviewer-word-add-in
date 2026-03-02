import { Router, Request, Response } from 'express';
import { runXpDecay, runWeeklyReset } from '../jobs/xpDecay';

const router = Router();

/**
 * Vercel Cron sends Authorization: Bearer <CRON_SECRET> on every scheduled call.
 * In production we enforce this; locally the check is skipped if CRON_SECRET is unset.
 */
function verifyCronSecret(req: Request, res: Response): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || process.env.NODE_ENV !== 'production') return true;
  if (req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// GET /api/cron/xp-decay
router.get('/xp-decay', async (req: Request, res: Response): Promise<void> => {
  if (!verifyCronSecret(req, res)) return;
  try {
    const result = await runXpDecay();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/xp-decay]', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET /api/cron/weekly-reset
router.get('/weekly-reset', async (req: Request, res: Response): Promise<void> => {
  if (!verifyCronSecret(req, res)) return;
  try {
    await runWeeklyReset();
    res.json({ ok: true });
  } catch (err) {
    console.error('[cron/weekly-reset]', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
