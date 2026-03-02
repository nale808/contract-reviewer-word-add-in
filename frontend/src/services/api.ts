/**
 * api.ts — Centralized API client for Contract Reviewer
 *
 * All backend calls go through this module so that:
 *  • The base URL is resolved from the env var exactly once
 *  • Auth headers (MSAL Bearer token) are injected in one place
 *  • HTTP errors are surfaced as typed `ApiClientError` exceptions
 *  • AbortSignal support is consistent across all callers
 *
 * Usage:
 *   import { apiClient } from '../services/api';
 *   const result = await apiClient.analyze({ clauses, contractType });
 */

// ─── Base URL ─────────────────────────────────────────────────────────────────

const BASE_URL = (
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL)
    ? process.env.REACT_APP_API_URL
    : 'https://localhost:5001'
).replace(/\/$/, '');

// ─── Shared types (mirror backend/src/types/api.ts) ──────────────────────────

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type AlignmentLabel = 'On-Playbook' | 'Minor-Gap' | 'Major-Gap' | 'Off-Playbook';
export type Perspective = 'buyer' | 'seller';
export type AudienceLevel = 'executive' | 'legal';
export type CareerTitle =
  | 'Paralegal'
  | 'Junior Associate'
  | 'Senior Associate'
  | 'Partner'
  | 'Managing Partner';

export interface ClauseInput {
  id: string;
  text: string;
  clauseType?: string;
}

export interface DifficultyRating {
  stars: 1 | 2 | 3 | 4 | 5;
  label: 'Routine' | 'Standard' | 'Complex' | 'Advanced' | 'Expert';
  xpMultiplier: number;
  rationale: string;
}

// ─── /api/analyze ─────────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  /** Pre-parsed clauses OR raw paragraphs (backend accepts both). */
  clauses?: ClauseInput[];
  paragraphs?: Array<{ index: number; text: string; style?: string }>;
  contractType: string;
  perspective?: Perspective;
}

export interface ClauseRisk {
  clauseId: string;
  riskLevel: RiskLevel;
  riskCategory: string;
  explanation: string;
  specificConcerns: string[];
}

export interface AnalyzeResponse {
  results: ClauseRisk[];
  difficulty: DifficultyRating;
}

// ─── /api/rewrite ─────────────────────────────────────────────────────────────

export interface RewriteRequest {
  clauseId: string;
  originalText: string;
  riskExplanation: string;
  contractType: string;
  perspective?: Perspective;
}

export interface RewriteResponse {
  clauseId: string;
  suggestedText: string;
  changesSummary: string;
  negotiatingRationale: string;
}

// ─── /api/summarize ───────────────────────────────────────────────────────────

export interface SummarizeRequest {
  clauses: ClauseInput[];
  audienceLevel?: AudienceLevel;
}

export interface ClauseSummary {
  clauseId: string;
  summary: string;
  keyPoints: string[];
  clauseType: string;
}

export interface SummarizeResponse {
  summaries: ClauseSummary[];
}

// ─── /api/playbook/compare ────────────────────────────────────────────────────

export interface PlaybookEntry {
  clauseType: string;
  preferredPosition: string;
  fallbackPosition?: string;
  mustHaves?: string[];
}

export interface PlaybookCompareRequest {
  clauses: ClauseInput[];
  playbookEntries: PlaybookEntry[];
}

export interface PlaybookComparison {
  clauseId: string;
  clauseType: string;
  alignmentScore: 1 | 2 | 3 | 4 | 5;
  alignmentLabel: AlignmentLabel;
  gaps: string[];
  mustHavesMissing: string[];
  recommendedAction: string;
}

export interface PlaybookCompareResponse {
  comparisons: PlaybookComparison[];
}

// ─── /api/stats/record ────────────────────────────────────────────────────────

export type StatEvent =
  | 'contractAnalyzed'
  | 'redlineInserted'
  | 'contractCompleted'
  | 'playbookCompared';

export interface RecordStatRequest {
  event: StatEvent;
  payload?: {
    riskLevel?: RiskLevel;
    scoreImprovement?: number;
    xpMultiplier?: number;
  };
}

export interface RecordStatResponse {
  totalXp: number;
  careerTitle: CareerTitle;
  currentStreak: number;
  leveledUp: boolean;
  previousTitle?: CareerTitle;
}

// ─── /api/leaderboard ─────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  weeklyRedlines: number;
  contractsReviewed: number;
  careerTitle: CareerTitle;
}

export interface LeaderboardResponse {
  week: string;
  entries: LeaderboardEntry[];
  myRank: number | null;
}

// ─── /api/chat ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  webSearch?: boolean;
  documentContext?: string;
}

export interface ChatResponse {
  content: string;
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ─── Token provider (MSAL hook-in) ────────────────────────────────────────────

/**
 * Call `setTokenProvider` once after MSAL authentication succeeds.
 * The provided function will be called before every request to fetch a
 * fresh Bearer token. Until MSAL is wired up the header is simply omitted.
 */
let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>): void {
  _getToken = fn;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function request<TResponse>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<TResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Inject MSAL Bearer token when available
  if (_getToken) {
    try {
      const token = await _getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Token fetch failed — proceed without auth; the backend will return 401
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    let message: string;
    switch (res.status) {
      case 400: message = 'Invalid request — please check the input and try again.'; break;
      case 401: message = 'Authentication required. Please sign in.'; break;
      case 403: message = 'You do not have permission to perform this action.'; break;
      case 429: message = 'Rate limit exceeded — please wait a moment before retrying.'; break;
      case 500: message = 'Server error. Please try again or contact support.'; break;
      default:  message = `Request failed (HTTP ${res.status}).`; break;
    }

    // Try to surface a more specific message from the backend error body
    try {
      const errBody = await res.clone().json() as { message?: string };
      if (typeof errBody.message === 'string' && errBody.message.length > 0) {
        message = errBody.message;
      }
    } catch { /* ignore */ }

    throw new ApiClientError(res.status, message);
  }

  return res.json() as Promise<TResponse>;
}

// ─── Public API surface ───────────────────────────────────────────────────────

export const apiClient = {
  /**
   * Analyze contract clauses for risk.
   * Returns per-clause risk results and an overall difficulty rating.
   */
  analyze(req: AnalyzeRequest, signal?: AbortSignal): Promise<AnalyzeResponse> {
    return request<AnalyzeResponse>('POST', '/api/analyze', req, signal);
  },

  /**
   * Request a market-standard rewrite of a risky clause.
   */
  rewrite(req: RewriteRequest, signal?: AbortSignal): Promise<RewriteResponse> {
    return request<RewriteResponse>('POST', '/api/rewrite', req, signal);
  },

  /**
   * Summarize clauses in plain English for a specified audience.
   */
  summarize(req: SummarizeRequest, signal?: AbortSignal): Promise<SummarizeResponse> {
    return request<SummarizeResponse>('POST', '/api/summarize', req, signal);
  },

  /**
   * Compare clauses against the user's negotiating playbook.
   */
  playbookCompare(req: PlaybookCompareRequest, signal?: AbortSignal): Promise<PlaybookCompareResponse> {
    return request<PlaybookCompareResponse>('POST', '/api/playbook/compare', req, signal);
  },

  /**
   * Record a gamification event (redline inserted, contract completed, etc.).
   * Returns updated XP, career title, streak, and whether the user levelled up.
   */
  recordStat(req: RecordStatRequest, signal?: AbortSignal): Promise<RecordStatResponse> {
    return request<RecordStatResponse>('POST', '/api/stats/record', req, signal);
  },

  /**
   * Fetch the weekly leaderboard (top 20 by redline count).
   */
  leaderboard(signal?: AbortSignal): Promise<LeaderboardResponse> {
    return request<LeaderboardResponse>('GET', '/api/leaderboard', undefined, signal);
  },

  /**
   * Send a message to the AI legal assistant.
   * Pass an AbortSignal to cancel in-flight requests when the user navigates away.
   */
  chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    return request<ChatResponse>('POST', '/api/chat', req, signal);
  },
} as const;
