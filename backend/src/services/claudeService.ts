import Anthropic from '@anthropic-ai/sdk';
import {
  AnalyzeClaudeResponseSchema,
  RewriteClaudeResponseSchema,
  SummarizeClaudeResponseSchema,
  PlaybookClaudeResponseSchema,
  type AnalyzeClaudeResponse,
  type RewriteClaudeResponse,
  type SummarizeClaudeResponse,
  type PlaybookClaudeResponse,
} from '../types/claude';
import type { ClauseInput, PlaybookEntry, Perspective, AudienceLevel } from '../types/api';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 30000, // 30 second timeout
});
const MODEL = 'claude-opus-4-6';
const MOCK = process.env.MOCK_AI === 'true';

// ─── Mock responses (used when MOCK_AI=true) ──────────────────────────────────

function mockAnalyze(clauses: ClauseInput[]): AnalyzeClaudeResponse {
  const riskMap: Record<string, AnalyzeClaudeResponse['results'][0]> = {};
  for (const c of clauses) {
    const type = (c.clauseType ?? '').toLowerCase();
    if (type.includes('terminat')) {
      riskMap[c.id] = { clauseId: c.id, riskLevel: 'HIGH', riskCategory: 'Termination Risk', explanation: '3-day notice is extremely short for a services agreement. Market standard is 30–90 days for convenience termination.', specificConcerns: ['No cure period for breach', 'No carve-out for termination for cause vs. convenience', 'Allows counterparty to exit with minimal notice'] };
    } else if (type.includes('liability')) {
      riskMap[c.id] = { clauseId: c.id, riskLevel: 'HIGH', riskCategory: 'Liability Exposure', explanation: '$100 liability cap is commercially unreasonable for a software services agreement. Cap should reflect the contract value.', specificConcerns: ['Cap of $100 is effectively meaningless for any real loss', 'No carve-out for gross negligence or willful misconduct', 'Consequential damages waiver is mutual but cap is too low'] };
    } else if (type.includes('intellectual') || type.includes('ip')) {
      riskMap[c.id] = { clauseId: c.id, riskLevel: 'HIGH', riskCategory: 'IP Ownership Risk', explanation: 'Vendor retaining IP in custom work product is highly unusual and disadvantageous for the buyer. Client should own bespoke deliverables.', specificConcerns: ['No license-back to buyer if vendor retains ownership', 'Client cannot reuse or transfer work product without vendor consent', 'Creates vendor lock-in for all customizations'] };
    } else {
      riskMap[c.id] = { clauseId: c.id, riskLevel: 'LOW', riskCategory: 'Minor Drafting Issue', explanation: 'Clause is broadly acceptable but could be tightened for clarity.', specificConcerns: ['Consider adding a notice requirement'] };
    }
  }
  return {
    results: clauses.map(c => riskMap[c.id] ?? { clauseId: c.id, riskLevel: 'NONE', riskCategory: 'Standard', explanation: 'Clause appears balanced and market standard.', specificConcerns: [] }),
    difficulty: { stars: 3, label: 'Complex', xpMultiplier: 1.5, rationale: 'Multi-clause software services agreement with several non-standard provisions.' },
  };
}

function mockRewrite(clauseId: string, originalText: string): RewriteClaudeResponse {
  return {
    clauseId,
    suggestedText: `Either party may terminate this Agreement for convenience upon thirty (30) days prior written notice to the other party. Either party may terminate this Agreement for material breach upon ten (10) days written notice specifying the breach in reasonable detail, provided the breaching party fails to cure such breach within such ten (10) day period.`,
    changesSummary: '• Extended notice period from 3 to 30 days for convenience termination\n• Added 10-day cure period for material breach\n• Distinguished termination for convenience vs. for cause',
    negotiatingRationale: 'Brings the termination clause to market standard for software services agreements and protects the buyer from abrupt contract termination.',
  };
}

function mockSummarize(clauses: ClauseInput[]): SummarizeClaudeResponse {
  return {
    summaries: clauses.map(c => ({
      clauseId: c.id,
      summary: `This clause covers ${c.clauseType ?? 'a general provision'}. It sets out the rights and obligations of both parties in this area and should be reviewed carefully before signing.`,
      keyPoints: ['Defines party rights and obligations', 'May require negotiation before signing', 'Consult legal counsel if uncertain'],
      clauseType: c.clauseType ?? 'General',
    })),
  };
}

function mockPlaybook(clauses: ClauseInput[]): PlaybookClaudeResponse {
  return {
    comparisons: clauses.map(c => ({
      clauseId: c.id,
      clauseType: c.clauseType ?? 'General',
      alignmentScore: 1 as 1,
      alignmentLabel: 'Off-Playbook' as const,
      gaps: ['Notice period is 3 days vs. preferred 30 days', 'No cure period present'],
      mustHavesMissing: ['cure period for breach'],
      recommendedAction: 'Redline required — clause deviates significantly from playbook position.',
    })),
  };
}

// ─── JSON parse with one auto-retry ──────────────────────────────────────────

async function parseClaudeJson<T>(
  rawText: string,
  schema: { parse: (data: unknown) => T },
  retryPrompt: () => Promise<string>
): Promise<T> {
  let text = rawText.trim();

  // Strip markdown code fences if present
  text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

  try {
    return schema.parse(JSON.parse(text));
  } catch {
    // One retry: ask Claude to fix its output
    const fixed = await retryPrompt();
    const cleanFixed = fixed.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return schema.parse(JSON.parse(cleanFixed));
  }
}

async function complete(system: string, user: string): Promise<string> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected Claude response type');
  return block.text;
}

// ─── Analyze: risk flagging + difficulty rating ───────────────────────────────

const ANALYZE_SYSTEM = `You are a senior contracts attorney specializing in commercial agreements.
Analyze each contract clause for legal and commercial risks, AND rate the overall contract difficulty.

Respond with VALID JSON ONLY — no preamble, no explanation outside the JSON.

Your response must match this exact shape:
{
  "results": [
    {
      "clauseId": string,
      "riskLevel": "HIGH" | "MEDIUM" | "LOW" | "NONE",
      "riskCategory": string,
      "explanation": string (2-3 sentences max),
      "specificConcerns": string[]
    }
  ],
  "difficulty": {
    "stars": 1 | 2 | 3 | 4 | 5,
    "label": "Routine" | "Standard" | "Complex" | "Advanced" | "Expert",
    "xpMultiplier": number (1, 1.25, 1.5, 2, or 3),
    "rationale": string (1 sentence)
  }
}

Risk levels:
- HIGH: Could cause significant financial loss, legal liability, or business disruption
- MEDIUM: Deviates from market standard in ways that disadvantage the client
- LOW: Minor deviation from best practice; unlikely to cause material harm
- NONE: Clause is balanced and market standard

Difficulty stars:
1=Routine (simple NDA / order form), 2=Standard (typical service agreement),
3=Complex (multi-party or technical), 4=Advanced (M&A or regulated industry),
5=Expert (cross-border, highly negotiated, or novel structure)

XP multipliers: 1→1, 2→1.25, 3→1.5, 4→2, 5→3`;

export async function analyzeContract(
  clauses: ClauseInput[],
  contractType: string,
  perspective: Perspective = 'buyer'
): Promise<AnalyzeClaudeResponse> {
  if (MOCK) return mockAnalyze(clauses);

  const userMsg = `Contract type: ${contractType}
Perspective: ${perspective} (identify risks from this party's viewpoint)

Clauses to analyze:
${JSON.stringify(clauses, null, 2)}`;

  const raw = await complete(ANALYZE_SYSTEM, userMsg);

  return parseClaudeJson(raw, AnalyzeClaudeResponseSchema, () =>
    complete(
      ANALYZE_SYSTEM,
      `Your previous response was not valid JSON. Return ONLY the JSON object with no other text:\n\n${userMsg}`
    )
  );
}

// ─── Rewrite: suggest improved clause language ────────────────────────────────

const REWRITE_SYSTEM = `You are a senior contracts attorney drafting redlined revisions.
Your rewrites must be:
- Legally precise using standard contract drafting conventions
- Commercially reasonable (the counterparty can realistically accept)
- Written in the same drafting style as the original clause
- The final clause text only — not commentary

Respond with VALID JSON ONLY matching this exact shape:
{
  "clauseId": string,
  "suggestedText": string,
  "changesSummary": string,
  "negotiatingRationale": string
}`;

export async function rewriteClause(
  clauseId: string,
  originalText: string,
  riskExplanation: string,
  contractType: string,
  perspective: Perspective = 'buyer'
): Promise<RewriteClaudeResponse> {
  if (MOCK) return mockRewrite(clauseId, originalText);

  const userMsg = `Clause ID: ${clauseId}
Original clause: ${originalText}
Problem identified: ${riskExplanation}
Contract type: ${contractType}
Drafting perspective: ${perspective}`;

  const raw = await complete(REWRITE_SYSTEM, userMsg);

  return parseClaudeJson(raw, RewriteClaudeResponseSchema, () =>
    complete(
      REWRITE_SYSTEM,
      `Your previous response was not valid JSON. Return ONLY the JSON object:\n\n${userMsg}`
    )
  );
}

// ─── Summarize: plain-English clause summaries ────────────────────────────────

const SUMMARIZE_SYSTEM = `You are a legal operations specialist translating contract language into clear summaries.

Respond with VALID JSON ONLY matching this exact shape:
{
  "summaries": [
    {
      "clauseId": string,
      "summary": string (2-3 plain-English sentences),
      "keyPoints": string[] (3-5 bullet points),
      "clauseType": string
    }
  ]
}`;

export async function summarizeClauses(
  clauses: ClauseInput[],
  audienceLevel: AudienceLevel = 'executive'
): Promise<SummarizeClaudeResponse> {
  if (MOCK) return mockSummarize(clauses);

  const userMsg = `Audience level: ${audienceLevel} (${audienceLevel === 'executive' ? 'avoid legal jargon' : 'include legal terminology'})

Clauses to summarize:
${JSON.stringify(clauses, null, 2)}`;

  const raw = await complete(SUMMARIZE_SYSTEM, userMsg);

  return parseClaudeJson(raw, SummarizeClaudeResponseSchema, () =>
    complete(
      SUMMARIZE_SYSTEM,
      `Your previous response was not valid JSON. Return ONLY the JSON object:\n\n${userMsg}`
    )
  );
}

// ─── Playbook comparison ──────────────────────────────────────────────────────

const PLAYBOOK_SYSTEM = `You are a legal operations specialist comparing contract language against a client playbook.

Respond with VALID JSON ONLY matching this exact shape:
{
  "comparisons": [
    {
      "clauseId": string,
      "clauseType": string,
      "alignmentScore": 1 | 2 | 3 | 4 | 5,
      "alignmentLabel": "On-Playbook" | "Minor-Gap" | "Major-Gap" | "Off-Playbook",
      "gaps": string[],
      "mustHavesMissing": string[],
      "recommendedAction": string
    }
  ]
}

Alignment scores: 5=fully on playbook, 4=minor gaps, 3=moderate gaps, 2=major gaps, 1=completely off
Labels: 5→"On-Playbook", 4→"Minor-Gap", 3→"Minor-Gap", 2→"Major-Gap", 1→"Off-Playbook"`;

// ─── AI Chat: multi-turn contract assistant ───────────────────────────────────

const CHAT_SYSTEM = (documentContext: string) =>
  `You are an expert contract analyst and legal assistant embedded in a contract redlining tool.
You have full context of the document currently being reviewed:

${documentContext || 'No document context provided yet.'}

You help legal professionals with:
- Explaining specific clauses in plain English
- Identifying risks and recommending negotiation positions
- Answering contract law and market-standard questions
- Drafting redline language and fallback positions
- Comparing provisions against the user's playbook or golden samples
- General strategy for negotiating specific provisions

Be concise, practical, and direct. Use legal precision but explain jargon where helpful.
Respond in plain text — no markdown headers, just well-structured paragraphs or short lists.`;

export async function chatWithClaude(
  messages: { role: 'user' | 'assistant'; content: string }[],
  documentContext: string,
  webSearch: boolean
): Promise<string> {
  if (MOCK) {
    return 'I\'m running in mock mode — connect to the live API for real AI responses.';
  }

  // Strip any leading assistant messages so the conversation starts with a user turn
  const firstUserIdx = messages.findIndex(m => m.role === 'user');
  const conversationMessages = firstUserIdx >= 0 ? messages.slice(firstUserIdx) : messages;

  if (conversationMessages.length === 0) {
    return 'Please ask me something about this contract.';
  }

  const tools: Anthropic.Tool[] | undefined = webSearch
    ? ([{ type: 'web_search_20250305', name: 'web_search' }] as unknown as Anthropic.Tool[])
    : undefined;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: CHAT_SYSTEM(documentContext),
    messages: conversationMessages,
    ...(tools ? { tools } : {}),
  });

  // Extract all text blocks (web search may interleave tool_result blocks)
  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as Anthropic.Messages.TextBlock).text)
    .join('\n\n');

  return text || 'I wasn\'t able to generate a response. Please try again.';
}

export async function compareToPlaybook(
  clauses: ClauseInput[],
  playbookEntries: PlaybookEntry[]
): Promise<PlaybookClaudeResponse> {
  if (MOCK) return mockPlaybook(clauses);

  const userMsg = `Playbook positions:
${JSON.stringify(playbookEntries, null, 2)}

Contract clauses to evaluate:
${JSON.stringify(clauses, null, 2)}`;

  const raw = await complete(PLAYBOOK_SYSTEM, userMsg);

  return parseClaudeJson(raw, PlaybookClaudeResponseSchema, () =>
    complete(
      PLAYBOOK_SYSTEM,
      `Your previous response was not valid JSON. Return ONLY the JSON object:\n\n${userMsg}`
    )
  );
}
