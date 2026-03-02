import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rateLimit';
import { compareToPlaybook } from '../services/claudeService';

const router = Router();

const PlaybookBodySchema = z.object({
  clauses: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      clauseType: z.string().optional(),
    })
  ),
  playbookEntries: z.array(
    z.object({
      clauseType: z.string(),
      preferredPosition: z.string(),
      fallbackPosition: z.string().optional(),
      mustHaves: z.array(z.string()).optional(),
    })
  ),
});

router.post(
  '/compare',
  requireAuth,
  aiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = PlaybookBodySchema.parse(req.body);
      const result = await compareToPlaybook(body.clauses, body.playbookEntries);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
