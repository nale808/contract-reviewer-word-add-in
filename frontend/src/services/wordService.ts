/**
 * wordService.ts
 *
 * All Office.js / Word API interactions live here.
 * Every exported function wraps a Word.run() call so the rest of the app
 * never touches the Word context directly.
 *
 * In plain-browser (dev preview) mode these functions fall through to no-ops
 * because Office.js is not loaded — the UI mock handles feedback instead.
 */

declare const Word: any; // Office.js global — available at runtime inside Word

// ─── Guards ──────────────────────────────────────────────────────────────────

/** True when running inside a real Word add-in context. */
const isWordContext = (): boolean =>
  typeof Office !== 'undefined' && typeof Word !== 'undefined';

// ─── Locate ───────────────────────────────────────────────────────────────────

/**
 * Searches the document body for `text` and selects + scrolls to the first match,
 * temporarily highlighting it in yellow so the user can see exactly where it lives.
 *
 * Falls back gracefully if called outside a Word context.
 */
export async function locateClauseInDocument(text: string): Promise<void> {
  if (!isWordContext()) return; // dev preview — UI mock handles feedback

  return Word.run(async (context: any) => {
    const body = context.document.body;

    // Search for the clause text (case-insensitive)
    const results = body.search(text, { matchCase: false, matchWholeWord: false });
    results.load('items');
    await context.sync();

    if (results.items.length === 0) return;

    const match = results.items[0];

    // Select the range so Word scrolls to it and highlights it in the ribbon
    match.select();

    // Apply a temporary yellow highlight so it stands out visually
    match.font.highlightColor = 'Yellow';
    await context.sync();

    // Remove the highlight after 2.5 seconds
    setTimeout(async () => {
      try {
        await Word.run(async (ctx: any) => {
          const fresh = ctx.document.body.search(text, { matchCase: false });
          fresh.load('items');
          await ctx.sync();
          if (fresh.items.length > 0) {
            fresh.items[0].font.highlightColor = 'None';
            await ctx.sync();
          }
        });
      } catch {
        // Ignore cleanup errors — user may have edited the doc
      }
    }, 2500);
  });
}

// ─── Insert Comment ──────────────────────────────────────────────────────────

/**
 * Finds `clauseText` in the document and inserts a Word comment explaining
 * why the change was suggested, without modifying the underlying text.
 */
export async function insertClauseComment(
  clauseText: string,
  commentBody: string
): Promise<boolean> {
  if (!isWordContext()) return false;

  return Word.run(async (context: any) => {
    const results = context.document.body.search(clauseText, { matchCase: false, matchWholeWord: false });
    results.load('items');
    await context.sync();

    if (results.items.length === 0) return false;

    results.items[0].insertComment(commentBody);
    await context.sync();
    return true;
  });
}

// ─── Insert Redline ──────────────────────────────────────────────────────────

/**
 * Replaces `originalText` with `suggestionText` as a tracked change,
 * then inserts an AI comment explaining the change.
 */
export async function insertRedline(
  originalText: string,
  suggestionText: string,
  comment: string
): Promise<void> {
  if (!isWordContext()) return;

  return Word.run(async (context: any) => {
    // Enable track changes
    context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;

    const body = context.document.body;
    const results = body.search(originalText, { matchCase: false });
    results.load('items');
    await context.sync();

    if (results.items.length === 0) return;

    const match = results.items[0];

    // Replace with the suggestion (shows as a tracked deletion + insertion)
    match.insertText(suggestionText, Word.InsertLocation.replace);

    // Add a comment with the AI explanation
    match.insertComment(comment);

    await context.sync();
  });
}

// ─── Get document text ───────────────────────────────────────────────────────

/**
 * Returns the full plain-text body of the active document.
 * Used to feed raw contract text to the backend for analysis.
 */
export async function getDocumentText(): Promise<string> {
  if (!isWordContext()) return '';

  return Word.run(async (context: any) => {
    const body = context.document.body;
    body.load('text');
    await context.sync();
    return body.text;
  });
}

// ─── Get paragraphs ──────────────────────────────────────────────────────────

/**
 * Returns all paragraphs in the document as an array of plain-text strings.
 * The backend `contractParser` uses these to identify clause boundaries.
 */
export async function getDocumentParagraphs(): Promise<string[]> {
  if (!isWordContext()) return [];

  return Word.run(async (context: any) => {
    const paragraphs = context.document.body.paragraphs;
    paragraphs.load('items/text,items/style');
    await context.sync();
    return paragraphs.items.map((p: any) => p.text).filter((t: string) => t.trim().length > 0);
  });
}
