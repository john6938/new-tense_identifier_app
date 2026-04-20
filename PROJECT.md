# Finite Verb Phrase Annotator — Project Document

## Overview

A web-based application that identifies, classifies, and visually annotates finite verb phrases in English text, designed for English language learners and teachers. The app provides pedagogically clear labels and an intuitive inline annotation interface.

**GitHub**: https://github.com/john6938/new-tense_identifier_app

Two versions are planned:

| Version | Engine | Stack | Status |
|---------|--------|-------|--------|
| v1 — Compromise | compromise.js (NLP) | React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + shadcn/ui + pnpm | Figma prototype complete — needs improvement |
| v2 — SpaCy | spaCy + rule-based layer | Python Flask / REST API + same React frontend | Planned |

---

## Core Requirements

### Interface

- **Single central workspace** — functions as both input and annotated output (no separate panels)
- **Dual-mode surface**:
  - *Input mode*: standard editable textarea
  - *Output mode*: read-only annotated view with inline coloured spans
- User can return to input mode to revise text and re-run analysis
- Text file upload (`.txt`) supported; contents populate the workspace
- Hover / tap on a highlighted span → shows full human-readable label (tooltip)
- Touch device support (tap interaction substitutes for hover)
- Responsive and intuitive UI

### Linguistic Scope

The system identifies **finite verb phrases** in both statements and questions, and classifies them into three categories:

---

#### Category 1 — Tensed Verb Phrases

Labelled using the **12-category pedagogic tense-aspect system**:

| Time | Simple | Progressive | Perfect | Perfect Progressive |
|------|--------|-------------|---------|----------------------|
| Present | present simple | present progressive | present perfect | present perfect progressive |
| Past | past simple | past progressive | past perfect | past perfect progressive |
| Future | future simple | future progressive | future perfect | future perfect progressive |

- `will` is treated as part of the **future** system (not a modal)
- Each label also includes **voice**: `active` or `passive`
- Example labels: `present simple active`, `past progressive passive`, `future perfect progressive active`

---

#### Category 2 — Modalised Verb Phrases

Core modal verbs: `can`, `could`, `may`, `might`, `must`, `shall`, `should`, `would`

- **Not** assigned pedagogic tense labels
- Labelled by: modal verb + structural pattern + voice
- Structural patterns:
  - base form
  - progressive
  - perfect
  - perfect progressive
  - passive
  - progressive passive
  - perfect passive
  - perfect progressive passive

Example labels:
- `must go` → `must + base form active`
- `should be working` → `should + progressive active`
- `might have been being watched` → `might + perfect progressive passive`

---

#### Category 3 — Semi-modalised Verb Phrases

Semi-modal expressions: `have to`, `need to`, `ought to`, `be able to`, `be supposed to`, `be going to`

- Treated as a **distinct subclass** (not tensed, not core modal)
- `be going to` is explicitly **not** part of the future tense system
- Same structural labelling approach as Category 2

Example labels:
- `have to leave` → `have to + base form active`
- `is going to be being examined` → `be going to + progressive passive`

---

### Annotation Rules

- Highlight the **full span** of each finite verb phrase (not just the lexical verb)
- Colour-coding must be consistent and distinguishable across the three categories
- Graceful degradation for ambiguous or structurally complex input — do not assign misleading labels
- Handle coordination and auxiliary ellipsis (e.g., `I have seen and tested it`)

---

## Architecture

### Version 1 — Compromise.js Frontend (Figma prototype — actual file structure)

```
src/
  main.tsx                              ← React entry point
  app/
    App.tsx                             ← dual-mode workspace, toolbar, file upload, sample text
    components/
      VerbPhraseAnalyzer.ts             ← compromise.js NLP + rule-based classifier
      VerbPhraseAnnotator.tsx           ← renders annotated spans + click/touch tooltips
      LegendPanel.tsx                   ← collapsible legend (tensed/modal/semi-modal)
      ui/                               ← full shadcn/ui component library (Radix primitives)
      figma/
        ImageWithFallback.tsx
  styles/
    index.css, tailwind.css, theme.css, fonts.css
vite.config.ts                          ← Vite + Tailwind + figma asset resolver
package.json                            ← pnpm; compromise ^14.15.0; React 18; Tailwind v4
```

**Colour scheme (implemented):**
- Tensed: `bg-blue-100 text-blue-900 border-b-2 border-blue-500`
- Modalised: `bg-orange-100 text-orange-900 border-b-2 border-orange-500`
- Semi-modalised: `bg-purple-100 text-purple-900 border-b-2 border-purple-500`

**Flow**: user input → compromise NLP pipeline → rule-based classifier → span annotation → inline render

**Known limitations / bugs in prototype VerbPhraseAnalyzer.ts:**
1. `isLikelyVerb()` too permissive — any word ending in `-s`, `-ed`, `-ing` is tagged as a verb → many false positives on nouns/adjectives
2. `matchesPattern()` uses exact token text — won't match contracted forms (`I'm going to`, `she's supposed to`, `they've had to`)
3. `parseSimpleVerb()` fires on all remaining "verbs" — will tag gerunds, participial adjectives, and noun-derived `-ed`/`-ing` forms
4. No handling of questions (auxiliary inversion: *Has she left?*)
5. No handling of negation tokens (should `not`/`n't` be skipped or included in span?)
6. `shall` in `CORE_MODALS` but remit says `shall` = future tensed system — may need to treat like `will`
7. Semi-modal `had to` parsed but resulting label says `have to` (correct canonically, but tense of the semi-modal itself not reflected)

**Limitations of compromise.js**: shallower syntactic analysis than dependency parsing; complex passives and stacked auxiliaries require careful heuristics.

---

### Version 2 — SpaCy Backend

```
backend/
  app.py            ← Flask REST API
  analyser.py       ← spaCy pipeline + rule-based classifier
  requirements.txt

frontend/
  index.html
  style.css
  app.js            ← same UI as v1 but calls API
```

**Flow**: user input → POST to `/analyse` → spaCy tokenisation + dependency parse → rule-based VP boundary detection → auxiliary sequence reconstruction → classification → JSON response → frontend renders inline spans

**spaCy pipeline tasks**:
1. Tokenisation
2. Lemmatisation
3. POS tagging
4. Dependency parsing (used to identify VP heads and aux chains)
5. Rule-based layer: distinguish auxiliary vs lexical `be`/`have`, reconstruct full aux sequence, classify

---

## Classification Logic (Both Versions)

### Step 1 — Identify finite VP heads
- Token is a verb tagged as finite (`VBZ`, `VBD`, `VBP`, or aux chain root)
- Walk dependency tree to collect auxiliaries

### Step 2 — Reconstruct auxiliary sequence
- Collect: `[aux1, aux2, ..., lexical_verb]`
- Identify position of `be`, `have`, `modal`, `semi-modal` forms

### Step 3 — Categorise
- If head modal ∈ {`will`, `shall`} → **tensed future**
- If head modal ∈ core modals → **modalised**
- If semi-modal expression detected → **semi-modalised**
- Otherwise → **tensed** (present/past based on finite verb form)

### Step 4 — Determine aspect, voice, structural pattern
- **Perfect**: `have + past participle`
- **Progressive**: `be + present participle`
- **Passive**: `be + past participle` (where `be` is not progressive marker)
- Combinations stacked in order: perfect → progressive → passive

### Step 5 — Generate label
- Compose human-readable string from time + aspect + voice (tensed) or modal + pattern + voice (modal/semi-modal)

---

## Colour Scheme (Provisional)

| Category | Colour |
|----------|--------|
| Tensed — active | Blue family |
| Tensed — passive | Blue-grey |
| Modalised | Orange / amber |
| Semi-modalised | Green / teal |

Final palette to be confirmed from Figma prototype.

---

## TODO List

### Phase 0 — Setup
- [x] Review Figma prototype files
- [x] Extract UI design decisions (colours, layout, typography) from Figma
- [x] Document project in PROJECT.md
- [x] Initialise git and push to https://github.com/john6938/new-tense_identifier_app
- [x] Install dependencies and verify dev server runs (`npm run dev`)

### Phase 1 — Version 1 (Compromise.js) — COMPLETE

**Stack**: React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + compromise.js + npm
**Tool name**: Tense Identifier v3.0
**Repo**: https://github.com/john6938/new-tense_identifier_app
**Live (GitHub Pages)**: https://john6938.github.io/new-tense_identifier_app/

#### Infrastructure
- [x] Dual-mode workspace (input/output)
- [x] `.txt` file upload → populate workspace
- [x] Mode switching (Edit Text / Analyse Text buttons)
- [x] Click/tap tooltip display (async-ready for SpaCy swap)
- [x] Collapsible legend/guide panel
- [x] Sample text loader
- [x] Logo (`jb_logo_small.jpg`) and favicon in `public/`
- [x] Footer with version number (3.0)

#### NLP Engine (VerbPhraseAnalyzer.ts)
- [x] `analyzeVerbPhrases()` is async — SpaCy API swap requires only setting `VITE_API_URL`
- [x] Shared `VerbPhrase` interface in `src/types.ts` — identical contract for both v1 and v2
- [x] Contraction handling via compromise root/lemma forms
- [x] Semi-modal detection with verb-after-`to` guard (prevents `going to the shop` false positives)
- [x] Negation skipped in do-support constructions (`did not go`)
- [x] `shall` treated as core modal (per spec)
- [x] `will` / `'ll` treated as future tensed (per spec)
- [x] All 8 structural patterns for modals and semi-modals
- [x] Expanded irregular past participle list (160+ forms)
- [x] `parseSimpleVerb` gated on compromise `isFinite` flag to reduce false positives
- [x] Graceful loading/error states in annotator

#### Deployment
- [x] GitHub Actions workflow (auto-deploys on push to master)
- [x] GitHub Pages live: https://john6938.github.io/new-tense_identifier_app/
- [ ] GoDaddy cPanel build (`npm run build:godaddy`) — next session

#### NLP Engine
- [ ] Integrate compromise.js
- [ ] Build VP boundary detection using compromise
- [ ] Implement tensed VP classifier (present/past × simple/progressive/perfect/perfect progressive × active/passive)
- [ ] Implement future VP classifier (`will`/`shall` constructions)
- [ ] Implement core modal classifier (8 modals × 8 structural patterns × voice)
- [ ] Implement semi-modal classifier (6 semi-modals × structural patterns × voice)
- [ ] Handle coordination and auxiliary ellipsis
- [ ] Handle complex stacked constructions (e.g., `might have been being watched`)
- [ ] Graceful fallback for unclassifiable VPs

#### Testing
- [ ] Compile test sentence corpus covering all 12 tenses × active/passive
- [ ] Compile test sentences for all modal + pattern combinations
- [ ] Compile test sentences for all semi-modal combinations
- [ ] Compile edge cases: coordination, ellipsis, questions, negation, inversion

### Phase 2 — Version 2 (SpaCy)

#### Backend
- [ ] Set up Flask project with `/analyse` endpoint
- [ ] Integrate spaCy (model: `en_core_web_sm` or `en_core_web_trf`)
- [ ] Build VP boundary detection using dependency parse
- [ ] Port classification logic from v1 (improved with dependency info)
- [ ] Handle negation tokens (do not include in VP span but note presence)
- [ ] Return structured JSON: `[{span_start, span_end, label, category}, ...]`
- [ ] Write `requirements.txt`
- [ ] Write deployment config (Procfile / gunicorn)

#### Frontend (v2)
- [ ] Adapt v1 frontend to call backend API
- [ ] Handle async analysis (loading state)
- [ ] Error handling for API failures

#### Testing
- [ ] Rerun full test corpus against v2
- [ ] Compare v1 vs v2 accuracy on complex constructions
- [ ] Performance testing (response time)

### Phase 3 — Deployment
- [ ] Deploy v1 to GitHub Pages (static)
- [ ] Deploy v2 backend to Heroku / Render / Railway
- [ ] Connect v2 frontend to deployed API
- [ ] Add CORS headers to Flask app
- [ ] Write user-facing README

### Phase 4 — Polish
- [ ] Mobile/touch optimisation
- [ ] Accessibility review (colour contrast, keyboard navigation)
- [ ] Add example texts for quick testing
- [ ] Consider: export annotated text (HTML or plain with labels)?
- [ ] Consider: legend/key showing colour → category mapping?

---

## Open Questions

1. **will as future vs modal**: The remit is clear that `will` = future (tensed), not modal. Confirm this applies to all uses of `will`, including weak epistemic uses like *"that'll be the postman"*.
2. **Negation**: Should `not` / `n't` be included in the highlighted span or excluded?
3. **Questions**: Inversion (e.g., *Has he left?*) — how to handle the split auxiliary?
4. **Contracted forms**: `I've`, `she's`, `he'd` — must be tokenised correctly.
5. **Ellipsis depth**: How far to pursue auxiliary inheritance in coordination? (e.g., *She has eaten and [has] drunk*)
6. **`be going to` detection**: Distinguish `be going to` (semi-modal) from `be going to [place]` (literal movement).
7. **Colour accessibility**: Ensure palette passes WCAG AA contrast for both normal and colour-blind users.
8. **SpaCy model choice**: `en_core_web_sm` (fast) vs `en_core_web_trf` (transformer-based, more accurate)?

---

## Test Sentence Bank (Seed)

### Tensed — Active
- She writes. *(present simple active)*
- He is writing. *(present progressive active)*
- They have written. *(present perfect active)*
- She has been writing. *(present perfect progressive active)*
- She wrote. *(past simple active)*
- He was writing. *(past progressive active)*
- They had written. *(past perfect active)*
- She had been writing. *(past perfect progressive active)*
- She will write. *(future simple active)*
- He will be writing. *(future progressive active)*
- They will have written. *(future perfect active)*
- She will have been writing. *(future perfect progressive active)*

### Tensed — Passive
- The letter is written. *(present simple passive)*
- The letter is being written. *(present progressive passive)*
- The letter has been written. *(present perfect passive)*
- The letter has been being written. *(present perfect progressive passive)*
- The letter was written. *(past simple passive)*
- The letter was being written. *(past progressive passive)*
- The letter had been written. *(past perfect passive)*
- The letter had been being written. *(past perfect progressive passive)*
- The letter will be written. *(future simple passive)*
- The letter will be being written. *(future progressive passive)*
- The letter will have been written. *(future perfect passive)*
- The letter will have been being written. *(future perfect progressive passive)*

### Modalised
- She can go. *(can + base form active)*
- He could be working. *(could + progressive active)*
- They must have finished. *(must + perfect active)*
- She might have been sleeping. *(might + perfect progressive active)*
- The package should be delivered. *(should + passive)*
- The report should be being reviewed. *(should + progressive passive)*
- The results might have been published. *(might + perfect passive)*
- The suspect might have been being watched. *(might + perfect progressive passive)*

### Semi-modalised
- She has to leave. *(have to + base form active)*
- He needs to be working. *(need to + progressive active)*
- The work ought to have been completed. *(ought to + perfect passive)*
- The project is going to be delayed. *(be going to + passive)*
- The system is going to be being tested. *(be going to + progressive passive)*

### Edge Cases
- I have seen and tested it. *(coordination + ellipsis)*
- Has she finished? *(question)*
- She hasn't finished. *(negation)*
- It's been raining. *(contraction)*
- I'd have gone. *(contraction + modal perfect)*

---

## Notes

- The Figma prototype is the design reference for v1 UI; files to be shared by John.
- v2 (SpaCy) is the target production system; v1 (compromise.js) is an intermediate deployable.
- All labels must use pedagogically conventional English terminology.
- The system is intended for learners and teachers — clarity always takes priority over technical accuracy jargon.
