import type { ClauseInput } from '../types/api';

export interface ParagraphInput {
  index: number;
  text: string;
  style?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HEADING_STYLES = new Set(['Heading 1', 'Heading 2', 'Heading 3', 'Title']);
const MIN_CLAUSE_LENGTH = 20; // characters — skip very short lines

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Groups raw Word paragraphs into logical contract clauses.
 * Contiguous body paragraphs under the same heading are merged.
 * Each clause gets a stable ID based on its first paragraph index.
 */
export function parseClauses(paragraphs: ParagraphInput[]): ClauseInput[] {
  const clauses: ClauseInput[] = [];
  let currentHeading = '';
  let currentBody: string[] = [];
  let currentStartIndex = 0;

  function flushClause(): void {
    const text = currentBody.join(' ').trim();
    if (text.length >= MIN_CLAUSE_LENGTH) {
      clauses.push({
        id: `clause_${currentStartIndex}`,
        text,
        clauseType: inferClauseType(currentHeading, text),
      });
    }
  }

  for (const para of paragraphs) {
    const isHeading = para.style ? HEADING_STYLES.has(para.style) : isLikelyHeading(para.text);

    if (isHeading) {
      flushClause();
      currentHeading = para.text.trim();
      currentBody = [];
      currentStartIndex = para.index;
    } else if (para.text.trim().length >= MIN_CLAUSE_LENGTH) {
      if (currentBody.length === 0) {
        currentStartIndex = para.index;
      }
      currentBody.push(para.text.trim());
    }
  }

  flushClause(); // flush final clause
  return clauses;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Heuristic: short ALL-CAPS or numbered lines with no period are likely headings.
 */
function isLikelyHeading(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return false;
  const numberedHeading = /^(\d+\.|\d+\.\d+\.?|[IVXLC]+\.)\s+[A-Z]/.test(trimmed);
  const allCaps = trimmed === trimmed.toUpperCase() && /[A-Z]{3,}/.test(trimmed);
  const noSentence = !trimmed.includes('.') && !trimmed.includes(',');
  return numberedHeading || (allCaps && noSentence);
}

/**
 * Maps clause headings/content to common contract clause type labels.
 * Used by the AI to give more targeted analysis.
 */
function inferClauseType(heading: string, body: string): string {
  const combined = (heading + ' ' + body).toLowerCase();

  if (/terminat/.test(combined)) return 'Termination';
  if (/indemnif/.test(combined)) return 'Indemnification';
  if (/liabilit/.test(combined)) return 'Limitation of Liability';
  if (/intellectual property|ip rights|ownership/.test(combined)) return 'Intellectual Property';
  if (/confidential|non-disclosure|nda/.test(combined)) return 'Confidentiality';
  if (/payment|fees|invoice|compensation/.test(combined)) return 'Payment';
  if (/warranty|warrants|represents/.test(combined)) return 'Warranties';
  if (/governing law|jurisdiction|dispute/.test(combined)) return 'Governing Law';
  if (/assignment|assign/.test(combined)) return 'Assignment';
  if (/force majeure/.test(combined)) return 'Force Majeure';
  if (/non.compet|non.solicit/.test(combined)) return 'Non-Compete / Non-Solicit';
  if (/data protection|privacy|gdpr/.test(combined)) return 'Data Protection';

  return heading || 'General';
}
