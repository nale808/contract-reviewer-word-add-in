import { z } from 'zod';
import type { RiskLevel, AlignmentLabel, DifficultyRating } from './api';

// ─── Zod schemas for Claude JSON responses ────────────────────────────────────
// Claude is instructed to return JSON matching these shapes.
// Zod validates the parsed output before it reaches the route handlers.

export const ClauseRiskSchema = z.object({
  clauseId: z.string(),
  riskLevel: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE'] as [RiskLevel, ...RiskLevel[]]),
  riskCategory: z.string(),
  explanation: z.string(),
  specificConcerns: z.array(z.string()),
});

export const DifficultySchema = z.object({
  stars: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  ]),
  label: z.enum(['Routine', 'Standard', 'Complex', 'Advanced', 'Expert']),
  xpMultiplier: z.number(),
  rationale: z.string(),
});

export const AnalyzeClaudeResponseSchema = z.object({
  results: z.array(ClauseRiskSchema),
  difficulty: DifficultySchema,
});

export const RewriteClaudeResponseSchema = z.object({
  clauseId: z.string(),
  suggestedText: z.string(),
  changesSummary: z.string(),
  negotiatingRationale: z.string(),
});

export const ClauseSummarySchema = z.object({
  clauseId: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  clauseType: z.string(),
});

export const SummarizeClaudeResponseSchema = z.object({
  summaries: z.array(ClauseSummarySchema),
});

export const PlaybookComparisonSchema = z.object({
  clauseId: z.string(),
  clauseType: z.string(),
  alignmentScore: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  ]),
  alignmentLabel: z.enum(['On-Playbook', 'Minor-Gap', 'Major-Gap', 'Off-Playbook'] as [AlignmentLabel, ...AlignmentLabel[]]),
  gaps: z.array(z.string()),
  mustHavesMissing: z.array(z.string()),
  recommendedAction: z.string(),
});

export const PlaybookClaudeResponseSchema = z.object({
  comparisons: z.array(PlaybookComparisonSchema),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type AnalyzeClaudeResponse = z.infer<typeof AnalyzeClaudeResponseSchema>;
export type RewriteClaudeResponse = z.infer<typeof RewriteClaudeResponseSchema>;
export type SummarizeClaudeResponse = z.infer<typeof SummarizeClaudeResponseSchema>;
export type PlaybookClaudeResponse = z.infer<typeof PlaybookClaudeResponseSchema>;
export type DifficultyRatingParsed = z.infer<typeof DifficultySchema>;
