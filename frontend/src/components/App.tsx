import React, { useState, useEffect, useRef } from 'react';
import { locateClauseInDocument, insertClauseComment } from '../services/wordService';

// ─── Risk colors ──────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  HIGH:   '#c50f1f',
  MEDIUM: '#d4a017',
  LOW:    '#038387',
};

const RISK_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// ─── Dynamic style functions ────────────────────────────────────────────

const riskBadgeStyle = (risk: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 7px',
  borderRadius: 10,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.3,
  color: '#fff',
  background: RISK_COLOR[risk] ?? '#888',
  textTransform: 'uppercase' as const,
  flexShrink: 0,
});

const explainBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 9px',
  background: active ? '#eff6ff' : 'transparent',
  border: `1px solid ${active ? '#0078d4' : '#d2d0ce'}`,
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  color: active ? '#0078d4' : '#605e5c',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
});
// ─── Static styles ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  shell: {
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    background: '#f3f2f1',
    minHeight: '100vh',
    minWidth: 300,
    display: 'flex',
    flexDirection: 'column',
  },
  header: { background: '#0f3460', color: '#fff', padding: '11px 16px 10px' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: -0.2 },
  headerSub:   { margin: '2px 0 0', fontSize: 11, opacity: 0.6 },
  xpBar:  { height: 3, background: 'rgba(255,255,255,0.18)', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  xpFill: { height: '100%', background: '#f5a623', borderRadius: 2, transition: 'width 0.5s ease' },
  body: { flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 },

  /* Health gauge */
  gauge: {
    background: '#fff', borderRadius: 8, padding: '14px 16px',
    textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
  },
  gaugeLabel: {
    fontSize: 10, fontWeight: 600, color: '#bbb',
    letterSpacing: 1, textTransform: 'uppercase' as const, marginTop: 6,
  },

  /* Clause list — transparent flex column, each card is its own unit */
  section: {
    display: 'flex', flexDirection: 'column', gap: 0,
  },
  sectionHeader: {
    padding: '2px 2px 10px',
    fontSize: 11, fontWeight: 600,
    letterSpacing: 0.4, textTransform: 'uppercase' as const,
    color: '#999',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  btnApplyAll: {
    background: 'transparent', color: '#107c10', border: '1px solid #107c10',
    borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700,
    letterSpacing: 0.3, cursor: 'pointer', minWidth: 80, textAlign: 'center' as const,
    textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
  },
  btnConfirm: {
    background: '#107c10', color: '#fff', border: 'none',
    borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
  },
  btnCancel: {
    background: 'transparent', color: '#c50f1f', border: '1px solid #c50f1f',
    borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
  },
  /* Individual clause card */
  clauseCard: {
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
    overflow: 'hidden',
    transition: 'box-shadow 0.15s',
    marginBottom: 8,
  },

  /* Card header */
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid #f3f2f1',
  },
  cardHeaderLeft: {
    display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0,
  },
  cardTitle: {
    fontSize: 13, fontWeight: 600, color: '#201f1e',
    overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis',
  },

  /* Micro-label (ORIGINAL / REVISED / APPLIED) */
  microLabel: {
    fontSize: 9, fontWeight: 700,
    letterSpacing: 1, textTransform: 'uppercase' as const,
    marginBottom: 4,
  },

  /* Revised box */
  revisedBox: {
    background: '#f5fdf5', border: '1px solid #cce5cc',
    borderRadius: 6, padding: '9px 11px',
  },

  /* Card bottom toolbar */
  cardToolbar: {
    borderTop: '1px solid #f3f2f1', background: '#fafafa',
    padding: '6px 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },

  /* Minimize / expand control button */
  btnMinimize: {
    width: 24, height: 22,
    background: '#f3f2f1', border: '1px solid #ddd',
    borderRadius: 3, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: 0, flexShrink: 0,
  },
  /* Why / Explain panel */
  whyPanel: {
    background: '#f0f6ff', borderRadius: 5, padding: '8px 10px',
    fontSize: 11, color: '#004578', lineHeight: 1.55,
  },

  /* Secondary action buttons */
  btnSmall: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 9px', background: 'transparent',
    border: '1px solid #d2d0ce', borderRadius: 4,
    fontSize: 11, fontWeight: 600, color: '#323130',
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
  },

  /* Primary apply button */
  btnApply: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#0078d4', color: '#fff', border: 'none',
    borderRadius: 4, padding: '4px 14px', fontSize: 11,
    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const,
  },

  /* Textarea (edit & suggest modes) */
  inputArea: {
    width: '100%', border: '1px solid #d2d0ce', borderRadius: 4,
    padding: '7px 9px', fontSize: 12,
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    lineHeight: 1.5, resize: 'vertical' as const,
    color: '#323130', marginBottom: 6,
    boxSizing: 'border-box' as const, outline: 'none',
  },

  /* Two-button row for cancel/send, cancel/save */
  twoBtn: { display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 2 },
  btnCancelSm: {
    padding: '5px 12px', background: 'transparent',
    border: '1px solid #d2d0ce', borderRadius: 4,
    fontSize: 11, fontWeight: 600, color: '#666', cursor: 'pointer',
  },
  btnSend: {
    padding: '5px 14px', background: '#0078d4', color: '#fff',
    border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
  btnSave: {
    padding: '5px 14px', background: '#107c10', color: '#fff',
    border: 'none', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },

  /* Undo button */
  btnUndo: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', background: 'transparent',
    border: '1px solid #d2d0ce', borderRadius: 4,
    fontSize: 11, fontWeight: 600, color: '#888',
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },

  /* Pagination */
  paginationBtn: {
    width: 28, height: 28,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: '1px solid #d2d0ce',
    borderRadius: 4, fontSize: 12, fontWeight: 600,
    color: '#605e5c', cursor: 'pointer', flexShrink: 0,
  },

  /* Generating indicator */
  generating: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: '#888', fontStyle: 'italic' as const,
  },

  btnAnalyze: {
    background: '#0078d4', color: '#fff', border: 'none',
    borderRadius: 6, padding: '10px 0', fontSize: 13,
    fontWeight: 600, cursor: 'pointer', width: '100%',
  },
};
// ─── SVG icons ────────────────────────────────────────────────────

const InfoIcon = ({ active }: { active: boolean }) => {
  const c = active ? '#0078d4' : '#605e5c';
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="5.25" stroke={c} strokeWidth="1.2" />
      <rect x="5.375" y="5" width="1.25" height="3.75" rx="0.5" fill={c} />
      <circle cx="6" cy="3.5" r="0.7" fill={c} />
    </svg>
  );
};

const MinimizeIcon = () => (
  <svg width="10" height="2" viewBox="0 0 10 2">
    <path d="M0.5 1H9.5" stroke="#777" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ExpandIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10">
    <path d="M5 1V9M1 5H9" stroke="#777" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FixedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6.25" fill="#107c10" />
    <path d="M4 7L6.2 9.2L10 5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PencilIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M7.5 1.5L9.5 3.5L3.5 9.5H1.5V7.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 2.5L8.5 4.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M5.5 1v2M5.5 8v2M1 5.5h2M8 5.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M2.7 2.7l1.4 1.4M6.9 6.9l1.4 1.4M8.3 2.7L6.9 4.1M4.1 6.9L2.7 8.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
// ─── API configuration ────────────────────────────────────────────
// Set REACT_APP_API_URL in frontend/.env.local for your environment.
// Falls back to localhost for local development only.
const API_BASE_URL = (
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL)
    ? process.env.REACT_APP_API_URL
    : 'https://localhost:5001'
).replace(/\/$/, '');

// ─── Mock data (DEV ONLY) ─────────────────────────────────────────
// TODO: Replace with real API responses. In production, clauses come
// from POST /api/analyze and leaderboard from GET /api/leaderboard.
// These constants exist solely for UI development and demo purposes.

const MOCK_CLAUSES = [
  {
    id: 'c1',
    type: 'Termination',
    risk: 'HIGH',
    contextBefore: 'This Agreement shall commence on the Effective Date and continue for an initial term of one (1) year unless earlier terminated in accordance with this Section.',
    text: 'Either party may terminate this agreement upon 3 days written notice for any reason.',
    suggestion: 'Either party may terminate this Agreement for convenience upon thirty (30) days\' prior written notice to the other party. Either party may terminate this Agreement for cause upon written notice if the other party materially breaches any provision of this Agreement and fails to cure such breach within thirty (30) days of receiving written notice specifying the breach in reasonable detail. All accrued payment obligations and Sections relating to confidentiality, indemnification, and limitation of liability shall survive any expiration or termination.',
    contextAfter: 'Upon termination, each party shall promptly return or certifiably destroy all Confidential Information of the other party.',
    suggestionRationale: 'Extended convenience termination to 30 days (market standard for services agreements), giving both parties time to wind down operations. Added a separate 10-day notice track for material breach with a cure period, which is the professional standard: it distinguishes a deliberate exit from a fixable mistake and prevents snap terminations over minor issues.',
    fixed: false,
  },
  {
    id: 'c2',
    type: 'Limitation of Liability',
    risk: 'HIGH',
    contextBefore: 'Each party represents and warrants that it has full authority to enter into and perform this Agreement without conflict with any other agreement.',
    text: 'Total aggregate liability of either party shall not exceed one hundred dollars ($100).',
    suggestion: 'The total aggregate liability of either party shall not exceed the total fees paid by Client in the twelve (12) months preceding the claim. Neither party shall be liable for indirect or consequential damages, except in cases of gross negligence or willful misconduct.',
    contextAfter: 'The foregoing limitations shall apply notwithstanding any failure of essential purpose of any limited remedy set forth herein.',
    suggestionRationale: 'Replaced the $100 cap with 12 months of fees paid, tying the liability ceiling to actual contract value. Added a bilateral consequential damages exclusion to protect both parties from runaway losses. The carve-out for gross negligence and willful misconduct is standard; it ensures bad actors cannot hide behind the cap while still providing predictable exposure limits for ordinary performance failures.',
    fixed: false,
  },
  {
    id: 'c3',
    type: 'Intellectual Property',
    risk: 'HIGH',
    contextBefore: 'Vendor shall perform the Services as described in each Statement of Work and shall provide Client with all deliverables specified therein.',
    text: 'Vendor retains all intellectual property rights in any work product or deliverables created under this agreement.',
    suggestion: 'All work product and deliverables created specifically for Client ("Client Work Product") shall be owned exclusively by Client upon full payment. Vendor retains its pre-existing IP and grants Client a perpetual, royalty-free license to use it solely as incorporated in the Client Work Product.',
    contextAfter: 'Each party shall retain ownership of its Background IP and grants the other only such rights as are expressly stated in this Agreement.',
    suggestionRationale: 'Assigned client-specific deliverables to the client upon full payment, which is the market standard for custom work. Vendor retains ownership of pre-existing tools and background IP, with a perpetual royalty-free license back to the client so deliverables remain fully usable. This eliminates vendor lock-in while protecting the vendor\'s legitimate interest in reusing its own frameworks.',
    fixed: false,
  },
  {
    id: 'c4',
    type: 'Governing Law',
    risk: 'LOW',
    contextBefore: 'This Agreement, together with all Statements of Work, constitutes the entire agreement between the parties with respect to the subject matter hereof.',
    text: 'This Agreement shall be governed by the laws of the State of Delaware.',
    suggestion: 'This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of law provisions. Any disputes shall be resolved by binding arbitration in Delaware under AAA Commercial Arbitration Rules.',
    contextAfter: 'Notices shall be in writing and delivered to the addresses set forth on the signature page of this Agreement.',
    suggestionRationale: 'Added "without regard to conflict of law provisions" to prevent another state\'s law from being applied unexpectedly, a common pitfall when parties are in different jurisdictions. The AAA arbitration clause provides a faster, more confidential, and generally less expensive dispute resolution path than litigation, with proceedings in Delaware to stay consistent with the governing law choice.',
    fixed: false,
  },
  {
    id: 'c5',
    type: 'Indemnification',
    risk: 'HIGH',
    contextBefore: 'The parties agree to the following indemnification obligations with respect to claims arising from performance of this Agreement.',
    text: 'Client shall indemnify Vendor against any and all claims, damages, and expenses of any nature arising from Client\'s use of the deliverables.',
    suggestion: 'Each party shall indemnify, defend, and hold harmless the other party from claims arising from its own gross negligence or willful misconduct. Neither party shall be obligated to indemnify the other for claims arising from the indemnified party\'s own acts or omissions.',
    contextAfter: 'The indemnifying party shall have the right to control the defense of any claim, provided that the indemnified party may participate at its own expense.',
    suggestionRationale: 'Changed the one-sided indemnification (Client bears all risk) to a mutual, fault-based structure. Each party is only responsible for claims arising from its own misconduct, which is the market standard. One-sided indemnification clauses are a significant commercial risk and rarely accepted by sophisticated clients.',
    fixed: false,
  },
  {
    id: 'c6',
    type: 'Confidentiality',
    risk: 'MEDIUM',
    contextBefore: 'Both parties acknowledge that they may receive confidential information in connection with this Agreement.',
    text: 'Confidential information shall be kept confidential for a period of one (1) year following disclosure.',
    suggestion: 'Confidential information shall be kept confidential for a period of three (3) years following disclosure, or for the duration of the Agreement plus two (2) years, whichever is longer. Trade secrets shall be protected indefinitely.',
    contextAfter: 'The receiving party shall use the same degree of care to protect the disclosing party\'s confidential information as it uses to protect its own, but in no event less than reasonable care.',
    suggestionRationale: 'Extended the confidentiality period from 1 to 3 years, reflecting typical market practice for services agreements. A 1-year obligation is unusually short and may leave sensitive business information unprotected. Added a separate indefinite protection period for trade secrets, which is standard and legally required in many jurisdictions.',
    fixed: false,
  },
  {
    id: 'c7',
    type: 'Payment Terms',
    risk: 'MEDIUM',
    contextBefore: 'In consideration for the Services, Client shall pay Vendor the fees set forth in each Statement of Work.',
    text: 'Payment is due within 60 days of invoice date. Late payments shall accrue interest at 18% per annum.',
    suggestion: 'Payment is due within thirty (30) days of invoice date. Undisputed amounts not paid when due shall accrue interest at the lesser of 1.5% per month or the maximum rate permitted by applicable law.',
    contextAfter: 'Vendor reserves the right to suspend Services if any undisputed invoice remains unpaid for more than thirty (30) days past the due date.',
    suggestionRationale: 'Shortened payment terms from 60 to 30 days (standard net-30 practice) to improve cash flow. Capped the late interest rate to the lesser of 1.5% per month or the maximum rate permitted by law to avoid usury violations, which can make the entire interest provision unenforceable in some states.',
    fixed: false,
  },
  {
    id: 'c8',
    type: 'Force Majeure',
    risk: 'LOW',
    contextBefore: 'Neither party shall be liable for delays or failures in performance resulting from circumstances beyond its reasonable control.',
    text: 'Force majeure events include acts of God, war, and government actions.',
    suggestion: 'Force majeure events include, without limitation, acts of God, war, terrorism, pandemic, government actions, labor disputes, and failure of third-party infrastructure providers, provided such events are beyond the affected party\'s reasonable control and could not have been prevented by reasonable precautions.',
    contextAfter: 'The affected party shall provide prompt written notice to the other party and shall use commercially reasonable efforts to resume performance as soon as practicable.',
    suggestionRationale: 'Expanded the force majeure definition to include modern risk categories such as terrorism, pandemics, and third-party infrastructure failures (e.g., cloud outages). Added the standard qualifiers requiring the event to be beyond the party\'s control and not preventable by reasonable precautions, which prevents parties from claiming force majeure for foreseeable events.',
    fixed: false,
  },
  {
    id: 'c9',
    type: 'Assignment',
    risk: 'MEDIUM',
    contextBefore: 'This Agreement shall be binding upon and inure to the benefit of the parties and their respective successors and assigns.',
    text: 'Either party may assign this Agreement without the other party\'s consent.',
    suggestion: 'Neither party may assign this Agreement or any of its rights or obligations hereunder without the prior written consent of the other party, which shall not be unreasonably withheld. Notwithstanding the foregoing, either party may assign this Agreement without consent in connection with a merger, acquisition, or sale of all or substantially all of its assets.',
    contextAfter: 'Any purported assignment in violation of this section shall be null and void.',
    suggestionRationale: 'Restricted free assignment by requiring mutual consent, which is standard for services agreements where the identity and capabilities of the contracting party matter. Added the standard M&A carve-out allowing assignment in connection with corporate transactions without requiring consent, which avoids blocking legitimate business reorganizations.',
    fixed: false,
  },
  {
    id: 'c10',
    type: 'Dispute Resolution',
    risk: 'LOW',
    contextBefore: 'The parties agree to resolve any disputes arising under this Agreement in accordance with this Section.',
    text: 'All disputes shall be resolved by litigation in the courts of Delaware.',
    suggestion: 'The parties shall first attempt to resolve any dispute through good-faith negotiation between senior representatives for thirty (30) days. If unresolved, disputes shall be submitted to binding arbitration under AAA Commercial Arbitration Rules in Delaware. Either party may seek injunctive relief in any court of competent jurisdiction to prevent irreparable harm.',
    contextAfter: 'The prevailing party in any arbitration or litigation shall be entitled to recover its reasonable attorneys\' fees and costs.',
    suggestionRationale: 'Added a mandatory 30-day negotiation period before arbitration, which resolves most commercial disputes without formal proceedings. Replaced litigation with AAA arbitration, which is faster, more confidential, and typically less expensive. Preserved the right to seek emergency injunctive relief in court, which is critical for IP and confidentiality violations.',
    fixed: false,
  },
  {
    id: 'c11',
    type: 'Warranties',
    risk: 'MEDIUM',
    contextBefore: 'Vendor represents and warrants to Client that it has the right to enter into this Agreement and to perform the Services.',
    text: 'VENDOR PROVIDES ALL SERVICES "AS IS" AND DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.',
    suggestion: 'Vendor warrants that: (a) the Services will be performed in a professional and workmanlike manner consistent with industry standards; (b) the deliverables will materially conform to the specifications in the applicable Statement of Work for ninety (90) days after delivery; and (c) the Services will not infringe any third-party intellectual property rights.',
    contextAfter: 'Client\'s sole remedy for breach of warranty shall be re-performance of the non-conforming Services or, at Vendor\'s election, a refund of fees paid for the non-conforming Services.',
    suggestionRationale: 'Replaced a blanket "as-is" disclaimer with meaningful baseline warranties: professional workmanship, conformance to specifications for 90 days, and IP non-infringement. These are the minimum warranties a client should require for paid professional services. The "as-is" disclaimer is appropriate for software licenses but is commercially unreasonable for custom services engagements.',
    fixed: false,
  },
];
// ─── Leaderboard mock data ─────────────────────────────────────────

const MOCK_LEADERBOARD = [
  // XP floors (power 1.6, LEVEL_C≈63.1): Lv5≈580, Lv6≈829, Lv8≈1420, Lv10≈2120, Lv27≈11600, Lv29≈13050, Lv34≈17000
  { rank: 1, name: 'Sarah K.',  initials: 'SK', level: 34, totalXp: 17000, weeklyRedlines: 47, isMe: false, note: 'Focus on indemnification and IP clauses — those are where the real risk hides. Always read the definitions section first!' },
  { rank: 2, name: 'James R.',  initials: 'JR', level: 29, totalXp: 13100, weeklyRedlines: 38, isMe: false, note: '' },
  { rank: 3, name: 'Priya M.',  initials: 'PM', level: 27, totalXp: 11600, weeklyRedlines: 31, isMe: false, note: '' },
  { rank: 4, name: 'Nick',      initials: 'NK', level:  6, totalXp:  1000, weeklyRedlines: 12, isMe: true,  note: '' },
  { rank: 5, name: 'Daniel T.', initials: 'DT', level: 10, totalXp:  2150, weeklyRedlines:  9, isMe: false, note: '' },
  { rank: 6, name: 'Emma L.',   initials: 'EL', level:  8, totalXp:  1450, weeklyRedlines:  6, isMe: false, note: '' },
  { rank: 7, name: 'Chris B.',  initials: 'CB', level:  6, totalXp:   920, weeklyRedlines:  4, isMe: false, note: '' },
  { rank: 8, name: 'Aisha N.',  initials: 'AN', level:  5, totalXp:   620, weeklyRedlines:  3, isMe: false, note: '' },
];
const AVATAR_COLORS = ['#0078d4','#107c10','#8764b8','#d4372c','#ca5010','#038387','#744da9'];
const MOCK_CONTRACTS_REVIEWED = 12;
const MOCK_WEEKLY_REDLINES    = 12;
const MOCK_CLAUSES_FIXED      = 87;

// ─── Weekly reset helpers (Monday 12:00 AM PST) ─────────────────────────────
const getPSTWeekKey = (): string => {
  const pst = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const day = pst.getDay(); // 0=Sun,1=Mon…
  const daysBack = day === 0 ? 6 : day - 1;
  const mon = new Date(pst);
  mon.setDate(mon.getDate() - daysBack);
  return `${mon.getFullYear()}-${mon.getMonth()}-${mon.getDate()}`;
};

const getMsUntilReset = (): number => {
  const pst = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  const day = pst.getDay();
  const daysUntil = day === 1 ? 7 : day === 0 ? 1 : 8 - day;
  const next = new Date(pst);
  next.setDate(next.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - pst.getTime();
};

const fmtCountdown = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

const CHAT_DEFAULT = [
  { user: 'James R.',  initials: 'JR', color: '#107c10', text: 'Does anyone have a playbook for US NDA review? Working on one now and want to make sure I\'m not missing anything.', time: '9:08 AM' },
  { user: 'Sarah K.',  initials: 'SK', color: '#0078d4', text: 'Good timing. Mutual disclosure sections are always a pain, especially the residuals clauses.',                        time: '9:11 AM' },
  { user: 'You',       initials: 'ME', color: '#d4372c', text: 'Here you go! Covers all the standard US NDA provisions: mutual, unilateral, term limits, the works.', attachment: { kind: 'playbook', name: 'NDA Review US Standard.docx', content: '' }, time: '9:14 AM' },
  { user: 'James R.',  initials: 'JR', color: '#107c10', text: 'Perfect, exactly what I needed. Thanks Nick! 🙌',                                                                     time: '9:16 AM' },
];

// ─── Pagination ────────────────────────────────────────────────────
const MAX_CLAUSES    = 100;
const ITEMS_PER_PAGE = 10;

// ─── Analysis modes ─────────────────────────────────────────────────

const ANALYZE_MODES = [
  {
    key: 'standard' as const,
    label: 'Standard Review',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5L2 3.5v4c0 2.8 2.2 5 5 5s5-2.2 5-5v-4L7 1.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
        <path d="M4.5 7.2l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    desc: 'AI reviews based on document type & jurisdiction',
  },
  {
    key: 'playbook' as const,
    label: 'Playbook',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="1.5" width="10" height="11" rx="1.25" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M7 1.5v11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        <path d="M3.75 5h2.5M3.75 7.5h2.5M3.75 9.75h1.75" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    desc: "Review against your firm's playbook instructions",
  },
  {
    key: 'golden' as const,
    label: 'Golden Sample',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1.5l1.55 3.6 3.95.55-2.85 2.75.7 3.9L7 10.4l-3.35 1.9.7-3.9L1.5 5.65l3.95-.55L7 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
    desc: 'Extract style from a reference contract and apply it',
  },
  {
    key: 'manual' as const,
    label: 'Manual Directions',
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M9.5 1.5L12.5 4.5L5.5 11.5H2.5V8.5L9.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8.5 2.5L11.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M2.5 9.5h2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      </svg>
    ),
    desc: 'Write your own review instructions for the AI',
  },
];

type AnalyzeMode = typeof ANALYZE_MODES[number]['key'];

// ─── Level system ─────────────────────────────────────────────────
// ~5 years × 2 contracts/day × ~80 XP avg ≈ 300,000 total XP to reach level 200.
// Curve uses power 1.6 — early levels feel rewarding, level 200 is a true grind.

const MAX_LEVEL    = 200;
const TOTAL_XP_MAX = 300_000;
const LEVEL_C      = TOTAL_XP_MAX / Math.pow(MAX_LEVEL - 1, 1.6); // ≈ 63.1

const totalXpForLevel = (lvl: number): number => {
  if (lvl <= 1) return 0;
  return Math.round(LEVEL_C * Math.pow(lvl - 1, 1.6));
};

const getLevelInfo = (xp: number) => {
  let level = 1;
  while (level < MAX_LEVEL && totalXpForLevel(level + 1) <= xp) level++;
  const xpStart = totalXpForLevel(level);
  const xpEnd   = level < MAX_LEVEL ? totalXpForLevel(level + 1) : TOTAL_XP_MAX;
  return { level, xpInLevel: xp - xpStart, xpNeeded: xpEnd - xpStart };
};

const MOCK_BASE_XP = 1000; // starting XP for the demo user (~Level 6, 170/281 to Level 7)

// XP per clause risk level, scaled by contract difficulty (1–5 stars)
const DIFF_XP: Record<number, Record<string, number>> = {
  1: { HIGH: 8,  MEDIUM: 5,  LOW: 2 },
  2: { HIGH: 11, MEDIUM: 7,  LOW: 4 },
  3: { HIGH: 15, MEDIUM: 10, LOW: 5 },
  4: { HIGH: 22, MEDIUM: 14, LOW: 7 },
  5: { HIGH: 30, MEDIUM: 20, LOW: 10 },
};
const DIFF_LABELS: Record<number, string> = {
  1: 'Simple', 2: 'Standard', 3: 'Complex', 4: 'Advanced', 5: 'Expert',
};


// ─── Component ────────────────────────────────────────────────────

const App: React.FC = () => {
  const [contractStars, setContractStars] = useState(3);
  const [clauses, setClauses] = useState(MOCK_CLAUSES);
  const [popup, setPopup] = useState<string | null>(null);
  const [expandedWhy, setExpandedWhy] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [expandedFixedIds, setExpandedFixedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [suggestPrompts, setSuggestPrompts] = useState<Record<string, string>>({});
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [minimizedIds, setMinimizedIds] = useState<Set<string>>(new Set());
  const [commentedIds, setCommentedIds] = useState<Set<string>>(new Set());
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'split' | 'inline'>('split');
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [sortMode, setSortMode] = useState<'document' | 'high-low' | 'low-high'>('document');
  const [currentPage, setCurrentPage] = useState(1);

  // Analysis method
  const [analyzeMode, setAnalyzeMode]             = useState<AnalyzeMode>('standard');
  const [analyzeModeOpen, setAnalyzeModeOpen]     = useState(false);
  const [configCollapsed, setConfigCollapsed]     = useState(false);
  const [topNoteOpen, setTopNoteOpen]             = useState(false);
  const [topNoteEditing, setTopNoteEditing]       = useState(false);
  const [topNoteText, setTopNoteText]             = useState(MOCK_LEADERBOARD[0].note);
  const [bonusXp, setBonusXp]                     = useState(0);
  const [xpToast, setXpToast]                     = useState<{ icon: string; text: string; xp: number } | null>(null);
  const [levelUpModal, setLevelUpModal]           = useState<{ newLevel: number } | null>(null);
  const [levelUpClosing, setLevelUpClosing]       = useState(false);
  const prevLevelRef                              = useRef<number | null>(null);
  const [noteXpClaimed, setNoteXpClaimed]         = useState(() => {
    const last = Number(localStorage.getItem('topNoteXpLastClaimed') ?? 0);
    return Date.now() - last < 24 * 60 * 60 * 1000;
  });
  const [noteCountdown, setNoteCountdown]         = useState('');
  const [chatOpen, setChatOpen]                   = useState(false);
  const [chatInput, setChatInput]                 = useState('');
  const [chatMessages, setChatMessages]           = useState(() => {
    try {
      const saved = localStorage.getItem(`chat_${getPSTWeekKey()}`);
      return saved ? JSON.parse(saved) : CHAT_DEFAULT;
    } catch { return CHAT_DEFAULT; }
  });
  const [weekResetCountdown, setWeekResetCountdown] = useState(() => fmtCountdown(getMsUntilReset()));

  // Persist chat messages to localStorage (weekly key)
  useEffect(() => {
    try { localStorage.setItem(`chat_${getPSTWeekKey()}`, JSON.stringify(chatMessages)); } catch {}
  }, [chatMessages]);

  // Weekly reset countdown
  useEffect(() => {
    const id = setInterval(() => {
      const ms = getMsUntilReset();
      setWeekResetCountdown(fmtCountdown(ms));
      // If reset just happened, clear chat
      if (ms < 1000) {
        setChatMessages(CHAT_DEFAULT);
        localStorage.removeItem(`chat_${getPSTWeekKey()}`);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!noteXpClaimed) return;
    const tick = () => {
      const last = Number(localStorage.getItem('topNoteXpLastClaimed') ?? 0);
      const remaining = Math.max(0, 24 * 60 * 60 * 1000 - (Date.now() - last));
      if (remaining === 0) { setNoteXpClaimed(false); setNoteCountdown(''); return; }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setNoteCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [noteXpClaimed]);

  const [playbookText, setPlaybookText]           = useState('');
  type SavedPlaybook = { id: string; name: string; content: string; uploadedAt: number; pinned: boolean; };
  const [savedPlaybooks, setSavedPlaybooks] = useState<SavedPlaybook[]>(() => {
    try { return JSON.parse(localStorage.getItem('savedPlaybooks') ?? '[]'); } catch { return []; }
  });
  const [activePlaybookId, setActivePlaybookId]   = useState<string | null>(null);
  const [playbookDragOver, setPlaybookDragOver]   = useState(false);
  type SavedSample = { id: string; name: string; content: string; uploadedAt: number; pinned: boolean; };
  const [savedSamples, setSavedSamples] = useState<SavedSample[]>(() => {
    try { return JSON.parse(localStorage.getItem('savedSamples') ?? '[]'); } catch { return []; }
  });
  const [activeSampleId, setActiveSampleId]       = useState<string | null>(null);
  const [sampleDragOver, setSampleDragOver]       = useState(false);
  const [manualDirections, setManualDirections]   = useState('');
  const [stdDocType, setStdDocType]               = useState('');
  const [stdJurisdiction, setStdJurisdiction]     = useState('');
  const [stdPerspective, setStdPerspective]       = useState<'buyer' | 'seller' | 'neutral'>('buyer');
  const [stdStage, setStdStage]                   = useState('');
  const [activeTab, setActiveTab]               = useState<'review' | 'completed' | 'chat'>('review');
  const [leaderboardOpen, setLeaderboardOpen]   = useState(false);
  const [healthCollapsed, setHealthCollapsed]   = useState(false);
  const [clausesCollapsed, setClausesCollapsed] = useState(false);
  const [selectedForApply, setSelectedForApply] = useState<Set<string>>(new Set());

  // ── Button animations & loading ──
  const [analyzeAnimKey,   setAnalyzeAnimKey]   = useState(0);
  const [applyAnimIds,     setApplyAnimIds]      = useState<Set<string>>(new Set());
  const [bulkApplyAnimKey, setBulkApplyAnimKey]  = useState(0);
  const [isAnalyzing,      setIsAnalyzing]       = useState(false);
  const [dotCount,         setDotCount]          = useState(1);

  // ── Profile photo ──
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => localStorage.getItem('profilePhoto'));
  const profileInputRef = useRef<HTMLInputElement>(null);
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProfilePhoto(dataUrl);
      localStorage.setItem('profilePhoto', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // ── AI Chat state ──
  const [aiMessages, setAiMessages]   = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [aiInput, setAiInput]         = useState('');
  const [aiWebSearch, setAiWebSearch] = useState(false);
  const [aiLoading, setAiLoading]     = useState(false);
  const aiChatEndRef                  = useRef<HTMLDivElement>(null);
  const aiAbortCtrlRef                = useRef<AbortController | null>(null);

  // Auto-scroll AI chat to bottom when messages change
  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiLoading]);

  // Reset to page 1 when switching tabs
  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  // Cycle loading dots . → .. → ...
  useEffect(() => {
    if (!isAnalyzing) { setDotCount(1); return; }
    const iv = setInterval(() => setDotCount(d => d >= 3 ? 1 : d + 1), 520);
    return () => clearInterval(iv);
  }, [isAnalyzing]);

  // ── Playbook persistence ──
  useEffect(() => {
    try { localStorage.setItem('savedPlaybooks', JSON.stringify(savedPlaybooks)); } catch {}
  }, [savedPlaybooks]);

  const addPlaybook = (file: File) => {
    if (savedPlaybooks.length >= 30) return;
    if (!/\.(docx?|doc)$/i.test(file.name)) return;
    const name = file.name.replace(/\.(docx?|doc)$/i, '');
    const newPb: SavedPlaybook = { id: `${Date.now()}`, name, content: `[Playbook: ${file.name}]`, uploadedAt: Date.now(), pinned: false };
    setSavedPlaybooks(prev => [...prev, newPb]);
    setPlaybookText(newPb.content);
    setActivePlaybookId(newPb.id);
  };

  const sortedPlaybooks = [...savedPlaybooks].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // ── Golden sample persistence + helpers ──
  useEffect(() => {
    try { localStorage.setItem('savedSamples', JSON.stringify(savedSamples)); } catch {}
  }, [savedSamples]);

  const addSample = (file: File) => {
    if (savedSamples.length >= 30) return;
    if (!/\.(docx?|pdf|txt)$/i.test(file.name)) return;
    const name = file.name.replace(/\.(docx?|pdf|txt)$/i, '');
    const newS: SavedSample = { id: `${Date.now()}`, name, content: `[Sample: ${file.name}]`, uploadedAt: Date.now(), pinned: false };
    setSavedSamples(prev => [...prev, newS]);
    setActiveSampleId(newS.id);
  };

  const sortedSamples = [...savedSamples].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // ── Computed ──
  const deductions = clauses
    .filter(c => !c.fixed)
    .reduce((sum, c) => sum + (c.risk === 'HIGH' ? 5 : c.risk === 'MEDIUM' ? 3 : 1), 0);
  const score = Math.max(0, 100 - deductions);
  const scoreColor = score >= 70 ? '#107c10' : score >= 40 ? '#c19c00' : '#c50f1f';
  const getXp = (risk: string) => DIFF_XP[contractStars][risk] ?? 5;
  const earnedXp   = clauses.filter(c => c.fixed).reduce((s, c) => s + getXp(c.risk), 0);
  const totalXp    = MOCK_BASE_XP + earnedXp + bonusXp;
  const { level, xpInLevel, xpNeeded } = getLevelInfo(totalXp);
  const xpPct      = `${Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))}%`;
  const allResolved = clauses.every(c => c.fixed);
  const issueClauses     = clauses.filter(c => !c.fixed && !ignoredIds.has(c.id));
  const completedClauses = clauses.filter(c => c.fixed || ignoredIds.has(c.id));
  const rawVisible       = activeTab === 'completed' ? completedClauses : issueClauses;
  const visibleClauses   = sortMode === 'high-low'
    ? [...rawVisible].sort((a, b) => (RISK_RANK[a.risk] ?? 9) - (RISK_RANK[b.risk] ?? 9))
    : sortMode === 'low-high'
      ? [...rawVisible].sort((a, b) => (RISK_RANK[b.risk] ?? 9) - (RISK_RANK[a.risk] ?? 9))
      : rawVisible; // 'document' — preserve original order
  const totalPages       = Math.ceil(visibleClauses.length / ITEMS_PER_PAGE);
  const safePage         = Math.min(currentPage, Math.max(1, totalPages));
  const paginatedClauses = visibleClauses.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const xpPotential = clauses.filter(c => !c.fixed && !ignoredIds.has(c.id)).reduce((s, c) => s + getXp(c.risk), 0);
  const scoreGrade  = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  const gradeColor  = score >= 70 ? '#107c10' : score >= 50 ? '#d4a017' : '#c50f1f';
  const highCount   = clauses.filter(c => c.risk === 'HIGH'   && !c.fixed && !ignoredIds.has(c.id)).length;
  const medCount    = clauses.filter(c => c.risk === 'MEDIUM' && !c.fixed && !ignoredIds.has(c.id)).length;
  const lowCount    = clauses.filter(c => c.risk === 'LOW'    && !c.fixed && !ignoredIds.has(c.id)).length;

  // Level-up detection — placed after `level` and `totalXp` are declared to avoid TDZ
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (prevLevelRef.current === null) { prevLevelRef.current = level; return; }
    if (level > prevLevelRef.current) {
      setLevelUpModal({ newLevel: level });
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const myName = MOCK_LEADERBOARD.find(e => e.isMe)?.name ?? 'A teammate';
      setChatMessages(prev => [...prev, {
        user: 'System', initials: '★', color: '#f5a623',
        text: `${myName} reached Level ${level}!`,
        time, isSystem: true,
      } as any]);
    }
    prevLevelRef.current = level;
  }, [level, totalXp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  const sendToChat = (name: string, content: string, kind: 'playbook' | 'sample') => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { user: 'You', initials: 'ME', color: '#d4372c', text: '', attachment: { kind, name, content }, time }]);
    setChatOpen(true);
    showXpToast(kind === 'playbook' ? '📋' : '📄', `"${name}" shared to chat`, 100);
  };

  const closeLevelUpModal = () => {
    setLevelUpClosing(true);
    setTimeout(() => { setLevelUpModal(null); setLevelUpClosing(false); }, 580);
  };

  const showXp = (xp: number) => {
    setPopup(`+${xp} XP`);
    setTimeout(() => setPopup(null), 1200);
  };
  const showXpToast = (icon: string, text: string, xp: number) => {
    setBonusXp(prev => prev + xp);
    setXpToast({ icon, text, xp });
    setTimeout(() => setXpToast(null), 2400);
  };
  const minimizeCard = (id: string) => {
    setMinimizedIds(prev => { const n = new Set(prev); n.add(id); return n; });
  };
  const expandCard = (id: string) => {
    setMinimizedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const fixClause = (id: string) => {
    const clause = clauses.find(c => c.id === id);
    const xp = getXp(clause?.risk ?? 'LOW');
    setClauses(prev => prev.map(c => c.id === id ? { ...c, fixed: true } : c));
    setExpandedWhy(prev => { const n = new Set(prev); n.delete(id); return n; });
    setMinimizedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setSelectedId(prev => prev === id ? null : prev);
    setEditingId(null);
    setSuggestingId(null);
    setSelectedForApply(prev => { const n = new Set(prev); n.delete(id); return n; });
    showXp(xp);
  };

  const unfixClause = (id: string) => {
    setClauses(prev => prev.map(c => c.id === id ? { ...c, fixed: false } : c));
    setExpandedFixedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setActiveTab('review');
  };

  const toggleFixedExpand = (id: string) => {
    setExpandedFixedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleWhy = (id: string) => {
    setExpandedWhy(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectableIds = clauses.filter(c => !c.fixed && !ignoredIds.has(c.id)).map(c => c.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedForApply.has(id));

  const selectAll = () => {
    setSelectedForApply(new Set(selectableIds));
  };

  const unselectAll = () => {
    setSelectedForApply(new Set());
  };

  const ignoreClause = (id: string) => {
    setIgnoredIds(prev => { const n = new Set(prev); n.add(id); return n; });
    setMinimizedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setSelectedId(prev => prev === id ? null : prev);
    setExpandedWhy(prev => { const n = new Set(prev); n.delete(id); return n; });
    if (editingId === id) setEditingId(null);
    if (suggestingId === id) setSuggestingId(null);
  };

  const restoreClause = (id: string) => {
    setIgnoredIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setActiveTab('review');
  };

  const selectClause = (id: string) => {
    const clause = clauses.find(c => c.id === id);
    if (!clause || clause.fixed) return;
    setSelectedId(id);
    locateClauseInDocument(clause.text);
  };

  /** Opens the inline comment-editing panel, pre-filled with the AI rationale. */
  const openComment = (id: string) => {
    const clause = clauses.find(c => c.id === id);
    if (!clause) return;
    const draft = `AI Redline — ${clause.type} (${clause.risk} Risk)\n\n${clause.suggestionRationale}`;
    setCommentDrafts(prev => ({ ...prev, [id]: draft }));
    setCommentingId(id);
    setEditingId(null);
    setSuggestingId(null);
  };

  const cancelComment = () => setCommentingId(null);

  const submitComment = async (id: string) => {
    const clause = clauses.find(c => c.id === id);
    if (!clause) return;
    const body = commentDrafts[id] ?? '';
    await insertClauseComment(clause.text, body);
    setCommentingId(null);
    setCommentedIds(prev => new Set(prev).add(id));
    setTimeout(() => setCommentedIds(prev => { const n = new Set(prev); n.delete(id); return n; }), 2500);
  };

  const startEdit = (id: string) => {
    const clause = clauses.find(c => c.id === id);
    setEditTexts(prev => ({ ...prev, [id]: clause?.suggestion ?? '' }));
    setEditingId(id);
    setSuggestingId(null);
    setCommentingId(null);
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = (id: string) => {
    const newText = editTexts[id] ?? '';
    if (newText.trim()) {
      setClauses(prev => prev.map(c => c.id === id ? { ...c, suggestion: newText } : c));
    }
    setEditingId(null);
  };

  const startSuggest = (id: string) => {
    setSuggestingId(id);
    setEditingId(null);
    setCommentingId(null);
  };
  const cancelSuggest = () => {
    if (suggestingId) {
      setSuggestPrompts(prev => { const n = { ...prev }; delete n[suggestingId]; return n; });
    }
    setSuggestingId(null);
  };
  const sendSuggest = (id: string) => {
    setSuggestingId(null);
    setGeneratingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setGeneratingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      setSuggestPrompts(prev => { const n = { ...prev }; delete n[id]; return n; });
    }, 1200);
  };

  const toggleSelectForApply = (id: string) => {
    setSelectedForApply(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const applySelected = () => {
    const ids = Array.from(selectedForApply);
    if (!ids.length) return;
    const xpEarned = ids.reduce((s, id) => {
      const c = clauses.find(x => x.id === id);
      return s + getXp(c?.risk ?? 'LOW');
    }, 0);
    setClauses(prev => prev.map(c => selectedForApply.has(c.id) ? { ...c, fixed: true } : c));
    setExpandedWhy(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    setMinimizedIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    setSelectedForApply(new Set());
    showXp(xpEarned);
  };

  // ── AI chat send ──
  const sendAiMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;

    // Cancel any in-flight request before starting a new one
    aiAbortCtrlRef.current?.abort();
    const controller = new AbortController();
    aiAbortCtrlRef.current = controller;

    const userMsg = { role: 'user' as const, content: aiInput.trim() };
    const nextMessages = [...aiMessages, userMsg];
    setAiMessages(nextMessages);
    setAiInput('');
    setAiLoading(true);
    try {
      const docContext = clauses
        .map(c => `[${c.risk}] ${c.type}: "${c.text}"\nIssue: ${(c as any).explanation ?? c.suggestionRationale ?? ''}`)
        .join('\n\n');
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, webSearch: aiWebSearch, documentContext: docContext }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = res.status === 429 ? 'Rate limit exceeded — please wait a moment.'
                      : res.status === 401 ? 'Authentication required. Please sign in.'
                      : res.status === 400 ? 'Invalid request. Please try rephrasing.'
                      : `Request failed (${res.status}). Make sure the backend is running.`;
        throw new Error(errText);
      }

      const data: unknown = await res.json();
      // Validate response shape before using it — treat content as plain text only
      const rawContent = (data as Record<string, unknown>)?.content;
      const content = typeof rawContent === 'string' && rawContent.length > 0
        ? rawContent
        : 'No response received.';
      setAiMessages(m => [...m, { role: 'assistant', content }]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return; // cancelled — don't show error
      const msg = err instanceof Error ? err.message : 'Could not reach the AI service. Make sure the backend is running.';
      setAiMessages(m => [...m, { role: 'assistant', content: msg }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={styles.shell}>

      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={styles.headerRow}>
              <p style={styles.headerTitle}>Contract Reviewer</p>
            </div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>
                Level {level}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(245,166,35,0.85)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' as const }}>
                ({xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} experience)
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 3, marginTop: 5, overflow: 'hidden' }}>
              <div style={{ ...styles.xpFill, width: xpPct, boxShadow: '0 0 8px rgba(245,166,35,0.7)' }} />
            </div>
          </div>

          {/* ── Profile avatar ── */}
          <div
            title="Click to change photo"
            onClick={() => profileInputRef.current?.click()}
            style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              border: '2px solid rgba(245,166,35,0.7)',
              overflow: 'hidden', cursor: 'pointer', position: 'relative',
              background: profilePhoto ? '#1a3a6e' : '#f5e6c8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              transition: 'border-color 0.2s',
            }}
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              /* Corgi avatar */
              <svg viewBox="0 0 42 42" width="42" height="42" xmlns="http://www.w3.org/2000/svg">
                {/* Left ear */}
                <ellipse cx="11" cy="16" rx="7.5" ry="10" fill="#c47c1a" transform="rotate(-18 11 16)"/>
                <ellipse cx="11" cy="16.5" rx="4" ry="5.5" fill="#e8a0a0" transform="rotate(-18 11 16.5)"/>
                {/* Right ear */}
                <ellipse cx="31" cy="16" rx="7.5" ry="10" fill="#c47c1a" transform="rotate(18 31 16)"/>
                <ellipse cx="31" cy="16.5" rx="4" ry="5.5" fill="#e8a0a0" transform="rotate(18 31 16.5)"/>
                {/* Head */}
                <ellipse cx="21" cy="24" rx="13.5" ry="12" fill="#e8961e"/>
                {/* Muzzle */}
                <ellipse cx="21" cy="29" rx="7.5" ry="5.5" fill="#f5dba0"/>
                {/* Left eye */}
                <circle cx="16" cy="22" r="2.3" fill="#1a0a00"/>
                <circle cx="16.8" cy="21.2" r="0.75" fill="white"/>
                {/* Right eye */}
                <circle cx="26" cy="22" r="2.3" fill="#1a0a00"/>
                <circle cx="26.8" cy="21.2" r="0.75" fill="white"/>
                {/* Nose */}
                <ellipse cx="21" cy="27" rx="2.2" ry="1.6" fill="#1a0a00"/>
                {/* Smile */}
                <path d="M18.5 30 Q21 32.5 23.5 30" stroke="#1a0a00" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
              </svg>
            )}
            {/* Edit overlay — visible on hover */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.48)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.18s',
              pointerEvents: 'none',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round"/>
                <path d="M8 4l2 2" stroke="#fff" strokeWidth="1.3"/>
              </svg>
            </div>
          </div>
          <input
            ref={profileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleProfilePhotoChange}
          />
        </div>
      </div>

      {/* ── Analyzing Loading Screen ── */}
      {isAnalyzing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: '#FAF8F4',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14,
          animation: 'loadingFadeIn 0.25s ease forwards',
        }}>
          <svg width="200" height="195" viewBox="0 0 200 195" fill="none" xmlns="http://www.w3.org/2000/svg">

            {/* ── Corgi body (behind desk) ── */}
            <ellipse cx="100" cy="172" rx="46" ry="24" fill="#F4A832"/>
            <ellipse cx="100" cy="168" rx="28" ry="15" fill="#FCDFA0"/>

            {/* ── Desk ── */}
            <rect x="5"   y="150" width="190" height="14" rx="4" fill="#B87030"/>
            <rect x="5"   y="150" width="190" height="5"  rx="3" fill="#C88040"/>
            <rect x="14"  y="164" width="13"  height="30" rx="2" fill="#A06025"/>
            <rect x="173" y="164" width="13"  height="30" rx="2" fill="#A06025"/>

            {/* ── Document flat on desk ── */}
            <rect x="20" y="136" width="130" height="16" rx="2" fill="white" stroke="#E4DDD0" strokeWidth="0.8"/>
            <line x1="32" y1="142" x2="138" y2="142" stroke="#D5CEBC" strokeWidth="1.1"/>
            <line x1="32" y1="147" x2="138" y2="147" stroke="#D5CEBC" strokeWidth="1.1"/>
            <line x1="32" y1="152" x2="100" y2="152" stroke="#D5CEBC" strokeWidth="1.1"/>

            {/* ── Left paw — slides across document ── */}
            <g style={{ transformBox: 'fill-box' as any, transformOrigin: 'center', animation: 'corgiPawSlide 2.4s ease-in-out infinite' }}>
              <ellipse cx="58"  cy="145" rx="15"  ry="8"   fill="#F4A832"/>
              <ellipse cx="51"  cy="143" rx="5.5" ry="3.5" fill="#FCDFA0"/>
              <ellipse cx="59"  cy="142" rx="5.5" ry="3.5" fill="#FCDFA0"/>
              <ellipse cx="66"  cy="144" rx="5.5" ry="3.5" fill="#FCDFA0"/>
            </g>

            {/* ── Right paw — static ── */}
            <ellipse cx="148" cy="145" rx="15"  ry="8"   fill="#F4A832"/>
            <ellipse cx="141" cy="143" rx="5.5" ry="3.5" fill="#FCDFA0"/>
            <ellipse cx="149" cy="142" rx="5.5" ry="3.5" fill="#FCDFA0"/>
            <ellipse cx="156" cy="144" rx="5.5" ry="3.5" fill="#FCDFA0"/>

            {/* ── Coffee cup ── */}
            <rect x="163" y="120" width="22" height="30" rx="4" fill="white" stroke="#DFCFB8" strokeWidth="1"/>
            <path d="M185 127 Q193 127 193 135 Q193 143 185 143" stroke="#CEBFAA" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <rect x="163" y="120" width="22" height="9"  rx="4" fill="#BF7530"/>
            <path d="M170 118 Q173 110 170 103" stroke="#C8BAA4" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.65" style={{ animation: 'steamWaft 1.6s ease-in-out infinite' }}/>
            <path d="M178 116 Q181 107 178 100" stroke="#C8BAA4" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.45" style={{ animation: 'steamWaft 1.6s ease-in-out infinite 0.5s' }}/>

            {/* ── Head group (bobs) ── */}
            <g style={{ transformBox: 'fill-box' as any, transformOrigin: 'center bottom', animation: 'corgiHeadBob 2.2s ease-in-out infinite' }}>

              {/* Left ear — rotated ellipse matching profile icon ratio */}
              <ellipse cx="68" cy="57" rx="22" ry="30" fill="#F4A832"  transform="rotate(-18 68 57)"/>
              <ellipse cx="68" cy="57" rx="11" ry="16" fill="#F07060"  transform="rotate(-18 68 57)"/>

              {/* Right ear — mirror */}
              <ellipse cx="132" cy="57" rx="22" ry="30" fill="#F4A832" transform="rotate(18 132 57)"/>
              <ellipse cx="132" cy="57" rx="11" ry="16" fill="#F07060" transform="rotate(18 132 57)"/>

              {/* Head — big & round */}
              <circle cx="100" cy="84" r="44" fill="#F4A832"/>

              {/* Muzzle */}
              <ellipse cx="100" cy="99" rx="28" ry="23" fill="#FCDFA0"/>

              {/* Big cute eyes — no glasses */}
              <circle cx="81"  cy="78" r="12"  fill="white"/>
              <circle cx="119" cy="78" r="12"  fill="white"/>
              {/* Pupils looking down */}
              <circle cx="82"  cy="81" r="8"   fill="#1A0804"/>
              <circle cx="120" cy="81" r="8"   fill="#1A0804"/>
              {/* Main shine */}
              <circle cx="87"  cy="75" r="3.5" fill="white"/>
              <circle cx="125" cy="75" r="3.5" fill="white"/>
              {/* Tiny secondary shine */}
              <circle cx="79"  cy="84" r="1.5" fill="white"/>
              <circle cx="117" cy="84" r="1.5" fill="white"/>

              {/* Nose */}
              <ellipse cx="100" cy="102" rx="7"   ry="5"   fill="#1A0804"/>
              <ellipse cx="97"  cy="100" rx="2.4" ry="1.5" fill="rgba(255,255,255,0.38)"/>

              {/* Cute smile */}
              <path d="M91 109 Q100 117 109 109" stroke="#1A0804" strokeWidth="2.2" fill="none" strokeLinecap="round"/>

              {/* Big rosy blush */}
              <ellipse cx="67"  cy="98" rx="14" ry="9" fill="#FF9999" opacity="0.5"/>
              <ellipse cx="133" cy="98" rx="14" ry="9" fill="#FF9999" opacity="0.5"/>

              {/* Pencil tucked behind left ear */}
              <g transform="rotate(-20,54,44)">
                <rect x="52"  y="44" width="4.5" height="28" rx="1.2" fill="#FFD030"/>
                <polygon points="52,72 56.5,72 54.25,80"         fill="#FFCEA0"/>
                <rect x="52"  y="42" width="4.5" height="4"     rx="0.8" fill="#FF5555"/>
                <rect x="52"  y="69" width="4.5" height="3.5"   fill="#DEDED0"/>
              </g>
            </g>
          </svg>

          {/* Reviewing + cycling dots */}
          <div style={{ fontSize: 16, fontWeight: 700, color: '#5A3D28', letterSpacing: 0.4, fontFamily: 'inherit' }}>
            Reviewing{'.'.repeat(dotCount)}
          </div>
        </div>
      )}

      {/* ── Level-Up Modal ── */}
      {levelUpModal && (
        <div
          onClick={levelUpClosing ? undefined : closeLevelUpModal}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(4, 0, 20, 0.93)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000,
            animation: levelUpClosing
              ? 'lvlOverlayOut 0.58s ease forwards'
              : 'lvlOverlay 0.25s ease forwards',
          }}
        >
          {/* Centering wrapper — holds rays + card */}
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative', width: 300, textAlign: 'center' as const,
              animation: levelUpClosing
                ? 'lvlOut 0.55s cubic-bezier(0.36,0,0.66,-0.56) forwards'
                : 'lvlIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}
          >
            {/* Rotating conic rays */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 560, height: 560, marginLeft: -280, marginTop: -280,
              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,210,0,0.07) 7deg, transparent 14deg, transparent 27deg, rgba(255,210,0,0.05) 34deg, transparent 41deg, transparent 54deg, rgba(255,210,0,0.06) 61deg, transparent 68deg)',
              borderRadius: '50%',
              animation: 'lvlRays 10s linear infinite',
              pointerEvents: 'none', zIndex: 0,
            }} />

            {/* Outer pulse ring */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 340, height: 340, marginLeft: -170, marginTop: -170,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,190,0,0.14) 0%, transparent 68%)',
              animation: 'lvlRing 1.6s ease-in-out infinite alternate',
              pointerEvents: 'none', zIndex: 0,
            }} />

            {/* Floating stars */}
            {([
              { top: -28, left: 28,  size: 18, delay: '0s',    dur: '1.9s' },
              { top: -18, right: 38, size: 13, delay: '0.35s', dur: '2.2s' },
              { top: 50,  left: -8,  size: 10, delay: '0.6s',  dur: '1.7s' },
              { top: 65,  right: -12,size: 16, delay: '0.15s', dur: '2.0s' },
              { bottom: 55, left: 14, size: 11, delay: '0.5s', dur: '2.3s' },
              { bottom: 30, right: 22,size: 20, delay: '0.08s',dur: '1.8s' },
              { top: 130, left: -20, size: 9,  delay: '0.7s',  dur: '2.1s' },
              { top: 120, right: -18,size: 14, delay: '0.25s', dur: '1.95s'},
            ] as any[]).map((s, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: s.top, left: s.left, right: s.right, bottom: s.bottom,
                fontSize: s.size, color: '#FFD700', lineHeight: 1,
                animation: `lvlStar ${s.dur} ease-in-out ${s.delay} infinite alternate`,
                textShadow: '0 0 8px #FFD700, 0 0 16px rgba(255,165,0,0.7)',
                pointerEvents: 'none', zIndex: 1, userSelect: 'none' as const,
              }}>★</div>
            ))}

            {/* ── Card ── */}
            <div style={{
              background: 'linear-gradient(170deg, #1e0d44 0%, #0c0820 55%, #0d1638 100%)',
              borderRadius: 18,
              padding: '30px 28px 24px',
              position: 'relative', zIndex: 2,
              boxShadow: '0 0 0 1.5px #9a6500, 0 0 32px rgba(255,175,0,0.38), 0 0 90px rgba(200,110,0,0.18), inset 0 0 50px rgba(200,140,0,0.04)',
              overflow: 'hidden',
            }}>
              {/* Top shimmer line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,220,80,0.9) 50%, transparent 100%)',
              }} />
              {/* Bottom shimmer line */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,180,0,0.4) 50%, transparent 100%)',
              }} />

              {/* "LEVEL UP" label */}
              <div style={{
                fontSize: 11, fontWeight: 900, letterSpacing: 7,
                textTransform: 'uppercase' as const,
                color: '#FFD700',
                textShadow: '0 0 14px rgba(255,215,0,0.95), 0 0 32px rgba(255,140,0,0.65)',
                marginBottom: 8,
                animation: 'lvlLabelPulse 1.7s ease-in-out infinite alternate',
              }}>
                ✦ Level Up ✦
              </div>

              {/* Level number — gradient text */}
              <div style={{
                fontSize: 104, fontWeight: 900, lineHeight: 0.9,
                background: 'linear-gradient(180deg, #FFFAAA 0%, #FFD700 30%, #FF9500 70%, #CC4E00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text' as any,
                marginBottom: 10, letterSpacing: -4,
                display: 'inline-block',
                filter: 'drop-shadow(0 0 22px rgba(255,180,0,0.75)) drop-shadow(0 6px 16px rgba(0,0,0,0.9))',
                animation: 'lvlNumPop 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.12s both',
              }}>
                {levelUpModal.newLevel}
              </div>

              {/* Career title */}
              <div style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: 2.5,
                textTransform: 'uppercase' as const,
                color: 'rgba(255,215,0,0.65)',
                marginBottom: 22,
                textShadow: '0 0 8px rgba(255,200,0,0.4)',
              }}>
                ✦ {MOCK_LEADERBOARD.find(e => e.isMe)?.name ?? 'You'} ✦
              </div>

              {/* CTA button */}
              <button
                onClick={closeLevelUpModal}
                style={{
                  background: 'linear-gradient(180deg, #2c1a00 0%, #180e00 100%)',
                  color: '#FFD700',
                  border: '1.5px solid #9a6500',
                  borderRadius: 8,
                  padding: '12px 0', fontSize: 11, fontWeight: 900,
                  cursor: 'pointer', width: '100%', letterSpacing: 3,
                  textTransform: 'uppercase' as const,
                  boxShadow: '0 0 14px rgba(255,175,0,0.22), inset 0 1px 0 rgba(255,220,100,0.12)',
                  transition: 'box-shadow 0.15s, filter 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 24px rgba(255,175,0,0.5), inset 0 1px 0 rgba(255,220,100,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 14px rgba(255,175,0,0.22), inset 0 1px 0 rgba(255,220,100,0.12)')}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── XP Toast ── */}
      {xpToast && (
        <div style={{
          position: 'fixed', top: 68, left: '50%', transform: 'translateX(-50%)',
          background: '#0f3460', color: '#fff',
          borderRadius: 20, padding: '7px 14px 7px 11px',
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 12, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          zIndex: 9999, whiteSpace: 'nowrap' as const,
          animation: 'toastIn 2.4s ease forwards',
          pointerEvents: 'none' as const,
        }}>
          <span style={{ fontSize: 15 }}>{xpToast.icon}</span>
          <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{xpToast.text}</span>
          <span style={{
            background: '#107c10', color: '#fff',
            borderRadius: 10, padding: '2px 8px',
            fontSize: 11, fontWeight: 800, marginLeft: 2, flexShrink: 0,
          }}>+{xpToast.xp} XP</span>
        </div>
      )}

      <div style={styles.body}>

        {/* ── Analysis Method ── */}
        <div style={{
          background: '#fff', borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        }}>

          {/* Collapsed summary row */}
          {configCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: '#555' }}>
                  {ANALYZE_MODES.find(m => m.key === analyzeMode)?.icon}
                </span>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#201f1e' }}>
                    {ANALYZE_MODES.find(m => m.key === analyzeMode)?.label}
                  </span>
                  {analyzeMode === 'standard' && (
                    <span style={{ fontSize: 10.5, color: '#888', marginLeft: 6 }}>
                      {stdPerspective === 'buyer' ? 'Buyer' : stdPerspective === 'seller' ? 'Seller' : 'Neutral'}
                      {stdDocType ? ` · ${stdDocType}` : ''}
                      {stdJurisdiction ? ` · ${stdJurisdiction}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <button
                style={{
                  background: 'none', border: '1px solid #d2d0ce', borderRadius: 4,
                  padding: '3px 8px', fontSize: 11, fontWeight: 600, color: '#605e5c',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                }}
                onClick={() => setConfigCollapsed(false)}
              >
                <PencilIcon /> Edit
              </button>
            </div>
          )}

          {/* Section label */}
          {!configCollapsed && (
          <div style={{
            padding: '10px 14px 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: 0.9, textTransform: 'uppercase' as const }}>
              Analysis Method
            </span>
            <button
              onClick={() => setConfigCollapsed(true)}
              title="Minimize"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', lineHeight: 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 5.5L7 9.5L11 5.5" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          )}

          {/* Dropdown trigger */}
          {!configCollapsed && (
          <div style={{ padding: '7px 14px 12px', position: 'relative' }}>
            {analyzeModeOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setAnalyzeModeOpen(false)} />
            )}
            <button
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '9px 12px',
                background: '#f7f6f5', border: '1px solid #e0dedd',
                borderRadius: 6, cursor: 'pointer',
              }}
              onClick={() => setAnalyzeModeOpen(v => !v)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: '#555' }}>
                  {ANALYZE_MODES.find(m => m.key === analyzeMode)?.icon}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#201f1e' }}>
                  {ANALYZE_MODES.find(m => m.key === analyzeMode)?.label}
                </span>
              </div>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"
                   style={{ transform: analyzeModeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                <path d="M1 1l4 4 4-4" stroke="#888" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Dropdown options */}
            {analyzeModeOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% - 4px)', left: 14, right: 14,
                background: '#fff', border: '1px solid #e0dedd',
                borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.13)',
                zIndex: 10, padding: '4px 0',
              }}>
                {ANALYZE_MODES.map(mode => (
                  <button
                    key={mode.key}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      width: '100%', padding: '9px 14px',
                      background: analyzeMode === mode.key ? '#f0f6ff' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left' as const,
                    }}
                    onClick={() => { setAnalyzeMode(mode.key); setAnalyzeModeOpen(false); }}
                  >
                    <span style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0, marginTop: 2, color: analyzeMode === mode.key ? '#0078d4' : '#666' }}>{mode.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 12.5, fontWeight: analyzeMode === mode.key ? 700 : 600,
                        color: analyzeMode === mode.key ? '#0078d4' : '#323130',
                      }}>
                        {mode.label}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#888', marginTop: 2, lineHeight: 1.4 }}>
                        {mode.desc}
                      </div>
                    </div>
                    {analyzeMode === mode.key && (
                      <span style={{ color: '#0078d4', fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* ── Per-mode config panels ── */}

          {/* Playbook */}
          {!configCollapsed && analyzeMode === 'playbook' && (
            <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #f0efee' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#323130', letterSpacing: 0.1 }}>My Playbooks</span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: savedPlaybooks.length >= 30 ? '#c50f1f' : savedPlaybooks.length >= 25 ? '#ca5010' : '#bbb',
                }}>{savedPlaybooks.length} / 30</span>
              </div>

              {/* Empty state */}
              {savedPlaybooks.length === 0 && (
                <div
                  onDragOver={e => { e.preventDefault(); setPlaybookDragOver(true); }}
                  onDragLeave={() => setPlaybookDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setPlaybookDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) addPlaybook(file);
                  }}
                  style={{
                    border: `2px dashed ${playbookDragOver ? '#0078d4' : '#d2d0ce'}`,
                    borderRadius: 8, height: 272, marginBottom: 8,
                    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center' as const,
                    background: playbookDragOver ? '#f0f6ff' : '#faf9f8',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 10, opacity: 0.5 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#323130', marginBottom: 4 }}>
                    Drop a playbook here
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 14 }}>
                    .docx or .doc files only
                  </div>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: '#0078d4', color: '#fff',
                    padding: '7px 20px', borderRadius: 6, cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    Browse files
                    <input
                      type="file" accept=".doc,.docx" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) addPlaybook(e.target.files[0]); }}
                    />
                  </label>
                </div>
              )}

              {/* Populated state */}
              {savedPlaybooks.length > 0 && (
                <>
                  {/* List */}
                  <div style={{
                    background: '#fff',
                    border: '1px solid #edebe9',
                    borderRadius: 8,
                    overflow: 'hidden',
                    marginBottom: 8,
                    ...(sortedPlaybooks.length > 8 ? { maxHeight: 272, overflowY: 'auto' as const } : {}),
                  }}>
                    {sortedPlaybooks.map((pb, idx) => (
                      <div
                        key={pb.id}
                        onClick={() => { setActivePlaybookId(pb.id); setPlaybookText(pb.content); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '9px 10px',
                          background: activePlaybookId === pb.id ? '#eff6ff' : 'transparent',
                          borderLeft: `3px solid ${activePlaybookId === pb.id ? '#0078d4' : 'transparent'}`,
                          borderBottom: idx < sortedPlaybooks.length - 1 ? '1px solid #f3f2f1' : 'none',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                      >
                        {/* Star */}
                        <button
                          onClick={e => { e.stopPropagation(); setSavedPlaybooks(prev => prev.map(p => p.id === pb.id ? { ...p, pinned: !p.pinned } : p)); }}
                          title={pb.pinned ? 'Unstar' : 'Star'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: pb.pinned ? '#f5a623' : '#e0dedd', padding: 0, flexShrink: 0, lineHeight: 1 }}
                        >★</button>
                        {/* Name */}
                        <span style={{
                          flex: 1, fontSize: 12,
                          fontWeight: activePlaybookId === pb.id ? 600 : 400,
                          color: activePlaybookId === pb.id ? '#0050a0' : '#323130',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                        }} title={pb.name}>{pb.name}</span>
                        {/* Active check */}
                        {activePlaybookId === pb.id && (
                          <span style={{ fontSize: 11, color: '#0078d4', fontWeight: 800, flexShrink: 0 }}>✓</span>
                        )}
                        {/* Share to chat */}
                        <button
                          onClick={e => { e.stopPropagation(); sendToChat(pb.name, pb.content, 'playbook'); }}
                          title="Share to chat"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0adab', padding: 0, flexShrink: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M6.5 1.5v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                            <path d="M4 4l2.5-2.5L9 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 8.5v2.5h9V8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {/* Download */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const blob = new Blob([pb.content], { type: 'application/octet-stream' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `${pb.name}.docx`; a.click();
                            URL.revokeObjectURL(url);
                            showXpToast('📋', `"${pb.name}" downloaded`, 100);
                          }}
                          title="Download"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0adab', padding: 0, flexShrink: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M6.5 2v6M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 10.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSavedPlaybooks(prev => prev.filter(p => p.id !== pb.id));
                            if (activePlaybookId === pb.id) { setActivePlaybookId(null); setPlaybookText(''); }
                          }}
                          title="Remove"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#d2d0ce', padding: 0, flexShrink: 0, lineHeight: 1 }}
                        >×</button>
                      </div>
                    ))}
                  </div>

                  {/* Compact add zone */}
                  {savedPlaybooks.length < 30 && (
                    <div
                      onDragOver={e => { e.preventDefault(); setPlaybookDragOver(true); }}
                      onDragLeave={() => setPlaybookDragOver(false)}
                      onDrop={e => {
                        e.preventDefault(); setPlaybookDragOver(false);
                        const file = e.dataTransfer.files[0];
                        if (file) addPlaybook(file);
                      }}
                      style={{
                        border: `1.5px dashed ${playbookDragOver ? '#0078d4' : '#d8d6d4'}`,
                        borderRadius: 7, padding: '7px 12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: playbookDragOver ? '#f0f6ff' : 'transparent',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, color: '#0078d4', fontWeight: 600 }}>
                        + Add playbook
                        <input
                          type="file" accept=".doc,.docx" style={{ display: 'none' }}
                          onChange={e => { if (e.target.files?.[0]) addPlaybook(e.target.files[0]); }}
                        />
                      </label>
                    </div>
                  )}
                </>
              )}

              {/* Active status */}
              {activePlaybookId && (
                <div style={{ fontSize: 10, color: '#107c10', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
                  ✓ Playbook selected · will be used in next analysis
                </div>
              )}
            </div>
          )}

          {/* Golden Sample */}
          {!configCollapsed && analyzeMode === 'golden' && (
            <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #f0efee' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#323130', letterSpacing: 0.1 }}>My Reference Contracts</span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: savedSamples.length >= 30 ? '#c50f1f' : savedSamples.length >= 25 ? '#ca5010' : '#bbb',
                }}>{savedSamples.length} / 30</span>
              </div>

              {/* Empty state */}
              {savedSamples.length === 0 && (
                <div
                  onDragOver={e => { e.preventDefault(); setSampleDragOver(true); }}
                  onDragLeave={() => setSampleDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setSampleDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) addSample(file);
                  }}
                  style={{
                    border: `2px dashed ${sampleDragOver ? '#0078d4' : '#d2d0ce'}`,
                    borderRadius: 8, height: 272, marginBottom: 8,
                    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center' as const,
                    background: sampleDragOver ? '#f0f6ff' : '#faf9f8',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 10, opacity: 0.5 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#323130', marginBottom: 4 }}>
                    Drop a reference contract here
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 14 }}>
                    .docx, .pdf, or .txt files
                  </div>
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: '#0078d4', color: '#fff',
                    padding: '7px 20px', borderRadius: 6, cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    Browse files
                    <input
                      type="file" accept=".docx,.pdf,.txt" style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) addSample(e.target.files[0]); }}
                    />
                  </label>
                </div>
              )}

              {/* Populated state */}
              {savedSamples.length > 0 && (
                <>
                  {/* List */}
                  <div style={{
                    background: '#fff',
                    border: '1px solid #edebe9',
                    borderRadius: 8,
                    overflow: 'hidden',
                    marginBottom: 8,
                    ...(sortedSamples.length > 8 ? { maxHeight: 272, overflowY: 'auto' as const } : {}),
                  }}>
                    {sortedSamples.map((s, idx) => (
                      <div
                        key={s.id}
                        onClick={() => setActiveSampleId(s.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '9px 10px',
                          background: activeSampleId === s.id ? '#eff6ff' : 'transparent',
                          borderLeft: `3px solid ${activeSampleId === s.id ? '#0078d4' : 'transparent'}`,
                          borderBottom: idx < sortedSamples.length - 1 ? '1px solid #f3f2f1' : 'none',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                      >
                        {/* Star */}
                        <button
                          onClick={e => { e.stopPropagation(); setSavedSamples(prev => prev.map(p => p.id === s.id ? { ...p, pinned: !p.pinned } : p)); }}
                          title={s.pinned ? 'Unstar' : 'Star'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: s.pinned ? '#f5a623' : '#e0dedd', padding: 0, flexShrink: 0, lineHeight: 1 }}
                        >★</button>
                        {/* Name */}
                        <span style={{
                          flex: 1, fontSize: 12,
                          fontWeight: activeSampleId === s.id ? 600 : 400,
                          color: activeSampleId === s.id ? '#0050a0' : '#323130',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                        }} title={s.name}>{s.name}</span>
                        {/* Active check */}
                        {activeSampleId === s.id && (
                          <span style={{ fontSize: 11, color: '#0078d4', fontWeight: 800, flexShrink: 0 }}>✓</span>
                        )}
                        {/* Share to chat */}
                        <button
                          onClick={e => { e.stopPropagation(); sendToChat(s.name, s.content, 'sample'); }}
                          title="Share to chat"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0adab', padding: 0, flexShrink: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M6.5 1.5v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                            <path d="M4 4l2.5-2.5L9 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 8.5v2.5h9V8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {/* Download */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            const blob = new Blob([s.content], { type: 'application/octet-stream' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `${s.name}`; a.click();
                            URL.revokeObjectURL(url);
                            showXpToast('📄', `"${s.name}" downloaded`, 100);
                          }}
                          title="Download"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0adab', padding: 0, flexShrink: 0, lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
                        >
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="M6.5 2v6M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 10.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSavedSamples(prev => prev.filter(p => p.id !== s.id));
                            if (activeSampleId === s.id) setActiveSampleId(null);
                          }}
                          title="Remove"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#d2d0ce', padding: 0, flexShrink: 0, lineHeight: 1 }}
                        >×</button>
                      </div>
                    ))}
                  </div>

                  {/* Compact add zone */}
                  {savedSamples.length < 30 && (
                    <div
                      onDragOver={e => { e.preventDefault(); setSampleDragOver(true); }}
                      onDragLeave={() => setSampleDragOver(false)}
                      onDrop={e => {
                        e.preventDefault(); setSampleDragOver(false);
                        const file = e.dataTransfer.files[0];
                        if (file) addSample(file);
                      }}
                      style={{
                        border: `1.5px dashed ${sampleDragOver ? '#0078d4' : '#d8d6d4'}`,
                        borderRadius: 7, padding: '7px 12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: sampleDragOver ? '#f0f6ff' : 'transparent',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, color: '#0078d4', fontWeight: 600 }}>
                        + Add reference contract
                        <input
                          type="file" accept=".docx,.pdf,.txt" style={{ display: 'none' }}
                          onChange={e => { if (e.target.files?.[0]) addSample(e.target.files[0]); }}
                        />
                      </label>
                    </div>
                  )}
                </>
              )}

              {/* Active status */}
              {activeSampleId && (
                <div style={{ fontSize: 10, color: '#107c10', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 3 }}>
                  ✓ Sample selected · will be used in next analysis
                </div>
              )}
            </div>
          )}

          {/* Manual Directions */}
          {!configCollapsed && analyzeMode === 'manual' && (
            <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #f0efee' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#605e5c', marginBottom: 6 }}>
                Describe how to review this contract
              </div>
              <textarea
                style={{ ...styles.inputArea, minHeight: 90 }}
                placeholder={'e.g. "Flag any clause that limits our IP rights. Suggest buyer-friendly rewrites for termination and payment terms."'}
                value={manualDirections}
                onChange={e => setManualDirections(e.target.value)}
              />
            </div>
          )}

          {/* Standard Review */}
          {!configCollapsed && analyzeMode === 'standard' && (
            <div style={{ padding: '12px 14px 14px', borderTop: '1px solid #f0efee', display: 'flex', flexDirection: 'column' as const, gap: 12 }}>

              {/* Perspective — most critical input */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#605e5c', marginBottom: 5 }}>
                  Reviewing on behalf of
                </div>
                <div style={{ display: 'flex', borderRadius: 5, border: '1px solid #d2d0ce', overflow: 'hidden' }}>
                  {([
                    { key: 'buyer',   label: 'Buyer / Client'  },
                    { key: 'seller',  label: 'Seller / Vendor' },
                    { key: 'neutral', label: 'Neutral'         },
                  ] as const).map((opt, i, arr) => (
                    <button
                      key={opt.key}
                      style={{
                        flex: 1, padding: '6px 4px',
                        background: stdPerspective === opt.key ? '#0078d4' : '#fff',
                        color: stdPerspective === opt.key ? '#fff' : '#323130',
                        borderTop: 'none', borderBottom: 'none', borderLeft: 'none',
                        borderRight: i < arr.length - 1 ? '1px solid #d2d0ce' : 'none',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      }}
                      onClick={() => setStdPerspective(opt.key)}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Contract stage */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#605e5c', marginBottom: 5 }}>Contract stage</div>
                <select
                  style={{
                    width: '100%', padding: '6px 8px',
                    border: '1px solid #d2d0ce', borderRadius: 4,
                    fontSize: 12, color: stdStage ? '#323130' : '#888',
                    background: '#fff', cursor: 'pointer',
                    fontFamily: '"Segoe UI", system-ui, sans-serif',
                  }}
                  value={stdStage}
                  onChange={e => setStdStage(e.target.value)}
                >
                  <option value="">Not specified</option>
                  <optgroup label="Initial Draft">
                    <option value="first-ours">First draft (from us)</option>
                    <option value="first-theirs">First draft (from them)</option>
                  </optgroup>
                  <optgroup label="Negotiation">
                    <option value="counter">Counter-draft</option>
                    <option value="counter-late">Late-stage counter (3rd round or later)</option>
                    <option value="near-final">Near-final / pre-execution</option>
                    <option value="execution-copy">Execution copy (final clean version)</option>
                  </optgroup>
                  <optgroup label="Post-Signing">
                    <option value="executed">Executed agreement (compliance review)</option>
                    <option value="amendment">Amendment / Addendum to existing agreement</option>
                    <option value="renewal">Renewal / extension</option>
                    <option value="dispute">Disputed agreement (potential breach)</option>
                  </optgroup>
                  <optgroup label="Internal">
                    <option value="template">Template / precedent review</option>
                  </optgroup>
                </select>
                {stdStage === 'first-theirs' && (
                  <div style={{ marginTop: 5, fontSize: 10.5, color: '#888', lineHeight: 1.45 }}>
                    ⚡ AI will be more aggressive. First drafts from the other side typically favour them heavily.
                  </div>
                )}
                {stdStage === 'counter-late' && (
                  <div style={{ marginTop: 5, fontSize: 10.5, color: '#888', lineHeight: 1.45 }}>
                    ⚡ AI will focus on open issues and flag any new language introduced since the last round.
                  </div>
                )}
                {stdStage === 'near-final' && (
                  <div style={{ marginTop: 5, fontSize: 10.5, color: '#888', lineHeight: 1.45 }}>
                    ⚠ Near-final: AI will flag only material risks and avoid minor stylistic suggestions.
                  </div>
                )}
                {stdStage === 'execution-copy' && (
                  <div style={{ marginTop: 5, fontSize: 10.5, color: '#888', lineHeight: 1.45 }}>
                    🔍 AI will check that no substantive changes were introduced in the final clean copy.
                  </div>
                )}
                {stdStage === 'executed' && (
                  <div style={{ marginTop: 5, fontSize: 10.5, color: '#888', lineHeight: 1.45 }}>
                    📋 AI will summarise key obligations, deadlines, and risk exposure in the signed agreement.
                  </div>
                )}
                {stdStage === 'amendment' && (
                  <div style={{ marginTop: 5, fontSize: 10.5, color: '#888', lineHeight: 1.45 }}>
                    🔗 AI will focus on the proposed changes and their interaction with the underlying agreement.
                  </div>
                )}
                {stdStage === 'renewal' && (
                  <div style={{ marginTop: 5, fontSize: 10.5, color: '#888', lineHeight: 1.45 }}>
                    📅 AI will flag terms that are below current market standard and worth renegotiating at renewal.
                  </div>
                )}
                {stdStage === 'dispute' && (
                  <div style={{ marginTop: 5, fontSize: 10.5, color: '#888', lineHeight: 1.45 }}>
                    ⚖ AI will identify breach risk, notice obligations, cure periods, and dispute resolution triggers.
                  </div>
                )}
                {stdStage === 'template' && (
                  <div style={{ marginTop: 5, fontSize: 10.5, color: '#888', lineHeight: 1.45 }}>
                    🗂 AI will assess whether the template adequately protects your interests across a range of scenarios.
                  </div>
                )}
              </div>

              {/* Document type */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#605e5c', marginBottom: 5 }}>Document type</div>
                <select
                  style={{
                    width: '100%', padding: '6px 8px',
                    border: '1px solid #d2d0ce', borderRadius: 4,
                    fontSize: 12, color: '#323130',
                    background: '#fff', cursor: 'pointer',
                    fontFamily: '"Segoe UI", system-ui, sans-serif',
                  }}
                  value={stdDocType}
                  onChange={e => setStdDocType(e.target.value)}
                >
                  <option value="">Auto-detect</option>
                  <optgroup label="Confidentiality &amp; Data">
                    <option value="nda">Non-Disclosure Agreement (NDA)</option>
                    <option value="dpa">Data Processing Agreement (DPA)</option>
                    <option value="baa">Business Associate Agreement (BAA / HIPAA)</option>
                  </optgroup>
                  <optgroup label="Services &amp; Consulting">
                    <option value="msa">Master Services Agreement (MSA)</option>
                    <option value="services">Professional Services Agreement</option>
                    <option value="consulting">Consulting Agreement</option>
                    <option value="contractor">Independent Contractor Agreement</option>
                    <option value="sow">Statement of Work (SOW)</option>
                    <option value="saas">SaaS / Subscription Agreement</option>
                  </optgroup>
                  <optgroup label="Software &amp; IP">
                    <option value="license">Software License Agreement</option>
                    <option value="api">API / Technology License</option>
                    <option value="transfer">Technology Transfer Agreement</option>
                  </optgroup>
                  <optgroup label="Employment">
                    <option value="employment">Employment Agreement</option>
                    <option value="noncompete">Non-Compete / Non-Solicitation Agreement</option>
                    <option value="severance">Separation / Severance Agreement</option>
                    <option value="offer">Offer Letter</option>
                  </optgroup>
                  <optgroup label="Commercial">
                    <option value="distribution">Distribution Agreement</option>
                    <option value="reseller">Reseller Agreement</option>
                    <option value="supply">Vendor / Supply Agreement</option>
                    <option value="franchise">Franchise Agreement</option>
                    <option value="agency">Agency Agreement</option>
                  </optgroup>
                  <optgroup label="Corporate &amp; M&amp;A">
                    <option value="ma">M&A / Share Purchase Agreement</option>
                    <option value="asset">Asset Purchase Agreement</option>
                    <option value="shareholders">Shareholders Agreement</option>
                    <option value="jv">Joint Venture Agreement</option>
                    <option value="loi">Letter of Intent (LOI) / Term Sheet</option>
                    <option value="operating">LLC Operating Agreement</option>
                  </optgroup>
                  <optgroup label="Finance">
                    <option value="loan">Loan / Credit Agreement</option>
                    <option value="convertible">Convertible Note / SAFE</option>
                    <option value="guarantee">Guarantee Agreement</option>
                    <option value="security">Security / Pledge Agreement</option>
                  </optgroup>
                  <optgroup label="Real Estate">
                    <option value="lease">Lease Agreement</option>
                    <option value="realestate">Real Estate Purchase Agreement</option>
                    <option value="construction">Construction Contract</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="settlement">Settlement Agreement</option>
                    <option value="escrow">Escrow Agreement</option>
                    <option value="government">Government / Public Sector Contract</option>
                  </optgroup>
                </select>
              </div>

              {/* Jurisdiction */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#605e5c', marginBottom: 5 }}>Jurisdiction</div>
                <input
                  type="text"
                  style={{
                    width: '100%', padding: '6px 8px',
                    border: '1px solid #d2d0ce', borderRadius: 4,
                    fontSize: 12, color: '#323130',
                    fontFamily: '"Segoe UI", system-ui, sans-serif',
                    boxSizing: 'border-box' as const, outline: 'none',
                  }}
                  placeholder="e.g. New York, Delaware, California, UK"
                  value={stdJurisdiction}
                  onChange={e => setStdJurisdiction(e.target.value)}
                />
              </div>

            </div>
          )}

          {/* Run Analysis button */}
          {!configCollapsed && (
            <div style={{ padding: '4px 14px 14px' }}>
              <div style={{ position: 'relative' }}>
                {/* Expanding glow ring */}
                <div
                  key={`analyze-ripple-${analyzeAnimKey}`}
                  style={{
                    position: 'absolute', inset: -2, borderRadius: 8,
                    pointerEvents: 'none', zIndex: 0,
                    animation: analyzeAnimKey > 0
                      ? 'analyzeRipple 0.7s cubic-bezier(0.2,0.8,0.4,1) forwards'
                      : 'none',
                  }}
                />
                <button
                  style={{
                    ...styles.btnAnalyze,
                    position: 'relative', zIndex: 1,
                    animation: analyzeAnimKey > 0
                      ? 'analyzePress 0.42s cubic-bezier(0.34,1.56,0.64,1) forwards'
                      : 'none',
                  }}
                  onClick={() => {
                    setAnalyzeAnimKey(k => k + 1);
                    setTimeout(() => {
                      setConfigCollapsed(true);
                      setIsAnalyzing(true);
                      setTimeout(() => setIsAnalyzing(false), 2600);
                    }, 320);
                  }}
                  aria-label="Run AI analysis on contract"
                >
                  Run Analysis
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ── Health Score Card ── */}
        <div style={{ background: '#fff', borderRadius: 8, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' }}>
          {/* Card top row: label + difficulty + XP + collapse toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: healthCollapsed ? 0 : 12 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase' as const }}>
              Contract Health
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!healthCollapsed && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#888', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {[1,2,3,4,5].map(n => (
                      <span
                        key={n}
                        onClick={() => setContractStars(n)}
                        style={{ cursor: 'pointer', fontSize: 13, color: n <= contractStars ? '#d4a017' : '#ddd', lineHeight: 1 }}
                        title={`${n} star — ${DIFF_LABELS[n]}`}
                      >★</span>
                    ))}
                    <span style={{ marginLeft: 2 }}>{DIFF_LABELS[contractStars]}</span>
                  </span>
                  <span style={{ color: '#d2d0ce' }}>·</span>
                  <span style={{ fontSize: 11, color: '#888' }}>
                    <span style={{ fontWeight: 700, color: '#f5a623', fontSize: 13 }}>+{xpPotential} XP</span>
                    {' '}available to earn
                  </span>
                </span>
              )}
              <button
                onClick={() => setHealthCollapsed(c => !c)}
                title={healthCollapsed ? 'Expand' : 'Minimize'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', lineHeight: 1 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: healthCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }}>
                  <path d="M3 5.5L7 9.5L11 5.5" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Main content: gauge + grade + breakdown */}
          {!healthCollapsed && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {/* Gauge */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg width={96} height={96} viewBox="0 0 96 96">
                <circle cx={48} cy={48} r={38} fill="none" stroke="#edebe9" strokeWidth={8} />
                <circle
                  cx={48} cy={48} r={38} fill="none"
                  stroke={scoreColor} strokeWidth={8}
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - score / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 48 48)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s' }}
                />
                <text x={48} y={44} textAnchor="middle" fontSize={22} fontWeight={700} fill={scoreColor}>{score}</text>
                <text x={48} y={59} textAnchor="middle" fontSize={9} fill="#bbb">/ 100</text>
              </svg>
              {/* XP popup */}
              {popup && (
                <div style={{
                  position: 'absolute', top: -6, right: -18,
                  background: '#107c10', color: '#fff',
                  borderRadius: 10, padding: '2px 7px',
                  fontSize: 11, fontWeight: 700,
                  animation: 'fadeUp 1.2s ease forwards',
                  whiteSpace: 'nowrap',
                }}>
                  {popup}
                </div>
              )}
            </div>

            {/* Right side: risk breakdown bars */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
              {[
                { label: 'HIGH',   count: highCount, color: '#c50f1f', maxCount: MOCK_CLAUSES.filter(c => c.risk === 'HIGH').length   },
                { label: 'MEDIUM', count: medCount,  color: '#d4a017', maxCount: MOCK_CLAUSES.filter(c => c.risk === 'MEDIUM').length },
                { label: 'LOW',    count: lowCount,  color: '#038387', maxCount: MOCK_CLAUSES.filter(c => c.risk === 'LOW').length    },
              ].map(({ label, count, color, maxCount }) => (
                <div key={label} style={{ marginBottom: 7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color, letterSpacing: 0.5 }}>{label}</span>
                    <span style={{ fontSize: 10, color: '#888' }}>{count} left</span>
                  </div>
                  <div style={{ height: 5, background: '#edebe9', borderRadius: 3 }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: color,
                      width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Bottom stats bar */}
          {!healthCollapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            marginTop: 14, paddingTop: 12, borderTop: '1px solid #f0efee',
          }}>
            {/* Level — fat, leftmost */}
            <div style={{ flex: '0 0 auto', minWidth: 52, textAlign: 'center' as const }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f5a623', lineHeight: 1, whiteSpace: 'nowrap' as const }}>Lv {level}</div>
              <div style={{ fontSize: 9, color: '#aaa', letterSpacing: 0.3, textTransform: 'uppercase' as const, marginTop: 2 }}>
                {Math.round((xpInLevel / xpNeeded) * 100)}%
              </div>
            </div>

            {/* Leaderboard toggle */}
            <button
              onClick={() => setLeaderboardOpen(o => !o)}
              style={{
                flex: 1, minWidth: 52, textAlign: 'center' as const,
                background: leaderboardOpen ? '#0078d4' : '#f3f2f1',
                borderWidth: '1.5px', borderStyle: 'solid',
                borderColor: leaderboardOpen ? '#0078d4' : '#d2d0ce',
                borderRadius: 7, padding: '6px 4px', cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                boxShadow: leaderboardOpen ? 'none' : '0 1px 3px rgba(0,0,0,0.10)',
                overflow: 'hidden',
              }}
              title="View team leaderboard"
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: leaderboardOpen ? 'rgba(255,255,255,0.85)' : '#d4a017' }}>🏆</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: leaderboardOpen ? '#fff' : '#323130' }}>#4</span>
              </div>
              <div style={{
                fontSize: 9, letterSpacing: 0.3, textTransform: 'uppercase' as const,
                color: leaderboardOpen ? 'rgba(255,255,255,0.8)' : '#605e5c',
                fontWeight: 700, marginTop: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
              }}>
                Leaderboard
              </div>
            </button>

            {/* Top redliner last week — clickable */}
            <button
              onClick={() => {
                const opening = !topNoteOpen;
                setTopNoteOpen(opening);
                setTopNoteEditing(false);
                if (opening) {
                  const LS_KEY = 'topNoteXpLastClaimed';
                  const last = Number(localStorage.getItem(LS_KEY) ?? 0);
                  const now = Date.now();
                  if (now - last >= 24 * 60 * 60 * 1000) {
                    setBonusXp(x => x + 100);
                    showXp(100);
                    localStorage.setItem(LS_KEY, String(now));
                    setNoteXpClaimed(true);
                  }
                }
              }}
              style={{
                flex: 1, minWidth: 52, textAlign: 'center' as const,
                background: topNoteOpen ? '#0078d4' : '#f3f2f1',
                borderWidth: '1.5px', borderStyle: 'solid',
                borderColor: topNoteOpen ? '#0078d4' : '#d2d0ce',
                borderRadius: 7, padding: '6px 4px', cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                boxShadow: topNoteOpen ? 'none' : '0 1px 3px rgba(0,0,0,0.10)',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: topNoteOpen ? '#fff' : '#323130', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🥇 {MOCK_LEADERBOARD[0].name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 1, overflow: 'hidden' }}>
                <span style={{ fontSize: 9, color: topNoteOpen ? 'rgba(255,255,255,0.8)' : '#605e5c', letterSpacing: 0.3, textTransform: 'uppercase' as const, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>Top Last Week</span>
                {!noteXpClaimed && (
                  <span style={{ fontSize: 8, fontWeight: 800, color: topNoteOpen ? 'rgba(255,255,255,0.9)' : '#f5a623', background: topNoteOpen ? 'rgba(255,255,255,0.2)' : '#fff8e1', borderRadius: 4, padding: '0px 4px', letterSpacing: 0.2 }}>+100 XP</span>
                )}
                {noteXpClaimed && (
                  <span style={{ fontSize: 8, color: topNoteOpen ? 'rgba(255,255,255,0.6)' : '#aaa' }}>claimed</span>
                )}
              </div>
            </button>

            {/* Chat button */}
            <button
              onClick={() => setChatOpen(o => !o)}
              style={{
                flex: 1, minWidth: 52, textAlign: 'center' as const,
                background: chatOpen ? '#0078d4' : '#f3f2f1',
                borderWidth: '1.5px', borderStyle: 'solid',
                borderColor: chatOpen ? '#0078d4' : '#d2d0ce',
                borderRadius: 7, padding: '6px 4px', cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                boxShadow: chatOpen ? 'none' : '0 1px 3px rgba(0,0,0,0.10)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: chatOpen ? '#fff' : '#323130' }}>💬</div>
              <div style={{ fontSize: 9, letterSpacing: 0.3, textTransform: 'uppercase' as const, color: chatOpen ? 'rgba(255,255,255,0.8)' : '#605e5c', fontWeight: 700, marginTop: 1 }}>Chat</div>
            </button>

            {/* Total lines fixed */}
            <div style={{ flex: '0 0 auto', minWidth: 52, textAlign: 'center' as const, overflow: 'hidden' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#323130' }}>{MOCK_CLAUSES_FIXED + clauses.filter(c => c.fixed).length}</div>
              <div style={{ fontSize: 9, color: '#aaa', letterSpacing: 0.3, textTransform: 'uppercase' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>Lines Fixed</div>
            </div>
          </div>
          )}

          {/* Top redliner note panel */}
          {!healthCollapsed && topNoteOpen && (
            <div style={{
              marginTop: 10, padding: '10px 12px',
              background: '#f0f6ff', border: '1px solid #cce0f5',
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#0078d4', letterSpacing: 0.3, textTransform: 'uppercase' as const }}>
                    🥇 {MOCK_LEADERBOARD[0].name}'s Note
                  </span>
                  {noteXpClaimed && (
                    <span style={{ fontSize: 9, color: '#888', fontVariantNumeric: 'tabular-nums' as const }}>🕐 {noteCountdown}</span>
                  )}
                  {!noteXpClaimed && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#f5a623', background: '#fff8e1', borderRadius: 4, padding: '1px 5px' }}>+100 XP on open</span>
                  )}
                </div>
                {MOCK_LEADERBOARD[0].isMe && !topNoteEditing && (
                  <button
                    onClick={() => setTopNoteEditing(true)}
                    style={{ background: 'none', border: '1px solid #0078d4', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: '#0078d4', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                )}
                {MOCK_LEADERBOARD[0].isMe && topNoteEditing && (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button
                      onClick={() => setTopNoteEditing(false)}
                      style={{ background: '#0078d4', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setTopNoteText(MOCK_LEADERBOARD[0].note); setTopNoteEditing(false); }}
                      style={{ background: 'none', border: '1px solid #d2d0ce', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: '#605e5c', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {topNoteEditing ? (
                <textarea
                  value={topNoteText}
                  onChange={e => setTopNoteText(e.target.value)}
                  style={{
                    width: '100%', minHeight: 72, fontSize: 12, color: '#323130',
                    border: '1px solid #0078d4', borderRadius: 5, padding: '6px 8px',
                    resize: 'vertical' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const,
                  }}
                />
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: '#323130', lineHeight: 1.5 }}>
                  {topNoteText || <em style={{ color: '#aaa' }}>No note left yet.</em>}
                </p>
              )}
            </div>
          )}
          {/* Chat panel */}
          {!healthCollapsed && chatOpen && (
            <div style={{ marginTop: 10, border: '1px solid #edebe9', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#0078d4', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>💬 Team Chat</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>resets in {weekResetCountdown}</span>
              </div>
              {/* Messages */}
              <div style={{ maxHeight: 200, overflowY: 'auto' as const, padding: '8px 10px', display: 'flex', flexDirection: 'column' as const, gap: 8, background: '#faf9f8' }}>
                {chatMessages.map((msg, i) => {
                  if ((msg as any).isSystem) {
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                          color: '#f5a623', borderRadius: 12, padding: '5px 13px',
                          fontSize: 10.5, fontWeight: 700, letterSpacing: 0.2,
                          border: '1px solid rgba(245,166,35,0.35)',
                          boxShadow: '0 2px 10px rgba(245,166,35,0.18)',
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <span>{msg.text}</span>
                        </div>
                      </div>
                    );
                  }
                  const isMe = msg.user === 'You';
                  const entry = MOCK_LEADERBOARD.find(e => e.name === msg.user);
                  const userLevel = isMe ? level : (entry?.level ?? '?');
                  return (
                    <div key={i} style={{ display: 'flex', gap: 7, flexDirection: isMe ? 'row-reverse' as const : 'row' as const, alignItems: 'flex-start' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: isMe ? '#f5e6c8' : msg.color, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: isMe ? '1.5px solid rgba(245,166,35,0.6)' : 'none' }}>
                        {isMe ? (
                          profilePhoto
                            ? <img src={profilePhoto} alt="me" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <svg viewBox="0 0 42 42" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
                                <ellipse cx="11" cy="16" rx="7.5" ry="10" fill="#c47c1a" transform="rotate(-18 11 16)"/>
                                <ellipse cx="11" cy="16.5" rx="4" ry="5.5" fill="#e8a0a0" transform="rotate(-18 11 16.5)"/>
                                <ellipse cx="31" cy="16" rx="7.5" ry="10" fill="#c47c1a" transform="rotate(18 31 16)"/>
                                <ellipse cx="31" cy="16.5" rx="4" ry="5.5" fill="#e8a0a0" transform="rotate(18 31 16.5)"/>
                                <ellipse cx="21" cy="24" rx="13.5" ry="12" fill="#e8961e"/>
                                <ellipse cx="21" cy="29" rx="7.5" ry="5.5" fill="#f5dba0"/>
                                <circle cx="16" cy="22" r="2.3" fill="#1a0a00"/>
                                <circle cx="16.8" cy="21.2" r="0.75" fill="white"/>
                                <circle cx="26" cy="22" r="2.3" fill="#1a0a00"/>
                                <circle cx="26.8" cy="21.2" r="0.75" fill="white"/>
                                <ellipse cx="21" cy="27" rx="2.2" ry="1.6" fill="#1a0a00"/>
                                <path d="M18.5 30 Q21 32.5 23.5 30" stroke="#1a0a00" strokeWidth="1.1" fill="none" strokeLinecap="round"/>
                              </svg>
                        ) : msg.initials}
                      </div>
                      <div style={{ maxWidth: '72%' }}>
                        {!isMe && <div style={{ fontSize: 9, fontWeight: 700, color: msg.color, marginBottom: 2 }}>{msg.user} <span style={{ color: '#f5a623', fontWeight: 700 }}>Lv {userLevel}</span> <span style={{ color: '#aaa', fontWeight: 400 }}>{msg.time}</span></div>}
                        {isMe && <div style={{ fontSize: 9, fontWeight: 700, color: '#aaa', textAlign: 'right' as const, marginBottom: 2 }}>You <span style={{ color: '#f5a623', fontWeight: 700 }}>Lv {userLevel}</span></div>}
                        <div style={{ background: isMe ? '#0078d4' : '#fff', color: isMe ? '#fff' : '#323130', borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px', padding: msg.attachment && !msg.text ? '6px 8px' : '5px 9px', fontSize: 11, lineHeight: 1.4, boxShadow: '0 1px 2px rgba(0,0,0,0.07)' }}>
                          {msg.text}
                          {(msg as any).attachment && (
                            <div style={{
                              marginTop: msg.text ? 6 : 0,
                              background: isMe ? 'rgba(255,255,255,0.15)' : '#f0f6ff',
                              border: `1px solid ${isMe ? 'rgba(255,255,255,0.3)' : '#c7e0f4'}`,
                              borderRadius: 6, padding: '6px 8px',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                              <span style={{ fontSize: 13, flexShrink: 0 }}>{(msg as any).attachment.kind === 'playbook' ? '📋' : '📄'}</span>
                              <span style={{ flex: 1, fontSize: 10.5, fontWeight: 600, color: isMe ? '#fff' : '#0078d4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                {(msg as any).attachment.name}
                              </span>
                              <button
                                onClick={() => {
                                  const att = (msg as any).attachment;
                                  const blob = new Blob([att.content], { type: 'application/octet-stream' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a'); a.href = url; a.download = att.name; a.click();
                                  URL.revokeObjectURL(url);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: isMe ? 'rgba(255,255,255,0.8)' : '#0078d4', padding: 0, flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}
                                title="Download"
                              >
                                <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                                  <path d="M6.5 2v6M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M2 10.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                        {isMe && <div style={{ fontSize: 9, color: '#aaa', textAlign: 'right' as const, marginTop: 2 }}>{msg.time}</div>}

                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Input */}
              <div style={{ display: 'flex', gap: 6, padding: '7px 10px', borderTop: '1px solid #edebe9', background: '#fff' }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && chatInput.trim()) {
                      const now = new Date();
                      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      setChatMessages(prev => [...prev, { user: 'You', initials: 'ME', color: '#d4372c', text: chatInput.trim(), time }]);
                      setChatInput('');
                    }
                  }}
                  placeholder="Message the team..."
                  style={{ flex: 1, border: '1px solid #d2d0ce', borderRadius: 6, padding: '5px 9px', fontSize: 11, fontFamily: 'inherit', outline: 'none' }}
                />
                <button
                  onClick={() => {
                    if (!chatInput.trim()) return;
                    const now = new Date();
                    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    setChatMessages(prev => [...prev, { user: 'You', initials: 'ME', color: '#d4372c', text: chatInput.trim(), time }]);
                    setChatInput('');
                  }}
                  style={{ background: '#0078d4', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* ── Leaderboard panel (inside health card) ── */}
          {!healthCollapsed && leaderboardOpen && (
            <div style={{ marginTop: 10, borderTop: '1px solid #f0efee', paddingTop: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                <div style={{ fontSize: 10.5, color: '#aaa', textAlign: 'center' as const, marginBottom: 2 }}>
                  Ranked by XP earned this week · resets Mon 12AM PST · {weekResetCountdown}
                </div>
                {/* Rewards banner */}
                <div style={{
                  display: 'flex', alignItems: 'stretch', gap: 0,
                  background: '#fafaf9', border: '1px solid #edebe9',
                  borderRadius: 8, overflow: 'hidden', marginBottom: 4,
                }}>
                  {[
                    { medal: '🥇', place: '1st', reward: '1,000 XP', extra: '+ Shoutout & Note', color: '#d4a017', bg: '#fffbf0' },
                    { medal: '🥈', place: '2nd', reward: '500 XP',   extra: null,                color: '#8a8886', bg: '#fafaf9' },
                    { medal: '🥉', place: '3rd', reward: '250 XP',   extra: null,                color: '#c05f15', bg: '#fafaf9' },
                  ].map(({ medal, place, reward, extra, color, bg }) => (
                    <div key={place} style={{
                      flex: 1, textAlign: 'center' as const, padding: '7px 4px',
                      background: bg, borderRight: place !== '3rd' ? '1px solid #edebe9' : 'none',
                    }}>
                      <div style={{ fontSize: 16 }}>{medal}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color, marginTop: 1 }}>{reward}</div>
                      {extra && <div style={{ fontSize: 8.5, color: '#888', marginTop: 1, lineHeight: 1.3 }}>{extra}</div>}
                    </div>
                  ))}
                </div>
                {MOCK_LEADERBOARD.map(entry => {
                  const avatarColor = AVATAR_COLORS[entry.rank % AVATAR_COLORS.length];
                  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null;
                  return (
                    <div
                      key={entry.rank}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px',
                        background: entry.isMe ? '#eff6ff' : '#fff',
                        borderRadius: 8,
                        boxShadow: entry.isMe
                          ? '0 0 0 1.5px #0078d4, 0 1px 4px rgba(0,0,0,0.06)'
                          : '0 1px 4px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div style={{ width: 24, textAlign: 'center' as const, fontSize: 13, fontWeight: 700, color: '#888', flexShrink: 0 }}>
                        {medal ?? `#${entry.rank}`}
                      </div>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: avatarColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {entry.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: entry.isMe ? 700 : 600,
                          color: entry.isMe ? '#0078d4' : '#201f1e',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                        }}>
                          {entry.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#aaa' }}>
                          Lv {entry.level}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {/* ── Clause list ── */}
        <div style={styles.section}>

          {/* Section header — label + minimize (matches Analysis Method / Contract Health) */}
          <div style={{
            padding: '10px 14px 4px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: 0.9, textTransform: 'uppercase' as const }}>
              Issues
            </span>
            <button
              onClick={() => setClausesCollapsed(c => !c)}
              title={clausesCollapsed ? 'Expand' : 'Minimize'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', display: 'flex', alignItems: 'center', lineHeight: 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: clausesCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }}>
                <path d="M3 5.5L7 9.5L11 5.5" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Tabs + controls — hidden when collapsed */}
          {!clausesCollapsed && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #f0efee', marginBottom: 8 }}>
                  <button
                    style={{
                      background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                      padding: '6px 12px 8px', fontSize: 12, fontWeight: 700,
                      color: activeTab === 'review' ? '#323130' : '#888',
                      borderBottom: activeTab === 'review' ? '2px solid #0078d4' : '2px solid transparent',
                      marginBottom: -2, whiteSpace: 'nowrap' as const,
                    }}
                    onClick={() => setActiveTab('review')}
                  >
                    Issues ({issueClauses.length})
                  </button>
                  <button
                    style={{
                      background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                      padding: '6px 12px 8px', fontSize: 12, fontWeight: 700,
                      color: activeTab === 'completed' ? '#107c10' : '#888',
                      borderBottom: activeTab === 'completed' ? '2px solid #107c10' : '2px solid transparent',
                      marginBottom: -2, whiteSpace: 'nowrap' as const,
                    }}
                    onClick={() => setActiveTab('completed')}
                  >
                    Completed ({completedClauses.length})
                  </button>
                  <button
                    style={{
                      background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer',
                      padding: '6px 12px 8px', fontSize: 12, fontWeight: 700,
                      color: activeTab === 'chat' ? '#7c3aed' : '#888',
                      borderBottom: activeTab === 'chat' ? '2px solid #7c3aed' : '2px solid transparent',
                      marginBottom: -2, whiteSpace: 'nowrap' as const,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                    onClick={() => setActiveTab('chat')}
                  >
                    <span style={{ fontSize: 11 }}>✦</span> Ask AI
                  </button>
                  <div style={{ flex: 1 }} />
                  {/* Controls — only on Issues tab */}
                  {activeTab === 'review' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Unified View dropdown — Layout + Sort Order */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    {viewDropdownOpen && (
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                        onClick={() => setViewDropdownOpen(false)}
                      />
                    )}
                    <button
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 4, minWidth: 80,
                        background: (sortMode !== 'document' || viewMode !== 'split') ? '#fff4e0' : 'transparent',
                        border: `1px solid ${(sortMode !== 'document' || viewMode !== 'split') ? '#d4a017' : '#d2d0ce'}`,
                        fontSize: 10, fontWeight: 700,
                        color: (sortMode !== 'document' || viewMode !== 'split') ? '#a07000' : '#605e5c',
                        cursor: 'pointer', letterSpacing: 0.3,
                        textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
                        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                      }}
                      onClick={() => setViewDropdownOpen(v => !v)}
                    >
                      View
                      <svg width="8" height="5" viewBox="0 0 8 5" fill="none">
                        <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {viewDropdownOpen && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                        background: '#fff', border: '1px solid #e0dedd',
                        borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        minWidth: 186, zIndex: 10,
                        padding: '6px 0',
                      }}>
                        {/* ── Layout section ── */}
                        <div style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                          color: '#aaa', textTransform: 'uppercase' as const,
                          padding: '2px 14px 4px',
                        }}>
                          Layout
                        </div>
                        {([['split', 'Split', 'Original vs. suggested side-by-side'], ['inline', 'Inline', 'Changes shown inline in context']] as [string, string, string][]).map(([key, label, sub]) => (
                          <button
                            key={key}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 8,
                              width: '100%', padding: '6px 14px',
                              background: viewMode === key ? '#f0f6ff' : 'transparent',
                              border: 'none', cursor: 'pointer', textAlign: 'left' as const,
                            }}
                            onClick={() => { setViewMode(key as 'split' | 'inline'); setViewDropdownOpen(false); }}
                          >
                            <span style={{ width: 12, fontSize: 11, color: '#0078d4', flexShrink: 0, marginTop: 1, visibility: viewMode === key ? 'visible' : 'hidden' }}>✓</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: viewMode === key ? 600 : 400, color: viewMode === key ? '#0078d4' : '#323130' }}>{label}</div>
                              <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{sub}</div>
                            </div>
                          </button>
                        ))}

                        {/* ── Divider ── */}
                        <div style={{ height: 1, background: '#f0efee', margin: '6px 0' }} />

                        {/* ── Sort Order section ── */}
                        <div style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
                          color: '#aaa', textTransform: 'uppercase' as const,
                          padding: '2px 14px 4px',
                        }}>
                          Sort Order
                        </div>
                        {([
                          ['document', 'Document Order',       'Top → bottom in Word'],
                          ['high-low', 'Severity: High → Low', 'High risk first'],
                          ['low-high', 'Severity: Low → High', 'Low risk first'],
                        ] as [typeof sortMode, string, string][]).map(([key, label, sub]) => (
                          <button
                            key={key}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 8,
                              width: '100%', padding: '6px 14px',
                              background: sortMode === key ? '#f0f6ff' : 'transparent',
                              border: 'none', cursor: 'pointer', textAlign: 'left' as const,
                            }}
                            onClick={() => { setSortMode(key); setCurrentPage(1); setViewDropdownOpen(false); }}
                          >
                            <span style={{ width: 12, fontSize: 11, color: '#0078d4', flexShrink: 0, marginTop: 1, visibility: sortMode === key ? 'visible' : 'hidden' }}>✓</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: sortMode === key ? 600 : 400, color: sortMode === key ? '#0078d4' : '#323130' }}>{label}</div>
                              <div style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{sub}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Select all / Unselect all */}
                  <button
                    style={styles.btnApplyAll}
                    onClick={allSelected ? unselectAll : selectAll}
                    aria-label={allSelected ? 'Unselect all clauses' : 'Select all clauses for bulk apply'}
                  >
                    {allSelected ? 'Unselect All' : 'Select All'}
                  </button>
                  {/* Apply selected button */}
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <div
                      key={`bulk-ripple-${bulkApplyAnimKey}`}
                      style={{
                        position: 'absolute', inset: -2, borderRadius: 5,
                        pointerEvents: 'none', zIndex: 0,
                        animation: bulkApplyAnimKey > 0
                          ? 'bulkApplyRipple 0.6s cubic-bezier(0.2,0.8,0.4,1) forwards'
                          : 'none',
                      }}
                    />
                    <button
                      style={{
                        position: 'relative', zIndex: 1,
                        background: selectedForApply.size > 0 ? '#0078d4' : '#c8c6c4',
                        color: '#fff', border: 'none',
                        borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700,
                        cursor: selectedForApply.size > 0 ? 'pointer' : 'default',
                        letterSpacing: 0.3, minWidth: 64, textAlign: 'center' as const,
                        textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
                        animation: bulkApplyAnimKey > 0
                          ? 'bulkApplyStamp 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards'
                          : 'none',
                      }}
                      onClick={() => {
                        if (!selectedForApply.size) return;
                        setBulkApplyAnimKey(k => k + 1);
                        setTimeout(() => applySelected(), 200);
                      }}
                      aria-label={`Apply ${selectedForApply.size} selected clause${selectedForApply.size === 1 ? '' : 's'}`}
                      aria-disabled={selectedForApply.size === 0}
                    >
                      Apply {selectedForApply.size}
                    </button>
                  </div>
                    </div>
                  )}
            </div>
          </div>
          )}

          {/* ── AI Chat tab ── */}
          {!clausesCollapsed && activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, height: 500, border: '1px solid #f0efee', borderRadius: 8, overflow: 'hidden', margin: '0 0 12px' }}>

              {/* Chat toolbar: context chips + web search toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#faf9f8', borderBottom: '1px solid #f0efee', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 10, background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '2px 8px', fontWeight: 600, letterSpacing: 0.2 }}>📄 Contract</span>
                  <span style={{ fontSize: 10, background: '#f0fdf4', color: '#166534', borderRadius: 20, padding: '2px 8px', fontWeight: 600, letterSpacing: 0.2 }}>📋 Playbook</span>
                  <span style={{ fontSize: 10, background: '#fff7ed', color: '#9a3412', borderRadius: 20, padding: '2px 8px', fontWeight: 600, letterSpacing: 0.2 }}>✦ Golden Samples</span>
                </div>
                {/* Web search toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: '#888', fontWeight: 600, letterSpacing: 0.2 }}>Web</span>
                  <button
                    onClick={() => setAiWebSearch(v => !v)}
                    title={aiWebSearch ? 'Web search ON' : 'Web search OFF'}
                    style={{
                      position: 'relative', width: 34, height: 19, borderRadius: 10,
                      background: aiWebSearch ? '#7c3aed' : '#d2d0ce',
                      border: 'none', cursor: 'pointer', padding: 0,
                      transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2.5, left: aiWebSearch ? 17 : 2.5,
                      width: 14, height: 14, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto' as const, padding: '14px 14px 6px', display: 'flex', flexDirection: 'column' as const, gap: 12, background: '#fff' }}>
                {/* Hardcoded greeting */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: -0.5 }}>AI</div>
                  <div style={{ background: '#f3f2f1', borderRadius: '12px 12px 12px 2px', padding: '9px 13px', fontSize: 12, lineHeight: 1.55, color: '#323130', maxWidth: '82%' }}>
                    Hi! I have full context of this contract, your playbooks, and golden samples. Ask me anything: clause explanations, risk analysis, negotiation strategy, or market-standard comparisons.
                  </div>
                </div>

                {aiMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' as const : 'row' as const, alignItems: 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: -0.5 }}>AI</div>
                    )}
                    <div style={{
                      maxWidth: '82%',
                      background: msg.role === 'user' ? '#7c3aed' : '#f3f2f1',
                      color: msg.role === 'user' ? '#fff' : '#323130',
                      borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      padding: '9px 13px', fontSize: 12, lineHeight: 1.55,
                      whiteSpace: 'pre-wrap' as const,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {aiLoading && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: -0.5 }}>AI</div>
                    <div style={{ background: '#f3f2f1', borderRadius: '12px 12px 12px 2px', padding: '9px 13px', fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', animation: 'pulse 1.2s infinite' }}>●</span>
                      <span style={{ display: 'inline-block', animation: 'pulse 1.2s 0.2s infinite' }}>●</span>
                      <span style={{ display: 'inline-block', animation: 'pulse 1.2s 0.4s infinite' }}>●</span>
                    </div>
                  </div>
                )}
                <div ref={aiChatEndRef} />
              </div>

              {/* Input bar */}
              <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #f0efee', background: '#fff', flexShrink: 0 }}>
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } }}
                  placeholder="Ask about clauses, risks, negotiation strategy…"
                  style={{ flex: 1, border: '1px solid #d2d0ce', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontFamily: 'inherit', outline: 'none', color: '#323130' }}
                />
                <button
                  onClick={sendAiMessage}
                  disabled={!aiInput.trim() || aiLoading}
                  style={{
                    padding: '0 14px', height: 34, borderRadius: 8, border: 'none',
                    background: aiInput.trim() && !aiLoading ? '#7c3aed' : '#e0dedd',
                    color: aiInput.trim() && !aiLoading ? '#fff' : '#aaa',
                    cursor: aiInput.trim() && !aiLoading ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                >
                  Send
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1.5 6.5h10M7 2l4.5 4.5L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* ── Review / Completed tab: cards + pagination ── */}
          {!clausesCollapsed && (activeTab === 'review' || activeTab === 'completed') && (<>
          {paginatedClauses.map(clause => {
            const isIgnored    = ignoredIds.has(clause.id);
            const isMinimized  = minimizedIds.has(clause.id);
            const isSelected   = selectedId === clause.id;
            const isEditing    = editingId === clause.id;
            const isSuggesting = suggestingId === clause.id;
            const isCommenting = commentingId === clause.id;
            const isGenerating = generatingIds.has(clause.id);
            const isWhyOpen    = expandedWhy.has(clause.id);
            const isFixedExpanded = expandedFixedIds.has(clause.id);
            const borderColor  = clause.fixed ? '#107c10' : (RISK_COLOR[clause.risk] ?? '#c8c6c4');

            return (
              <div
                key={clause.id}
                style={{
                  ...styles.clauseCard,
                  borderLeft: isIgnored ? '4px solid #d6d4d2' : `4px solid ${borderColor}`,
                  boxShadow: selectedForApply.has(clause.id)
                    ? '0 0 0 2px #0078d4, 0 2px 8px rgba(0,120,212,0.15)'
                    : isSelected && !clause.fixed
                      ? '0 0 0 2px #0078d4, 0 2px 8px rgba(0,120,212,0.12)'
                      : styles.clauseCard.boxShadow,
                }}
                onClick={() => { if (!clause.fixed && !isIgnored) selectClause(clause.id); }}
              >
                {/* ── Card header ── */}
                {isIgnored ? (
                  /* Compact ignored strip */
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 12px', background: '#faf9f8',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '1px 6px', borderRadius: 10,
                        fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3,
                        color: '#b0aeac', background: '#edebe9',
                        textTransform: 'uppercase' as const, flexShrink: 0,
                      }}>{clause.risk}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#b0aeac' }}>{clause.type}</span>
                      <span style={{ fontSize: 11, color: '#c8c6c4', fontStyle: 'italic' as const }}>· Ignored</span>
                    </div>
                    <button
                      style={{
                        padding: '2px 8px', background: 'transparent',
                        border: '1px solid #d2d0ce', borderRadius: 4,
                        fontSize: 10, fontWeight: 700, color: '#605e5c',
                        cursor: 'pointer', letterSpacing: 0.3,
                        textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
                      }}
                      onClick={e => { e.stopPropagation(); restoreClause(clause.id); }}
                    >
                      Restore
                    </button>
                  </div>
                ) : (
                  /* Normal / Fixed card header */
                  <div style={{
                    ...styles.cardHeader,
                    background: clause.fixed ? '#f6fef6' : 'transparent',
                  }}>
                    <div style={styles.cardHeaderLeft}>
                      {!clause.fixed && !isIgnored && (
                        <button
                          style={{
                            width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                            border: selectedForApply.has(clause.id) ? '2px solid #0078d4' : '2px solid #c8c6c4',
                            background: selectedForApply.has(clause.id) ? '#0078d4' : '#fff',
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            padding: 0,
                          }}
                          onClick={e => { e.stopPropagation(); toggleSelectForApply(clause.id); }}
                          title="Select for bulk apply"
                        >
                          {selectedForApply.has(clause.id) && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      )}
                      {clause.fixed
                        ? <FixedIcon />
                        : <span style={riskBadgeStyle(clause.risk)}>{clause.risk}</span>
                      }
                      <span style={styles.cardTitle}>{clause.type}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                         onClick={e => e.stopPropagation()}>
                      {clause.fixed ? (
                        <>
                          <button style={styles.btnUndo} onClick={() => unfixClause(clause.id)}>
                            ↩ Undo
                          </button>
                          <button style={styles.btnMinimize}
                            title={isFixedExpanded ? 'Collapse' : 'Expand'}
                            onClick={() => toggleFixedExpand(clause.id)}>
                            {isFixedExpanded ? <MinimizeIcon /> : <ExpandIcon />}
                          </button>
                        </>
                      ) : (
                        <button
                          style={styles.btnMinimize}
                          title={isMinimized ? 'Expand' : 'Collapse'}
                          onClick={() => isMinimized ? expandCard(clause.id) : minimizeCard(clause.id)}
                        >
                          {isMinimized ? <ExpandIcon /> : <MinimizeIcon />}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Fixed card: applied revision (expandable) ── */}
                {clause.fixed && isFixedExpanded && (
                  <div style={{ borderTop: '1px solid #f0efee', overflow: 'hidden' }}>
                    <div style={{ padding: '5px 14px 5px 28px', background: '#f7f6f5', color: '#a8a6a4', fontSize: 11.5, lineHeight: 1.6, fontStyle: 'italic' as const, borderBottom: '1px solid #edebe9' }}>
                      {clause.contextBefore}
                    </div>
                    <div style={{ position: 'relative', padding: '8px 14px 8px 28px', background: '#f0faf0', color: '#1b4f1e', fontSize: 12, lineHeight: 1.65 }}>
                      <span style={{ position: 'absolute', left: 10, top: 8, color: '#107c10', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>+</span>
                      {clause.suggestion}
                    </div>
                    <div style={{ padding: '5px 14px 5px 28px', background: '#f7f6f5', color: '#a8a6a4', fontSize: 11.5, lineHeight: 1.6, fontStyle: 'italic' as const, borderTop: '1px solid #edebe9' }}>
                      {clause.contextAfter}
                    </div>
                  </div>
                )}
                {/* ── Active card body ── */}
                {!clause.fixed && !isIgnored && !isMinimized && (
                  <div onClick={e => e.stopPropagation()}>

                    {/* Default view: Unified diff block */}
                    {!isEditing && !isSuggesting && !isCommenting && (
                      <>
                        {/* ── Split view ── */}
                        {viewMode === 'split' && (
                          <div style={{ borderTop: '1px solid #f0efee', overflow: 'hidden' }}>
                            {/* Context before */}
                            <div style={{
                              padding: '5px 14px 5px 28px',
                              background: '#f7f6f5', color: '#a8a6a4',
                              fontSize: 11.5, lineHeight: 1.6,
                              fontStyle: 'italic' as const,
                              borderBottom: '1px solid #edebe9',
                            }}>
                              {clause.contextBefore}
                            </div>
                            {/* Removed line */}
                            <div style={{
                              position: 'relative',
                              padding: '8px 14px 8px 28px',
                              background: '#fff5f5', color: '#82071e',
                              fontSize: 12, lineHeight: 1.65,
                              borderBottom: '1px solid #f5c2c7',
                            }}>
                              <span style={{ position: 'absolute', left: 10, top: 8, color: '#c50f1f', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>−</span>
                              {clause.text}
                            </div>
                            {/* Added line */}
                            <div style={{
                              position: 'relative',
                              padding: '8px 14px 8px 28px',
                              background: '#f0faf0', color: '#1b4f1e',
                              fontSize: 12, lineHeight: 1.65,
                              borderBottom: '1px solid #edebe9',
                            }}>
                              <span style={{ position: 'absolute', left: 10, top: 8, color: '#107c10', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>+</span>
                              {clause.suggestion}
                            </div>
                            {/* Context after */}
                            <div style={{
                              padding: '5px 14px 5px 28px',
                              background: '#f7f6f5', color: '#a8a6a4',
                              fontSize: 11.5, lineHeight: 1.6,
                              fontStyle: 'italic' as const,
                            }}>
                              {clause.contextAfter}
                            </div>
                          </div>
                        )}

                        {/* ── Inline view ── */}
                        {viewMode === 'inline' && (
                          <div style={{ borderTop: '1px solid #f0efee', overflow: 'hidden' }}>
                            {/* Single unified paragraph — red/green highlights match split view */}
                            <div style={{
                              padding: '9px 14px',
                              background: '#f7f6f5',
                              fontSize: 12, lineHeight: 1.85,
                            }}>
                              <span style={{ color: '#a8a6a4', fontStyle: 'italic' as const }}>
                                {clause.contextBefore}{' '}
                              </span>
                              <span style={{
                                color: '#82071e',
                                background: '#fff5f5',
                                textDecoration: 'line-through',
                                textDecorationColor: '#c50f1f',
                                textDecorationThickness: '0.8px',
                                padding: '1px 0',
                              }}>
                                {clause.text}
                              </span>
                              {' '}
                              <span style={{
                                color: '#1b4f1e',
                                background: '#f0faf0',
                                padding: '1px 0',
                              }}>
                                {clause.suggestion}
                              </span>
                              <span style={{ color: '#a8a6a4', fontStyle: 'italic' as const }}>
                                {' '}{clause.contextAfter}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Explain panel */}
                        {isWhyOpen && (
                          <div style={{ padding: '10px 14px 2px' }}>
                            <div style={styles.whyPanel}>
                              <strong>Suggestion Rationale:</strong> {clause.suggestionRationale}
                            </div>
                          </div>
                        )}
                        {/* Toolbar */}
                        <div style={styles.cardToolbar}>
                          {isGenerating ? (
                            <div style={styles.generating}>
                              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
                                   style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                                <circle cx="7" cy="7" r="5.5" stroke="#bbb" strokeWidth="2"
                                        strokeDasharray="8 18" strokeLinecap="round"/>
                              </svg>
                              Generating…
                            </div>
                          ) : (
                            <>
                              <div />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <button style={explainBtnStyle(isWhyOpen)} onClick={() => toggleWhy(clause.id)}>
                                  Explain
                                </button>
                                <button style={styles.btnSmall} onClick={() => startEdit(clause.id)}>
                                  Edit
                                </button>
                                <button style={styles.btnSmall} onClick={() => startSuggest(clause.id)}>
                                  Suggest
                                </button>
                                <button
                                  title="Add an editable comment to the Word document explaining why this change is needed"
                                  onClick={() => openComment(clause.id)}
                                  style={{
                                    ...styles.btnSmall,
                                    ...(commentedIds.has(clause.id) ? {
                                      background: '#dff6dd', border: '1px solid #107c10', color: '#107c10',
                                    } : {}),
                                  }}
                                >
                                  {commentedIds.has(clause.id) ? (
                                    <>
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                                        <path d="M1.5 5l2.5 2.5 4.5-5" stroke="#107c10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      Inserted
                                    </>
                                  ) : (
                                    <>
                                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                                        <path d="M1 1.5h8M1 4h6M1 6.5h5M2 9.5l1.5-2h5.5V1H1v8.5z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                      Comment
                                    </>
                                  )}
                                </button>
                                <button
                                  style={styles.btnSmall}
                                  onClick={() => ignoreClause(clause.id)}
                                  aria-label={`Ignore ${clause.type} clause`}
                                >
                                  Ignore
                                </button>
                                <button
                                  style={{
                                    ...styles.btnApply,
                                    animation: applyAnimIds.has(clause.id)
                                      ? 'applyStamp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards'
                                      : 'none',
                                  }}
                                  onClick={() => {
                                    setApplyAnimIds(prev => new Set(prev).add(clause.id));
                                    setTimeout(() => fixClause(clause.id), 210);
                                    setTimeout(() => setApplyAnimIds(prev => { const n = new Set(prev); n.delete(clause.id); return n; }), 420);
                                  }}
                                  aria-label={`Apply redline to ${clause.type} clause`}
                                >
                                  Apply
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── Edit mode ── */}
                    {isEditing && (
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{
                          marginBottom: 8, padding: '8px 10px',
                          background: '#faf9f8', border: '1px solid #e8e6e3',
                          borderRadius: 5,
                        }}>
                          <div style={{ ...styles.microLabel, color: '#bbb' }}>Original</div>
                          <div style={{ fontSize: 12, color: '#605e5c', lineHeight: 1.65 }}>
                            {clause.text}
                          </div>
                        </div>
                        <textarea
                          style={{ ...styles.inputArea, minHeight: 90 }}
                          value={editTexts[clause.id] ?? clause.suggestion}
                          onChange={e => setEditTexts(prev => ({ ...prev, [clause.id]: e.target.value }))}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                        <div style={styles.twoBtn}>
                          <button style={styles.btnCancelSm} onClick={cancelEdit}>Cancel</button>
                          <button style={styles.btnSave} onClick={() => saveEdit(clause.id)}>Save</button>
                        </div>
                      </div>
                    )}
                    {/* ── Suggest mode ── */}
                    {isSuggesting && (
                      <div style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                        {/* Context block — original clause with 1 line before/after */}
                        <div style={{
                          marginBottom: 9, padding: '8px 10px',
                          background: '#faf9f8', border: '1px solid #e8e6e3',
                          borderRadius: 5,
                        }}>
                          <div style={{ ...styles.microLabel, color: '#bbb', marginBottom: 5 }}>Context</div>
                          {clause.contextBefore && (
                            <div style={{
                              fontSize: 11, color: '#b0aeac', fontStyle: 'italic',
                              lineHeight: 1.55, marginBottom: 5,
                              overflow: 'hidden', display: '-webkit-box',
                              WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const,
                            }}>
                              {clause.contextBefore}
                            </div>
                          )}
                          <div style={{
                            fontSize: 12, color: '#323130', lineHeight: 1.6,
                            borderLeft: '2px solid #c8c6c4', paddingLeft: 8,
                            margin: '2px 0',
                          }}>
                            {clause.text}
                          </div>
                          {clause.contextAfter && (
                            <div style={{
                              fontSize: 11, color: '#b0aeac', fontStyle: 'italic',
                              lineHeight: 1.55, marginTop: 5,
                              overflow: 'hidden', display: '-webkit-box',
                              WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const,
                            }}>
                              {clause.contextAfter}
                            </div>
                          )}
                        </div>
                        <textarea
                          style={{ ...styles.inputArea, background: '#fafafa', minHeight: 52 }}
                          placeholder='Describe what to change, e.g. "Make this more buyer-friendly" or "Add a cure period"'
                          value={suggestPrompts[clause.id] ?? ''}
                          onChange={e => setSuggestPrompts(prev => ({ ...prev, [clause.id]: e.target.value }))}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                        <div style={styles.twoBtn}>
                          <button style={styles.btnCancelSm} onClick={cancelSuggest}>Cancel</button>
                          <button style={styles.btnSend} onClick={() => sendSuggest(clause.id)}>Send</button>
                        </div>
                      </div>
                    )}

                    {/* ── Comment edit mode ── */}
                    {isCommenting && (
                      <div style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                        {/* Header row */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          marginBottom: 8,
                        }}>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
                            <path d="M1 1.5h11M1 4h9M1 6.5h7.5M2 12l2-3h7.5V1H1v11z"
                              stroke="#0078d4" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#0078d4', letterSpacing: 0.1 }}>
                            Word Comment
                          </span>
                          <span style={{ fontSize: 10, color: '#999', marginLeft: 2 }}>
                            — edit before inserting into the document
                          </span>
                        </div>

                        {/* Editable textarea with pre-filled AI rationale */}
                        <textarea
                          style={{
                            ...styles.inputArea,
                            minHeight: 100,
                            background: '#f7f9fd',
                            border: '1px solid #b3ccec',
                            lineHeight: 1.6,
                            fontSize: 11.5,
                          }}
                          value={commentDrafts[clause.id] ?? ''}
                          onChange={e => setCommentDrafts(prev => ({ ...prev, [clause.id]: e.target.value }))}
                          autoFocus
                          spellCheck
                        />

                        {/* Helper caption */}
                        <div style={{
                          fontSize: 10, color: '#888', marginTop: -3, marginBottom: 8,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <circle cx="5" cy="5" r="4.25" stroke="#aaa" strokeWidth="1.1"/>
                            <rect x="4.375" y="4.2" width="1.25" height="3.1" rx="0.4" fill="#aaa"/>
                            <circle cx="5" cy="3" r="0.6" fill="#aaa"/>
                          </svg>
                          This comment will be visible to all reviewers in the document
                        </div>

                        {/* Action buttons */}
                        <div style={styles.twoBtn}>
                          <button style={styles.btnCancelSm} onClick={cancelComment}>
                            Cancel
                          </button>
                          <button
                            style={{
                              ...styles.btnSave,
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                            }}
                            onClick={() => submitComment(clause.id)}
                          >
                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                              <path d="M1 1.5h9M1 3.8h7M1 6.1h5.5M2 10l1.8-2.5h5.7V1H1v9z"
                                stroke="#fff" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Insert into Word
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 0 2px' }}>
              <button
                style={{ ...styles.paginationBtn, opacity: safePage === 1 ? 0.35 : 1, cursor: safePage === 1 ? 'default' : 'pointer' }}
                disabled={safePage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >←</button>
              <span style={{ fontSize: 12, color: '#605e5c', fontWeight: 600, minWidth: 60, textAlign: 'center' as const }}>
                {safePage} / {totalPages}
              </span>
              <button
                style={{ ...styles.paginationBtn, opacity: safePage === totalPages ? 0.35 : 1, cursor: safePage === totalPages ? 'default' : 'pointer' }}
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >→</button>
            </div>
          )}
          </>)}

        </div>
        {/* ── Completion screen ── */}
        {allResolved && (
          <>
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 8 }}>
                <circle cx="24" cy="24" r="24" fill="#107c10" />
                <path d="M13 24l8 8 14-17" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#107c10' }}>All clauses resolved</div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>+105 XP earned this session</div>
            </div>
            <button
              style={styles.btnAnalyze}
              onClick={() => {
                setClauses(MOCK_CLAUSES);
                setExpandedWhy(new Set());
                setSelectedId(null);
                setIgnoredIds(new Set());
                setMinimizedIds(new Set());
                setCurrentPage(1);
                setEditingId(null);
                setSuggestingId(null);
                setGeneratingIds(new Set());
                setSuggestPrompts({});
                setEditTexts({});
                setExpandedFixedIds(new Set());
                setSelectedForApply(new Set());
                setConfigCollapsed(false);
              }}
            >
              Analyze New Contract
            </button>
          </>
        )}

      </div>

      <style>{`
        @keyframes fadeUp {
          0%   { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes toastIn {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          10%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          78%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        }
        @keyframes levelUpIn {
          0%   { opacity: 0; transform: scale(0.72) translateY(16px); }
          60%  { opacity: 1; transform: scale(1.04) translateY(-3px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes lvlOverlay {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes lvlIn {
          0%   { opacity: 0; transform: scale(0.45) translateY(24px); }
          65%  { opacity: 1; transform: scale(1.06) translateY(-4px); }
          100% { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes lvlRays {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes lvlRing {
          from { transform: scale(0.88); opacity: 0.65; }
          to   { transform: scale(1.12); opacity: 1; }
        }
        @keyframes lvlStar {
          from { transform: scale(0.75) rotate(-18deg); opacity: 0.5; }
          to   { transform: scale(1.25) rotate(18deg);  opacity: 1; }
        }
        @keyframes lvlLabelPulse {
          from { opacity: 0.78; letter-spacing: 7px; }
          to   { opacity: 1;    letter-spacing: 8px; text-shadow: 0 0 22px rgba(255,215,0,1), 0 0 44px rgba(255,140,0,0.8); }
        }
        @keyframes lvlNumPop {
          0%   { opacity: 0; transform: scale(0.35) translateY(18px); }
          70%  { opacity: 1; transform: scale(1.1)  translateY(-4px); }
          100% { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes lvlOut {
          0%   { opacity: 1; transform: scale(1)    translateY(0)    rotate(0deg); }
          15%  { opacity: 1; transform: scale(1.08) translateY(-6px) rotate(0deg); }
          55%  { opacity: 0.6; transform: scale(0.5) translateY(10px) rotate(4deg); }
          100% { opacity: 0; transform: scale(0.05) translateY(20px) rotate(8deg); }
        }
        @keyframes lvlOverlayOut {
          0%   { opacity: 1; }
          25%  { background: rgba(255, 200, 60, 0.06); }
          100% { opacity: 0; }
        }

        /* ── Loading screen ── */
        @keyframes loadingFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes corgiHeadBob {
          0%,  100% { transform: translateY(0)   rotate(0deg);  }
          28%        { transform: translateY(-6px) rotate(-4deg); }
          72%        { transform: translateY(3px)  rotate(2.5deg); }
        }
        @keyframes corgiPawSlide {
          0%          { transform: translateX(0);              }
          25%         { transform: translateX(22px);           }
          52%         { transform: translateX(22px);           }
          68%         { transform: translateX(0) translateY(-5px); }
          82%         { transform: translateX(0);              }
          100%        { transform: translateX(0);              }
        }
        @keyframes steamWaft {
          0%,  100% { transform: translateX(0)  scaleX(1);  opacity: 0.55; }
          50%        { transform: translateX(4px) scaleX(-1); opacity: 0.85; }
        }
        @keyframes dotPop {
          0%, 55%, 100% { opacity: 0.2;  transform: translateY(0);    }
          28%            { opacity: 1;    transform: translateY(-6px);  }
        }

        /* ── Run Analysis button ── */
        @keyframes analyzePress {
          0%   { transform: scale(1);    filter: brightness(1); }
          18%  { transform: scale(0.95); filter: brightness(1.25); }
          55%  { transform: scale(1.025); filter: brightness(1.1); }
          78%  { transform: scale(0.99); filter: brightness(1.02); }
          100% { transform: scale(1);   filter: brightness(1); }
        }
        @keyframes analyzeRipple {
          0%   { box-shadow: 0 0 0 0px rgba(0,120,212,0.55), 0 0 12px rgba(0,120,212,0.25); }
          35%  { box-shadow: 0 0 0 6px rgba(0,120,212,0.22), 0 0 20px rgba(0,120,212,0.35); }
          65%  { box-shadow: 0 0 0 14px rgba(0,120,212,0.08), 0 0 28px rgba(0,120,212,0.15); }
          100% { box-shadow: 0 0 0 24px rgba(0,120,212,0),   0 0 0  rgba(0,120,212,0); }
        }

        /* ── Individual Apply button ── */
        @keyframes applyStamp {
          0%   { transform: scale(1);    filter: brightness(1); }
          20%  { transform: scale(0.84); filter: brightness(1.5); }
          55%  { transform: scale(1.08); filter: brightness(1.15); }
          78%  { transform: scale(0.97); filter: brightness(1.05); }
          100% { transform: scale(1);   filter: brightness(1); }
        }

        /* ── Bulk Apply [N] button ── */
        @keyframes bulkApplyStamp {
          0%   { transform: scale(1); }
          20%  { transform: scale(0.88); }
          55%  { transform: scale(1.06); }
          78%  { transform: scale(0.98); }
          100% { transform: scale(1); }
        }
        @keyframes bulkApplyRipple {
          0%   { box-shadow: 0 0 0 0px rgba(0,120,212,0.6),  0 0 0 0px rgba(0,120,212,0.3); }
          40%  { box-shadow: 0 0 0 5px rgba(0,120,212,0.2),  0 0 0 10px rgba(0,120,212,0.08); }
          70%  { box-shadow: 0 0 0 10px rgba(0,120,212,0.06), 0 0 0 18px rgba(0,120,212,0.03); }
          100% { box-shadow: 0 0 0 16px rgba(0,120,212,0),   0 0 0 26px rgba(0,120,212,0); }
        }
      `}</style>
    </div>
  );
};

export default App;