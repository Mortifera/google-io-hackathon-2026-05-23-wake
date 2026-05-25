# Wake — landing design system

The landing's job, in one line (Schwartz): **the eye must be able to verify the
claim before the mind has to accept it.** The whole page is one sustained act of
*Mechanization* — show the instrument working, in the prospect's own glance, so
that "can it actually do this?" is answered before a word is read. Believability
is the only real barrier (Stage 1 sophistication: show the mechanism, don't
withhold it). Dominant desire: foresight / control over irreversible decisions.

## One scenario, threaded through the page
A single coherent run — **"Acquired by Microsoft"** → outcome regimes
`integration (19)` · `backlash (24, pivotal)` · `competitor (9)` — appears in the
hero fan, the how-it-works sequence, and the claim distribution. One real demo,
not a gallery of unrelated diagrams. (Schwartz: identification images must be
specific to *this* product; subtract anything a competitor could also use.)

## Palette (tokens in globals.css)
- Surfaces: `--bg #06080d` (top) → `--bg-deep #04060a` (bottom). The page
  **descends into the dark** — see Scroll-depth grammar.
- Accent: mint `--accent #5bd1a0` (the action / primary CTA), sky `--accent-sky`.
- Outcome / affect ramp (the product's signature color language):
  calm `#56c7d6` · attentive `#5b9cf0` · excited/integration `#4fd18b` ·
  alarmed/competitor `#f2b450` · hostile/backlash `#f0556b` · churning `#b06bf0`.
- Text: `--text` · `--text-dim` · `--text-faint`. Hairlines: `--border-soft` / `--border`.

## Type scale
- Hero headline: `clamp(42px, 5.6vw, 74px)`, weight 600, tracking -0.035em, line 1.0.
- Section title: `clamp(28px, 3.4vw, 44px)`, weight 600, tracking -0.025em.
- Claim title: `clamp(30px, 4vw, 50px)`.
- Body: 16–19px, line 1.55–1.6, `--text-dim`. Mono (`--font-geist-mono`) for all
  instrument chrome: labels, counts, axis ticks, prooflines, captions.

## Vertical rhythm + Scroll-depth grammar (Gradualization)
Belief depends on structure, so the page physically enacts a descent:
- A fixed vertical wash on `.root`: lifted/ambient at the very top (hero), fading
  to pure `--bg-deep` by the footer. Aurora glow concentrated behind the hero only.
- **Section padding tightens as you descend**: hero 56–64px → mid 72px → lower
  64px. Density increases toward the claim (the most detailed moment).
- Motion timing: hero fan plays in once (~1.2s) then breathes; claim distribution
  loops slowly (~6s); scroll-reveals stagger ~80ms.

## Section grammar — NO card-as-section
The "stacked sections" / generic feel was a *form* problem. Rules:
- Sections are separated by **thin horizontal rules** (`.divider`, a hairline +
  a single accent node). **Never** a card border, background band, or shadow box
  to delimit a section. The page reads as *one continuous document*, not a slideshow.
- **Every section gets a distinct layout** (no repeated 3-card grid):
  | Section | Layout | Length |
  |---|---|---|
  | Hero | split: copy left (centered), live fan right, full-height | short |
  | Problem beat | before/after split: dim flat-tool ‖ bright Wake world | shorter |
  | How it works | one continuous L→R mechanism sequence (action→graph→fan) | medium |
  | Claim | animated distribution + institutional caption set off by a rule | short |
  | CTA | sparse, boxless: headline + button + one permission line in open dark | very short |

## Visuals = demonstration, not decoration
Each visual must be something the eye can *verify* as real output:
- **Hero fan**: named action + named outcome clusters + counts + pivotal marker.
- **Before/after**: the flat single-forecast tool (dim, desaturated) beside the
  Wake world-model (full palette) — the contrast does the arguing.
- **Sequence**: real product frames (typed action → graph building → fan +
  pivotal), connected by a through-line; not icons.
- **Claim**: the distribution *moves* — clusters re-form as a variable shifts —
  demonstrating "a distribution, not a single prediction" (Redefinition).

## Accessibility & reduced-motion
- Every animated visual ships a **meaningful static end-frame**: with
  `prefers-reduced-motion: reduce`, the viewer still sees *the result* (the full
  fan, the settled distribution), never a blank or mid-state.
- No layout shift on load (visuals reserve their box). Mono captions ≥ contrast AA
  on the dark ground. Primary CTA is a real `<a>`, keyboard-focusable, 44px target.
- Per-viewport reflow (not just "stacked"): splits stack with the contrast
  preserved (dim-then-bright top-to-bottom); the sequence becomes vertical with
  the through-line running down.
