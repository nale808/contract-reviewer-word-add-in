import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { generalRateLimit } from '../middleware/rateLimit';
import { recordStat, getLeaderboard } from '../services/statsService';

const router = Router();

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

router.get(
  '/',
  requireAuth,
  generalRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await getLeaderboard(req.user!.userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/stats/record ───────────────────────────────────────────────────

const RecordBodySchema = z.object({
  event: z.enum(['contractAnalyzed', 'redlineInserted', 'contractCompleted', 'playbookCompared']),
  payload: z
    .object({
      riskLevel: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
      scoreImprovement: z.number().optional(),
      xpMultiplier: z.number().optional(),
    })
    .optional(),
});

router.post(
  '/record',
  requireAuth,
  generalRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = RecordBodySchema.parse(req.body);
      const result = await recordStat(
        req.user!.userId,
        req.user!.displayName,
        body.event,
        body.payload
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
