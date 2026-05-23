import type { NodeState } from "@wake/contracts";

/**
 * The six affect states a node can be in, ordered roughly from coolest/calmest
 * to hottest/most-distressed. Colour is the primary channel the viewer reads, so
 * the ramp is designed to be legible at a glance and to tell the story of this
 * cascade: calm → attentive → alarmed → hostile → churning, with `excited` as
 * the positive-valence branch (here: the competitor who senses an opening).
 */
export type Affect =
  | "calm"
  | "attentive"
  | "excited"
  | "alarmed"
  | "hostile"
  | "churning";

export interface AffectStyle {
  affect: Affect;
  label: string;
  /** Core fill colour. */
  color: string;
  /** Short human description for the inspector. */
  blurb: string;
}

const STYLES: Record<Affect, Omit<AffectStyle, "affect">> = {
  calm: { label: "Calm", color: "#56c7d6", blurb: "settled, low arousal" },
  attentive: {
    label: "Attentive",
    color: "#5b9cf0",
    blurb: "watching closely, undecided",
  },
  excited: {
    label: "Excited",
    color: "#4fd18b",
    blurb: "energised, leaning in",
  },
  alarmed: {
    label: "Alarmed",
    color: "#f2b450",
    blurb: "worried, urgency rising",
  },
  hostile: {
    label: "Hostile",
    color: "#f0556b",
    blurb: "angry, actively opposed",
  },
  churning: {
    label: "Churning",
    color: "#b06bf0",
    blurb: "negative and disengaging — flight risk",
  },
};

/**
 * Map a node's mood + attention budget to an affect. Sentiment is the spine;
 * urgency and a depleted attention budget bend it toward the hotter states.
 * Tuned so the fixture cascade reads correctly (corp → alarmed, productivity
 * Twitter → churning, Linear → excited).
 */
export function classifyAffect(s: NodeState): Affect {
  const { sentiment, urgency, attention } = s.mood;
  const depleted = s.attentionBudget <= 0.35;

  if (sentiment <= -0.45) {
    // Strongly negative: still-engaged anger vs. burned-out flight.
    return depleted || attention < 0.6 ? "churning" : "hostile";
  }
  if (sentiment <= -0.15) return "alarmed";
  if (sentiment >= 0.25 && attention >= 0.45) return "excited";
  if (attention >= 0.55 || urgency >= 0.6) return "attentive";
  return "calm";
}

export function affectStyle(s: NodeState): AffectStyle {
  const affect = classifyAffect(s);
  return { affect, ...STYLES[affect] };
}

export function affectColor(affect: Affect): string {
  return STYLES[affect].color;
}

export const AFFECT_ORDER: Affect[] = [
  "calm",
  "attentive",
  "excited",
  "alarmed",
  "hostile",
  "churning",
];

export const AFFECT_LEGEND: AffectStyle[] = AFFECT_ORDER.map((affect) => ({
  affect,
  ...STYLES[affect],
}));

/** Colour for an event by type — used for particles and the event log. */
export const EVENT_COLOR: Record<string, string> = {
  public_post: "#5b9cf0",
  private_message: "#8a7bf0",
  decision: "#f2b450",
  action: "#5bd1a0",
  emergent: "#ff5d8f",
};

export const EVENT_LABEL: Record<string, string> = {
  public_post: "Public post",
  private_message: "Private message",
  decision: "Decision",
  action: "Action",
  emergent: "Emergent leak",
};

/** A curated, distinguishable hue per Monte Carlo cluster, by order. */
export const CLUSTER_COLORS = ["#4fd18b", "#f0556b", "#f2b450", "#5b9cf0", "#b06bf0"];

/** Map a hex colour to an rgba() string at the given alpha. Defensive: any
 * non-hex input is returned unchanged so it can never crash a canvas draw. */
export function withAlpha(hex: string, alpha: number): string {
  if (hex[0] !== "#" || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
