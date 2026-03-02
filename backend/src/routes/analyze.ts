import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rateLimit';
import { analyzeContract } from '../services/claudeService';
import { parseClauses } from '../services/contractParser';

const router = Router();

const AnalyzeBodySchema = z.object({
  paragraphs: z
    .array(
      z.object({
        index: z.number(),
        text: z.string().max(50000),
        style: z.string().max(500).optional(),
      })
    )
    .optional(),
  clauses: z
    .array(
      z.object({
        id: z.string().max(500),
        text: z.string().max(50000),
        clauseType: z.string().max(500).optional(),
      })
    )
    .optional(),
  contractType: z.string().min(1).max(500),
  perspective: z.enum(['buyer', 'seller']).optional(),
});

router.post(
  '/',
  requireAuth,
  aiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = AnalyzeBodySchema.parse(req.body);

      // Accept either pre-parsed clauses or raw paragraphs from Office.js
      const clauses =
        body.clauses ??
        parseClauses(body.paragraphs ?? []);

      if (clauses.length === 0) {
        res.status(400).json({
          error: 'BadRequest',
          message: 'No clauses found in the document',
          statusCode: 400,
        });
        return;
      }

      const result = await analyzeContract(
        clauses,
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
