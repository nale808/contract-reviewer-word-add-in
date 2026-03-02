// Full end-to-end API test — simulates a complete contract review session
// Run with: node test-api.js

const BASE = 'http://localhost:5001/api';

// ─── Sample contract ──────────────────────────────────────────────────────────

const CONTRACT = {
  contractType: 'Software Services Agreement',
  perspective: 'buyer',
  clauses: [
    {
      id: 'c1',
      text: 'Either party may terminate this agreement upon 3 days written notice for any reason whatsoever.',
      clauseType: 'Termination',
    },
    {
      id: 'c2',
      text: 'In no event shall either party be liable for any indirect, incidental, or consequential damages. The total aggregate liability of either party shall not exceed one hundred dollars ($100).',
      clauseType: 'Limitation of Liability',
    },
    {
      id: 'c3',
      text: 'Vendor shall retain all intellectual property rights, title, and interest in any work product, deliverables, or customizations created under this agreement, including any enhancements to existing software.',
      clauseType: 'Intellectual Property',
    },
    {
      id: 'c4',
      text: 'This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of law provisions.',
      clauseType: 'Governing Law',
    },
  ],
};

const PLAYBOOK = [
  {
    clauseType: 'Termination',
    preferredPosition: 'Minimum 30 days notice for convenience termination; 10-day cure period for breach',
    fallbackPosition: 'No less than 14 days notice',
    mustHaves: ['cure period for breach'],
  },
  {
    clauseType: 'Intellectual Property',
    preferredPosition: 'Client owns all work product and deliverables created specifically for client',
    fallbackPosition: 'Broad license to use, modify, and sublicense deliverables',
    mustHaves: ['client ownership of bespoke deliverables'],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${path} → ${res.status}: ${err}`);
  }
  return res.json();
}

const RISK_COLOR = { HIGH: '\x1b[31m', MEDIUM: '\x1b[33m', LOW: '\x1b[32m', NONE: '\x1b[90m' };
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GOLD = '\x1b[33m';

function stars(n) { return '⭐'.repeat(n) + '☆'.repeat(5 - n); }
function risk(level) { return `${RISK_COLOR[level] ?? ''}${level}${RESET}`; }
function header(title) { console.log(`\n${BOLD}${CYAN}${'─'.repeat(60)}${RESET}`); console.log(`${BOLD}${CYAN}  ${title}${RESET}`); console.log(`${CYAN}${'─'.repeat(60)}${RESET}`); }

// ─── Main test ────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n${BOLD}Contract Reviewer — Full API Test${RESET}`);
  console.log(`${DIM}Document: ${CONTRACT.contractType} (${CONTRACT.clauses.length} clauses, perspective: ${CONTRACT.perspective})${RESET}`);

  // ── Step 1: Analyze ────────────────────────────────────────────────────────

  header('STEP 1 — Risk Analysis  (POST /api/analyze)');
  const analysis = await post('/analyze', CONTRACT);

  const { difficulty } = analysis;
  console.log(`\n  ${GOLD}Difficulty: ${stars(difficulty.stars)} ${difficulty.label}  ×${difficulty.xpMultiplier} XP${RESET}`);
  console.log(`  ${DIM}${difficulty.rationale}${RESET}\n`);

  let totalDeductions = 0;
  for (const r of analysis.results) {
    const deduction = r.riskLevel === 'HIGH' ? 5 : r.riskLevel === 'MEDIUM' ? 3 : r.riskLevel === 'LOW' ? 1 : 0;
    totalDeductions += deduction;
    const clause = CONTRACT.clauses.find(c => c.id === r.clauseId);
    console.log(`  ${BOLD}[${r.clauseId}] ${clause?.clauseType ?? r.clauseId}${RESET}  →  ${risk(r.riskLevel)}  ${DIM}(−${deduction} pts)${RESET}`);
    console.log(`  ${DIM}${r.explanation}${RESET}`);
    for (const concern of r.specificConcerns) {
      console.log(`    ${RESET}• ${concern}`);
    }
    console.log();
  }

  const healthScore = Math.max(0, 100 - totalDeductions);
  console.log(`  ${BOLD}Contract Health Score: ${healthScore}/100${RESET}  ${healthScore < 40 ? '\x1b[31m●' : healthScore < 70 ? '\x1b[33m●' : '\x1b[32m●'}${RESET}`);

  // ── Step 2: Rewrite HIGH risk clauses ─────────────────────────────────────

  header('STEP 2 — AI Rewrites  (POST /api/rewrite)');
  const highRisk = analysis.results.filter(r => r.riskLevel === 'HIGH');

  for (const r of highRisk) {
    const clause = CONTRACT.clauses.find(c => c.id === r.clauseId);
    const rewrite = await post('/rewrite', {
      clauseId: r.clauseId,
      originalText: clause.text,
      riskExplanation: r.explanation,
      contractType: CONTRACT.contractType,
      perspective: CONTRACT.perspective,
    });

    console.log(`\n  ${BOLD}[${r.clauseId}] ${clause?.clauseType}${RESET}`);
    console.log(`  ${DIM}ORIGINAL:${RESET} ${clause.text}`);
    console.log(`  ${'\x1b[32m'}SUGGESTED:${RESET} ${rewrite.suggestedText}`);
    console.log(`  ${DIM}Changes: ${rewrite.changesSummary.replace(/\n/g, ' | ')}${RESET}`);
  }

  // ── Step 3: Plain-English summaries ───────────────────────────────────────

  header('STEP 3 — Plain-English Summaries  (POST /api/summarize)');
  const summaries = await post('/summarize', {
    clauses: CONTRACT.clauses,
    audienceLevel: 'executive',
  });

  for (const s of summaries.summaries) {
    console.log(`\n  ${BOLD}[${s.clauseId}] ${s.clauseType}${RESET}`);
    console.log(`  ${s.summary}`);
    for (const pt of s.keyPoints) {
      console.log(`    • ${pt}`);
    }
  }

  // ── Step 4: Playbook comparison ────────────────────────────────────────────

  header('STEP 4 — Playbook Comparison  (POST /api/playbook/compare)');
  const playbook = await post('/playbook/compare', {
    clauses: CONTRACT.clauses,
    playbookEntries: PLAYBOOK,
  });

  const labelColor = { 'On-Playbook': '\x1b[32m', 'Minor-Gap': '\x1b[33m', 'Major-Gap': '\x1b[31m', 'Off-Playbook': '\x1b[31m' };
  for (const c of playbook.comparisons) {
    const col = labelColor[c.alignmentLabel] ?? '';
    console.log(`\n  ${BOLD}[${c.clauseId}] ${c.clauseType}${RESET}  →  ${col}${c.alignmentLabel}${RESET}  ${DIM}(score: ${c.alignmentScore}/5)${RESET}`);
    for (const gap of c.gaps) console.log(`    • ${gap}`);
    if (c.mustHavesMissing.length) console.log(`    ${'\x1b[31m'}✗ MISSING: ${c.mustHavesMissing.join(', ')}${RESET}`);
    console.log(`    ${DIM}→ ${c.recommendedAction}${RESET}`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  header('SESSION SUMMARY');
  const baseXp = 25; // contractAnalyzed
  const redlineXp = highRisk.length * 15; // HIGH risk redlines
  const completionXp = healthScore >= 90 ? 50 : 0;
  const totalXp = Math.round((baseXp + redlineXp + completionXp) * difficulty.xpMultiplier);

  console.log(`\n  Health score:   ${healthScore}/100`);
  console.log(`  Difficulty:     ${stars(difficulty.stars)} (×${difficulty.xpMultiplier} XP)`);
  console.log(`  HIGH clauses:   ${highRisk.length} flagged, ${highRisk.length} rewritten`);
  console.log(`  ${GOLD}XP earned:      +${totalXp} XP  (${baseXp} analysis + ${redlineXp} redlines × ${difficulty.xpMultiplier})${RESET}`);
  console.log(`  ${DIM}All endpoints responded correctly ✓${RESET}\n`);
}

run().catch(err => { console.error('\x1b[31mTest failed:\x1b[0m', err.message); process.exit(1); });
