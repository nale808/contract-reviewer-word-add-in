import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rateLimit';
import { summarizeClauses } from '../services/claudeService';

const router = Router();

const SummarizeBodySchema = z.object({
  clauses: z.array(
    z.object({
      id: z.string().max(500),
      text: z.string().max(50000),
      clauseType: z.string().max(500).optional(),
    })
  ),
  audienceLevel: z.enum(['executive', 'legal']).optional(),
});

router.post(
  '/',
  requireAuth,
  aiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = SummarizeBodySchema.parse(req.body);
      const result = await summarizeClauses(body.clauses, body.audienceLevel);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
