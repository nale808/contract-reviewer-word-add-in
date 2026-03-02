import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { aiRateLimit } from '../middleware/rateLimit';
import { chatWithClaude } from '../services/claudeService';

const router = Router();

const ChatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(5000),
      })
    )
    .min(1)
    .max(50),
  webSearch: z.boolean().optional().default(false),
  documentContext: z.string().max(50000).optional().default(''),
});

router.post(
  '/',
  requireAuth,
  aiRateLimit,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = ChatBodySchema.parse(req.body);
      const content = await chatWithClaude(body.messages, body.documentContext, body.webSearch);
      res.json({ content });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
