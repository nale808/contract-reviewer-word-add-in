// ─── Shared ───────────────────────────────────────────────────────────────────

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type AlignmentLabel = 'On-Playbook' | 'Minor-Gap' | 'Major-Gap' | 'Off-Playbook';
export type Perspective = 'buyer' | 'seller';
export type AudienceLevel = 'executive' | 'legal';
export type CareerTitle = 'Paralegal' | 'Junior Associate' | 'Senior Associate' | 'Partner' | 'Managing Partner';

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

// ─── POST /api/analyze ────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  clauses: ClauseInput[];
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

// ─── POST /api/rewrite ────────────────────────────────────────────────────────

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

// ─── POST /api/summarize ──────────────────────────────────────────────────────

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

// ─── POST /api/playbook/compare ───────────────────────────────────────────────

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

// ─── POST /api/stats/record ───────────────────────────────────────────────────

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

// ─── GET /api/leaderboard ─────────────────────────────────────────────────────

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

// ─── Error ────────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
