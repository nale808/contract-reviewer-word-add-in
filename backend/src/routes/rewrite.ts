import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rateLimit';
import { rewriteClause } from '../services/claudeService';

const router = Router();

const RewriteBodySchema = z.object({
  clauseId: z.string().max(500),
  originalText: z.string().min(10).max(50000),
  riskExplanation: z.string().min(5).max(5000),
  contractType: z.string().min(1).max(500),
  perspective: z.enum(['buyer', 'seller']).optional(),
});

router.post(
  '/',
  requireAuth,
  aiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = RewriteBodySchema.parse(req.body);
      const result = await rewriteClause(
        body.clauseId,
        body.originalText,
        body.riskExplanation,
        body.contractType,
        body.perspective
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
