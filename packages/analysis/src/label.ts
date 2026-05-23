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
  //  - by *delta* from the population baseline → what makes this cluster distinct
  //    (e.g. a competitor that wins big here but not elsewhere),
  //  - by *absolute* sentiment → the actual locus of anger / cheer.
  let mostPosDelta: { node: string; delta: number } | null = null;
  let mostNegDelta: { node: string; delta: number } | null = null;
  let angriest: { node: string; value: number } | null = null;
  for (const f of sentIdx) {
    const value = clusterMean[f.i] ?? 0;
    const delta = value - (popMean[f.i] ?? 0);
    const node = f.name.slice(0, -SENTIMENT_SUFFIX.length);
    if (!mostNegDelta || delta < mostNegDelta.delta) mostNegDelta = { node, delta };
    if (!mostPosDelta || delta > mostPosDelta.delta) mostPosDelta = { node, delta };
    if (!angriest || value < angriest.value) angriest = { node, value };
  }

  const hostileCount = sentIdx.filter((f) => (clusterMean[f.i] ?? 0) <= HOSTILE).length;

  const label = pickLabel(avgSent, mostPosDelta, angriest);
  const summary = buildSummary({ share, avgSent, hostileCount, mostNegDelta, mostPosDelta });

  return { label, summary };
}

function pickLabel(
  avgSent: number,
  mostPosDelta: { node: string; delta: number } | null,
  angriest: { node: string; value: number } | null,
): string {
  // A standout winner amid an otherwise sour room reads as "someone else won".
  if (mostPosDelta && mostPosDelta.delta > 0.25 && avgSent < 0.1) {
    return `${prettyNode(mostPosDelta.node)} capitalizes`;
  }
  if (avgSent >= 0.15) return "Smooth integration";
  if (avgSent >= 0) return "Muted, mixed reception";
  if (avgSent >= -0.25) return "Simmering discontent";
  // Sharpest tier — name the locus if one node is clearly the angriest.
  if (angriest && angriest.value <= -0.5) return `Backlash led by ${prettyNode(angriest.node)}`;
  return "Sharp backlash";
}

function buildSummary(args: {
  share: number;
  avgSent: number;
  hostileCount: number;
  mostNegDelta: { node: string; delta: number } | null;
  mostPosDelta: { node: string; delta: number } | null;
}): string {
  const { share, avgSent, hostileCount, mostNegDelta, mostPosDelta } = args;
  const pct = Math.round(share * 100);

  const tone =
    avgSent >= 0.15
      ? "broadly positive"
      : avgSent >= 0
        ? "mildly positive"
        : avgSent >= -0.25
          ? "mildly negative"
          : "strongly negative";

  const parts: string[] = [`${pct}% of futures land here, with ${tone} average sentiment`];

  if (mostNegDelta && mostNegDelta.delta < -0.1) {
    parts.push(`${prettyNode(mostNegDelta.node)} turns notably more hostile than typical`);
  }
  if (mostPosDelta && mostPosDelta.delta > 0.1) {
    parts.push(`${prettyNode(mostPosDelta.node)} comes out ahead`);
  }
  if (hostileCount > 0) {
    parts.push(`${hostileCount} ${hostileCount === 1 ? "node" : "nodes"} end openly hostile`);
  }

  return capitalize(parts.join("; ")) + ".";
}

/** Generic, world-agnostic prettifier: "prod-twitter" → "Prod Twitter". */
export function prettyNode(id: string): string {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const capitalize = (s: string): string => (s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1));
