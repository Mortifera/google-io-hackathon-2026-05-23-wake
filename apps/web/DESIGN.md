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

## Palette — landing-scoped (the /app studio keeps the global mint)
Defined on `.root` in `marketing.module.css`, overriding the global tokens so the
brand reads "dark observatory / precision," not "AI-startup mint":
- Surfaces: `--bg #06080d` (top) → `--bg-deep #04060a` (bottom). The page
  **descends into the dark** — see Scroll-depth grammar.
- **Brand / CTA: starlight white** (`--accent` overridden to `#eef3f9`, ink
  `--accent-ink`). Premium white-on-black confidence; not mint.
- **"Live" glow: cold cyan** (`--m-live #69d3e3`, `--accent-glow` cyan) — the
  instrument is *on*. Used for pulses, seed cores' glow, focus, dividers, the
  caret, FAQ markers.
- **All saturated colour is reserved for the affect data** (below). Brand ≠ any
  data hue, so the data colours mean something. (Schwartz: colour must mean
  something + fit the identity.)
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
- **Every section gets a distinct layout** (no repeated 3-card grid). The arc
  descends into the dark; **Use Cases is the one LIGHT section** — a deliberate
  "step into daylight and see your own decisions" beat + mid-page relief:
  | # | Section | Layout | Emotion |
  |---|---|---|---|
  | 1 | Hero | split: copy left, live fan right, full-height | desire |
  | 2 | Trust strip | slim mono credibility band | credibility |
  | 3 | Problem | before/after: dim flat-tool ‖ bright Wake world | recognition |
  | 4 | How it works | one continuous L→R sequence on a through-line | belief |
  | 5 | Use cases | **LIGHT** asymmetric bento (big tile + small) | identification |
  | 6 | Claim | the distribution that *moves* (animated regimes) | trust |
  | 7 | Pricing | two transparent cards (free / ~2¢ live) | confidence |
  | 8 | FAQ | native `<details>` accordion (objection handling) | doubts gone |
  | 9 | CTA | sparse, boxless headline + button in open dark | invitation |
  | 10 | Footer | brand + link columns + bar | legitimacy |
- Section separators are **thin rules** (`.divider`) — never a card/band/box.
- Undocking nav (`SiteNav`): flush + transparent at top, contracts to a blurred
  floating island past ~70% of the first viewport.

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
