/**
 * VerbPhraseAnalyzer.ts
 *
 * Detects and classifies finite verb phrases using compromise.js (v1).
 *
 * SpaCy swap (v2): set VITE_API_URL to your Flask endpoint.
 * The rest of the app requires no changes — the VerbPhrase[] contract is identical.
 *
 * JSON contract for the SpaCy API:
 *   POST /analyse  { "text": "..." }
 *   → { "verb_phrases": VerbPhrase[] }
 */

import nlp from 'compromise';
import type { VerbPhrase } from '../types';

// ─── API switch ───────────────────────────────────────────────────────────────
// Leave VITE_API_URL unset to use local compromise analysis (v1).
// Set it to your SpaCy endpoint URL for v2 (no other code changes needed).
const API_URL = import.meta.env.VITE_API_URL;

export async function analyzeVerbPhrases(text: string): Promise<VerbPhrase[]> {
  if (API_URL) {
    return fetchFromSpaCy(text);
  }
  return localAnalyze(text);
}

async function fetchFromSpaCy(text: string): Promise<VerbPhrase[]> {
  const res = await fetch(`${API_URL}/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`SpaCy API error: ${res.status}`);
  const data = await res.json() as { verb_phrases: VerbPhrase[] };
  return data.verb_phrases;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// 'will' is NOT here — it is treated as future tensed, not a core modal.
// 'shall' is a core modal per project spec.
const CORE_MODALS = new Set([
  'can', 'could', 'may', 'might', 'must', 'shall', 'should', 'would',
]);

const BE_FINITE = new Set(['am', 'is', 'are', 'was', 'were']);
const HAVE_WORDS = new Set(['have', 'has', 'had']);
const DO_WORDS   = new Set(['do', 'does', 'did']);

// Common irregular past participles. Regular -ed forms are caught by suffix check.
const IRREG_PP = new Set([
  'been', 'done', 'gone', 'seen', 'taken', 'given', 'written', 'made',
  'said', 'told', 'known', 'found', 'thought', 'become', 'come', 'run',
  'begun', 'drunk', 'sung', 'swum', 'eaten', 'fallen', 'driven', 'shown',
  'thrown', 'grown', 'blown', 'flown', 'drawn', 'spoken', 'broken', 'chosen',
  'frozen', 'stolen', 'gotten', 'forgotten', 'ridden', 'risen', 'bitten',
  'hidden', 'worn', 'torn', 'born', 'sworn', 'beaten', 'woken', 'awoken',
  'proven', 'shaken', 'mistaken', 'led', 'read', 'lost', 'built',
  'understood', 'spent', 'cut', 'bought', 'sought', 'caught', 'dealt',
  'won', 'hung', 'struck', 'sold', 'fought', 'taught', 'left', 'felt',
  'brought', 'kept', 'held', 'heard', 'let', 'meant', 'set', 'met',
  'paid', 'sat', 'lain', 'laid', 'sent', 'put', 'split', 'spread',
  'shed', 'shut', 'hurt', 'cost', 'cast', 'broadcast', 'hit', 'burst',
  'quit', 'sunk', 'shrunk', 'rung', 'wrung', 'swung', 'stung', 'clung',
  'flung', 'spun', 'woven',
]);

// ─── Token ────────────────────────────────────────────────────────────────────

interface Token {
  text: string;    // original text (used for character spans)
  word: string;    // term.text('normal') — lowercased, compromise-normalised
  root: string;    // term.text('root')   — lemma
  start: number;
  end: number;
  isVerb: boolean;
  isFinite: boolean;
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function isBe(t: Token | undefined): boolean {
  if (!t) return false;
  return t.root === 'be' || BE_FINITE.has(t.word);
}
function isHave(t: Token | undefined): boolean {
  if (!t) return false;
  return t.root === 'have' || HAVE_WORDS.has(t.word);
}
function isDo(t: Token | undefined): boolean {
  if (!t) return false;
  return t.root === 'do' || DO_WORDS.has(t.word);
}
function isModal(t: Token | undefined): boolean {
  if (!t) return false;
  return CORE_MODALS.has(t.word) || CORE_MODALS.has(t.root);
}
function isWill(t: Token | undefined): boolean {
  if (!t) return false;
  // covers 'will', "'ll" (contraction), and any root that normalises to 'will'
  return t.word === 'will' || t.word === "'ll" || t.root === 'will';
}

// Returns true if the token is a past participle form.
// Only call this in auxiliary-chain contexts (after have/be/been) where
// we know we are looking for a past participle, not a past simple.
function isPP(t: Token | undefined): boolean {
  if (!t) return false;
  const w = t.word;
  if (w === 'being') return false; // auxiliary, not a content PP
  return IRREG_PP.has(w) || IRREG_PP.has(t.root) || (w.endsWith('ed') && w.length > 3);
}

// Returns true if the token is a present participle (-ing content verb).
function isIng(t: Token | undefined): boolean {
  if (!t) return false;
  const w = t.word;
  return w.endsWith('ing') && w.length > 4 && w !== 'being';
}

// ─── Token extraction ─────────────────────────────────────────────────────────

function extractTokens(text: string): Token[] {
  const doc = nlp(text);
  const tokens: Token[] = [];
  let pos = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc.terms().forEach((term: any) => {
    const termText: string = term.text();
    const start = text.indexOf(termText, pos);
    if (start === -1) return;

    const word: string = (term.text('normal') || termText).toLowerCase().trim();
    const root: string = (term.text('root') || word).toLowerCase().trim();

    // compromise tags for this term
    const isVerb: boolean =
      term.has('#Verb') || term.has('#Modal') || term.has('#Auxiliary') ||
      CORE_MODALS.has(word) || isWill({ word, root } as Token) ||
      BE_FINITE.has(word) || HAVE_WORDS.has(word) || DO_WORDS.has(word);

    // Finite: carrying tense information directly (excludes infinitives, participles)
    const isFinite: boolean =
      term.has('#PastTense') || term.has('#PresentTense') ||
      BE_FINITE.has(word) || HAVE_WORDS.has(word) || DO_WORDS.has(word) ||
      CORE_MODALS.has(word) || word === 'will' || word === "'ll";

    tokens.push({
      text: termText,
      word,
      root,
      start,
      end: start + termText.length,
      isVerb,
      isFinite,
    });
    pos = start + termText.length;
  });

  return tokens;
}

// ─── Main local analyser ──────────────────────────────────────────────────────

function localAnalyze(text: string): VerbPhrase[] {
  const tokens = extractTokens(text);
  const result: VerbPhrase[] = [];
  const used = new Set<number>();

  let i = 0;
  while (i < tokens.length) {
    if (used.has(i)) { i++; continue; }

    const parsed = tryParse(tokens, i, text);
    if (parsed) {
      result.push(parsed.vp);
      for (let j = i; j < parsed.next; j++) used.add(j);
      i = parsed.next;
    } else {
      i++;
    }
  }
  return result;
}

// ─── VP parser ────────────────────────────────────────────────────────────────

function tryParse(
  tokens: Token[],
  i: number,
  text: string,
): { vp: VerbPhrase; next: number } | null {
  const t = tokens[i];
  if (!t) return null;

  // Semi-modals first — most specific patterns, must take priority
  const semi = trySemiModal(tokens, i, text);
  if (semi) return semi;

  // Core modals (shall, should, can, could, may, might, must, would)
  if (isModal(t)) return parseModal(tokens, i, text);

  // Future with 'will' / "'ll"
  if (isWill(t)) return parseFuture(tokens, i, text);

  // Perfect aspect: have / has / had + ...
  if (isHave(t)) {
    const r = parsePerfect(tokens, i, text);
    if (r) return r;
  }

  // Be-construction: am / is / are / was / were + ...
  // (Only finite forms — not 'being', 'been', bare 'be')
  if (BE_FINITE.has(t.word)) {
    const r = parseBe(tokens, i, text);
    if (r) return r;
  }

  // Do-support: do / does / did + (not)? + verb
  if (isDo(t)) {
    const r = parseDo(tokens, i, text);
    if (r) return r;
  }

  // Simple finite verb: compromise confirms it carries tense
  // Only fire if compromise POS confirms a true finite form, to avoid
  // false positives on participial adjectives and gerunds.
  if (t.isFinite && t.isVerb && !isBe(t) && !isHave(t) && !isDo(t)) {
    return parseSimple(tokens, i, text);
  }

  return null;
}

// ─── Semi-modal definitions ───────────────────────────────────────────────────

interface SemiDef {
  /** Returns the number of tokens consumed by the semi-modal head, or null if no match. */
  test: (ts: Token[], i: number) => number | null;
  canonical: string;
}

const SEMI_DEFS: SemiDef[] = [
  // be going to  — require a verb after 'to' to avoid "going to the shop"
  {
    test: (ts, i) =>
      isBe(ts[i]) && ts[i + 1]?.word === 'going' && ts[i + 2]?.word === 'to' && ts[i + 3]?.isVerb
        ? 3
        : null,
    canonical: 'be going to',
  },
  // be able to
  {
    test: (ts, i) =>
      isBe(ts[i]) && ts[i + 1]?.word === 'able' && ts[i + 2]?.word === 'to' ? 3 : null,
    canonical: 'be able to',
  },
  // be supposed to
  {
    test: (ts, i) =>
      isBe(ts[i]) && ts[i + 1]?.word === 'supposed' && ts[i + 2]?.word === 'to' ? 3 : null,
    canonical: 'be supposed to',
  },
  // have to  (have/has/had + to, but NOT followed by 'be' alone — that would be passive)
  {
    test: (ts, i) =>
      isHave(ts[i]) && ts[i + 1]?.word === 'to' ? 2 : null,
    canonical: 'have to',
  },
  // need to
  {
    test: (ts, i) =>
      ['need', 'needs', 'needed'].includes(ts[i]?.word) && ts[i + 1]?.word === 'to' ? 2 : null,
    canonical: 'need to',
  },
  // ought to
  {
    test: (ts, i) =>
      ts[i]?.word === 'ought' && ts[i + 1]?.word === 'to' ? 2 : null,
    canonical: 'ought to',
  },
];

function trySemiModal(
  tokens: Token[],
  i: number,
  text: string,
): { vp: VerbPhrase; next: number } | null {
  for (const def of SEMI_DEFS) {
    const headLen = def.test(tokens, i);
    if (headLen === null) continue;

    const idx = i + headLen; // first token after the semi-modal head
    const { structure, voice, consumed } = parseAuxChain(tokens, idx);
    const endIdx = idx + consumed;

    const label = `${def.canonical} + ${structure} ${voice}`.trim();
    return makeVP(tokens, i, endIdx, text, 'semi-modalised', label,
      `Semi-modal: ${def.canonical} | Pattern: ${structure} ${voice}`);
  }
  return null;
}

// ─── Modal parser ─────────────────────────────────────────────────────────────

function parseModal(
  tokens: Token[],
  i: number,
  text: string,
): { vp: VerbPhrase; next: number } {
  const modal = tokens[i].word;
  const idx = i + 1;
  const { structure, voice, consumed } = parseAuxChain(tokens, idx);
  const endIdx = idx + consumed;
  const label = `${modal} + ${structure} ${voice}`.trim();
  return makeVP(tokens, i, endIdx, text, 'modalised', label,
    `Modal: ${modal} | Pattern: ${structure} ${voice}`);
}

// ─── Future parser ────────────────────────────────────────────────────────────

function parseFuture(
  tokens: Token[],
  i: number,
  text: string,
): { vp: VerbPhrase; next: number } {
  const idx = i + 1;
  const { structure, voice, consumed } = parseAuxChain(tokens, idx);
  const endIdx = idx + consumed;
  const label = `future ${structure} ${voice}`.trim();
  return makeVP(tokens, i, endIdx, text, 'tensed', label,
    `Time: future | Aspect: ${structure} | Voice: ${voice}`);
}

// ─── Shared auxiliary-chain reader ────────────────────────────────────────────
// Reads the sequence after a modal / semi-modal / 'will' head token and
// returns the structural pattern, voice, and number of tokens consumed.
// This is the single place to update when adding new patterns.

function parseAuxChain(
  tokens: Token[],
  idx: number,
): { structure: string; voice: string; consumed: number } {
  const t0 = tokens[idx];
  const t1 = tokens[idx + 1];
  const t2 = tokens[idx + 2];
  const t3 = tokens[idx + 3];

  // perfect progressive passive: have + been + being + PP
  if (isHave(t0) && t1?.word === 'been' && t2?.word === 'being' && isPP(t3))
    return { structure: 'perfect progressive', voice: 'passive', consumed: 4 };

  // perfect passive: have + been + PP
  if (isHave(t0) && t1?.word === 'been' && isPP(t2))
    return { structure: 'perfect', voice: 'passive', consumed: 3 };

  // perfect progressive active: have + been + -ing
  if (isHave(t0) && t1?.word === 'been' && isIng(t2))
    return { structure: 'perfect progressive', voice: 'active', consumed: 3 };

  // perfect active: have + PP
  if (isHave(t0) && isPP(t1) && t1?.word !== 'been')
    return { structure: 'perfect', voice: 'active', consumed: 2 };

  // progressive passive: be + being + PP
  if (t0?.word === 'be' && t1?.word === 'being' && isPP(t2))
    return { structure: 'progressive', voice: 'passive', consumed: 3 };

  // passive: be + PP
  if (t0?.word === 'be' && isPP(t1))
    return { structure: 'base form', voice: 'passive', consumed: 2 };
  // ^ labelled 'base form passive' for modals/semi-modals; caller may rename for tensed

  // progressive active: be + -ing
  if (t0?.word === 'be' && isIng(t1))
    return { structure: 'progressive', voice: 'active', consumed: 2 };

  // base form / simple: next content verb
  if (t0?.isVerb)
    return { structure: 'base form', voice: 'active', consumed: 1 };

  // No recognisable continuation — head only (degenerate case)
  return { structure: 'base form', voice: 'active', consumed: 0 };
}

// ─── Perfect aspect parser ────────────────────────────────────────────────────

function parsePerfect(
  tokens: Token[],
  i: number,
  text: string,
): { vp: VerbPhrase; next: number } | null {
  const tense = tokens[i].word === 'had' ? 'past' : 'present';
  const idx = i + 1;
  const t = tokens[idx];
  if (!t) return null;

  // been + being + PP → perfect progressive passive
  if (t.word === 'been' && tokens[idx + 1]?.word === 'being' && isPP(tokens[idx + 2])) {
    return makeVP(tokens, i, idx + 3, text, 'tensed',
      `${tense} perfect progressive passive`,
      `Time: ${tense} | Aspect: perfect progressive | Voice: passive`);
  }
  // been + -ing → perfect progressive active
  if (t.word === 'been' && isIng(tokens[idx + 1])) {
    return makeVP(tokens, i, idx + 2, text, 'tensed',
      `${tense} perfect progressive active`,
      `Time: ${tense} | Aspect: perfect progressive | Voice: active`);
  }
  // been + PP → perfect passive
  if (t.word === 'been' && isPP(tokens[idx + 1])) {
    return makeVP(tokens, i, idx + 2, text, 'tensed',
      `${tense} perfect passive`,
      `Time: ${tense} | Aspect: perfect | Voice: passive`);
  }
  // PP (not 'been') → perfect active
  if (isPP(t) && t.word !== 'been') {
    return makeVP(tokens, i, idx + 1, text, 'tensed',
      `${tense} perfect active`,
      `Time: ${tense} | Aspect: perfect | Voice: active`);
  }
  return null;
}

// ─── Be-construction parser ───────────────────────────────────────────────────

function parseBe(
  tokens: Token[],
  i: number,
  text: string,
): { vp: VerbPhrase; next: number } | null {
  const w = tokens[i].word;
  const tense = (w === 'was' || w === 'were') ? 'past' : 'present';
  const idx = i + 1;
  const t = tokens[idx];
  if (!t) return null;

  // being + PP → progressive passive
  if (t.word === 'being' && isPP(tokens[idx + 1])) {
    return makeVP(tokens, i, idx + 2, text, 'tensed',
      `${tense} progressive passive`,
      `Time: ${tense} | Aspect: progressive | Voice: passive`);
  }
  // PP → simple passive
  if (isPP(t)) {
    return makeVP(tokens, i, idx + 1, text, 'tensed',
      `${tense} simple passive`,
      `Time: ${tense} | Aspect: simple | Voice: passive`);
  }
  // -ing → progressive active
  if (isIng(t)) {
    return makeVP(tokens, i, idx + 1, text, 'tensed',
      `${tense} progressive active`,
      `Time: ${tense} | Aspect: progressive | Voice: active`);
  }
  return null;
}

// ─── Do-support parser ────────────────────────────────────────────────────────

function parseDo(
  tokens: Token[],
  i: number,
  text: string,
): { vp: VerbPhrase; next: number } | null {
  const tense = tokens[i].word === 'did' ? 'past' : 'present';
  let idx = i + 1;
  // Skip negation ('not', "n't")
  if (tokens[idx]?.word === 'not' || tokens[idx]?.word === "n't") idx++;

  const t = tokens[idx];
  if (t?.isVerb && !isBe(t) && !isHave(t)) {
    return makeVP(tokens, i, idx + 1, text, 'tensed',
      `${tense} simple active`,
      `Time: ${tense} | Aspect: simple | Voice: active`);
  }
  return null;
}

// ─── Simple finite verb parser ────────────────────────────────────────────────
// Only fires when compromise POS confirms a genuine finite verb form,
// preventing false positives on participial adjectives and plural nouns.

function parseSimple(
  tokens: Token[],
  i: number,
  text: string,
): { vp: VerbPhrase; next: number } {
  const t = tokens[i];
  // Past simple: -ed suffix or known irregular (in standalone finite context)
  const tense = (t.word.endsWith('ed') && t.word.length > 3) ||
                IRREG_PP.has(t.word)
    ? 'past'
    : 'present';
  return makeVP(tokens, i, i + 1, text, 'tensed',
    `${tense} simple active`,
    `Time: ${tense} | Aspect: simple | Voice: active`);
}

// ─── VerbPhrase builder ───────────────────────────────────────────────────────

function makeVP(
  tokens: Token[],
  from: number,
  to: number,
  text: string,
  category: VerbPhrase['category'],
  label: string,
  fullDescription: string,
): { vp: VerbPhrase; next: number } {
  const safeEnd = Math.min(to, tokens.length);
  const lastIdx = safeEnd - 1;
  return {
    vp: {
      text: text.slice(tokens[from].start, tokens[lastIdx].end),
      start: tokens[from].start,
      end: tokens[lastIdx].end,
      category,
      label,
      fullDescription,
    },
    next: safeEnd,
  };
}
