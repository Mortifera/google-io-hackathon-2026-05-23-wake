import { centroid, mean } from "./stats";

/**
 * Turn a cluster of runs into a short human label + a grounded one-line summary,
 * derived entirely from the data: the cluster's mean sentiment, which nodes
 * stand out (relative to the whole population), how many nodes turn hostile, and
 * the cluster's share of all futures. No hand-waving — every clause is computed.
 */
export interface ClusterCopy {
  label: string;
  summary: string;
  /** Mean sentiment across nodes — lets the pivotal copy order best→worst. */
  avgSentiment: number;
}

interface LabelInput {
  /** Raw outcome vectors of this cluster's members. */
  memberVectors: number[][];
  /** Raw outcome vectors of every run (for the population baseline). */
  allVectors: number[][];
  featureNames: string[];
  /** members / total, in [0,1]. */
  share: number;
}

const SENTIMENT_SUFFIX = ".sentiment";
const HOSTILE = -0.4; // sentiment at or below this reads as "hostile"

export function describeCluster(input: LabelInput): ClusterCopy {
  const { memberVectors, allVectors, featureNames, share } = input;

  const sentIdx = featureNames
    .map((name, i) => ({ name, i }))
    .filter((f) => f.name.endsWith(SENTIMENT_SUFFIX));

  const clusterMean = centroid(memberVectors);
  const popMean = centroid(allVectors);

  // Mean sentiment across all nodes for this cluster.
  const avgSent = sentIdx.length === 0 ? 0 : mean(sentIdx.map((f) => clusterMean[f.i] ?? 0));

  // Who stands out, two ways:
  //  - the biggest *gainer* vs the population baseline (delta) → a rival that wins
  //    here but not elsewhere; we keep its absolute value to tell a real win from
  //    "least bad",
  //  - the *angriest* node by absolute sentiment → the locus of the anger.
  let gainer: { node: string; delta: number; value: number } | null = null;
  let angriest: { node: string; value: number } | null = null;
  for (const f of sentIdx) {
    const value = clusterMean[f.i] ?? 0;
    const delta = value - (popMean[f.i] ?? 0);
    const node = f.name.slice(0, -SENTIMENT_SUFFIX.length);
    if (!gainer || delta > gainer.delta) gainer = { node, delta, value };
    if (!angriest || value < angriest.value) angriest = { node, value };
  }

  const hostileFraction =
    sentIdx.length === 0
      ? 0
      : sentIdx.filter((f) => (clusterMean[f.i] ?? 0) <= HOSTILE).length / sentIdx.length;

  // A genuine winner amid an otherwise sour room = a rival capturing the moment.
  const rivalWins = !!gainer && gainer.delta > 0.3 && gainer.value > 0.2 && avgSent < 0.1;

  const label = pickLabel(avgSent, rivalWins);
  const summary = buildSummary({ share, avgSent, hostileFraction, angriest, gainer, rivalWins });

  return { label, summary, avgSentiment: avgSent };
}

/** Clean, card-ready cluster names that match Wake's outcome vocabulary. */
function pickLabel(avgSent: number, rivalWins: boolean): string {
  if (rivalWins) return "Competitors capitalize";
  if (avgSent >= 0.15) return "Smooth integration";
  if (avgSent >= 0) return "Cautious acceptance";
  if (avgSent >= -0.3) return "Simmering discontent";
  return "Full-blown backlash";
}

/** One tight, verifiable sentence — the node specifics that back the label. */
function buildSummary(args: {
  share: number;
  avgSent: number;
  hostileFraction: number;
  angriest: { node: string; value: number } | null;
  gainer: { node: string; delta: number; value: number } | null;
  rivalWins: boolean;
}): string {
  const { share, avgSent, hostileFraction, angriest, gainer, rivalWins } = args;
  const pct = Math.round(share * 100);
  const hostilePct = Math.round(hostileFraction * 100);

  if (rivalWins && gainer) {
    return `${pct}% of futures: the room sours (${hostilePct}% of nodes hostile), but ${prettyNode(gainer.node)} comes out ahead.`;
  }
  if (avgSent >= 0.15) {
    return `${pct}% of futures: sentiment holds broadly positive and the independence story sticks.`;
  }
  if (avgSent >= 0) {
    return `${pct}% of futures: a wary, mixed reception — net-neutral sentiment, no real blow-up.`;
  }
  const locus =
    angriest && angriest.value <= -0.5 ? `, led by ${prettyNode(angriest.node)}` : "";
  return `${pct}% of futures: sentiment turns sharply negative — ${hostilePct}% of nodes go hostile${locus}.`;
}

/**
 * World-agnostic prettifier: "prod-twitter" → "Prod Twitter",
 * "considered-notion-chose-competitor" → "Considered Notion Chose Competitor",
 * keeping short connectors lowercase for readability.
 */
const CONNECTORS = new Set(["of", "the", "to", "and", "for", "in", "on", "a"]);
export function prettyNode(id: string): string {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((w, i) =>
      i > 0 && CONNECTORS.has(w.toLowerCase())
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}
