import { centroid, mean } from "./stats";

/**
 * Turn clusters of runs into short, card-ready labels + grounded one-line
 * summaries, derived entirely from the data. Labelling is *holistic* (all
 * clusters at once) rather than per-cluster, because the headline labels come
 * from a fixed sentiment-tier vocabulary — and on low-variance real data two
 * clusters can fall in the same tier. We guarantee every cluster gets a
 * **distinct** label so the UI never shows two identical card headings.
 */
export interface ClusterCopy {
  label: string;
  summary: string;
  /** Mean sentiment across nodes — lets the pivotal copy order best→worst. */
  avgSentiment: number;
}

export interface LabelInput {
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

/** Per-cluster facts the label + summary are built from. */
interface ClusterStats {
  share: number;
  avgSent: number;
  hostileFraction: number;
  angriest: { node: string; value: number } | null;
  gainer: { node: string; delta: number; value: number } | null;
  rivalWins: boolean;
  baseLabel: string;
  /** Node that most distinguishes this cluster (max |Δ| vs population) — for tie-breaks. */
  distinctiveNode: string | null;
}

/** Label + summarise a whole set of clusters, guaranteeing distinct labels. */
export function describeClusters(inputs: LabelInput[]): ClusterCopy[] {
  const stats = inputs.map(computeStats);
  const labels = assignDistinctLabels(stats);
  return stats.map((s, i) => ({
    label: labels[i]!,
    summary: buildSummary(s),
    avgSentiment: s.avgSent,
  }));
}

/** Convenience for a single cluster (delegates to the holistic path). */
export function describeCluster(input: LabelInput): ClusterCopy {
  return describeClusters([input])[0]!;
}

function computeStats(input: LabelInput): ClusterStats {
  const { memberVectors, allVectors, featureNames, share } = input;

  const sentIdx = featureNames
    .map((name, i) => ({ name, i }))
    .filter((f) => f.name.endsWith(SENTIMENT_SUFFIX));

  const clusterMean = centroid(memberVectors);
  const popMean = centroid(allVectors);

  const avgSent = sentIdx.length === 0 ? 0 : mean(sentIdx.map((f) => clusterMean[f.i] ?? 0));

  // Standout nodes: the biggest gainer vs baseline (a rival winning here but not
  // elsewhere), the angriest by absolute sentiment, and the single most
  // distinctive mover (max |Δ|) used only to break label ties.
  let gainer: { node: string; delta: number; value: number } | null = null;
  let angriest: { node: string; value: number } | null = null;
  let distinctive: { node: string; absDelta: number } | null = null;
  for (const f of sentIdx) {
    const value = clusterMean[f.i] ?? 0;
    const delta = value - (popMean[f.i] ?? 0);
    const node = f.name.slice(0, -SENTIMENT_SUFFIX.length);
    if (!gainer || delta > gainer.delta) gainer = { node, delta, value };
    if (!angriest || value < angriest.value) angriest = { node, value };
    if (!distinctive || Math.abs(delta) > distinctive.absDelta) {
      distinctive = { node, absDelta: Math.abs(delta) };
    }
  }

  const hostileFraction =
    sentIdx.length === 0
      ? 0
      : sentIdx.filter((f) => (clusterMean[f.i] ?? 0) <= HOSTILE).length / sentIdx.length;

  const rivalWins = !!gainer && gainer.delta > 0.3 && gainer.value > 0.2 && avgSent < 0.1;

  return {
    share,
    avgSent,
    hostileFraction,
    angriest,
    gainer,
    rivalWins,
    baseLabel: pickBaseLabel(avgSent, rivalWins),
    distinctiveNode: distinctive?.node ?? null,
  };
}

/** Clean, card-ready cluster names that match Wake's outcome vocabulary. */
function pickBaseLabel(avgSent: number, rivalWins: boolean): string {
  if (rivalWins) return "Competitors capitalize";
  if (avgSent >= 0.15) return "Smooth integration";
  if (avgSent >= 0) return "Cautious acceptance";
  if (avgSent >= -0.3) return "Simmering discontent";
  return "Full-blown backlash";
}

/**
 * Make every label unique. Clusters that share a base label keep it on the
 * biggest cluster; the rest fall to a node-qualified variant
 * ("Full-blown backlash · Developer Twitter"), with a numeric suffix as the
 * final guarantee. Deterministic.
 */
function assignDistinctLabels(stats: ClusterStats[]): string[] {
  const groups = new Map<string, number[]>();
  stats.forEach((s, i) => {
    const arr = groups.get(s.baseLabel) ?? [];
    arr.push(i);
    groups.set(s.baseLabel, arr);
  });

  const final = new Array<string>(stats.length);
  const used = new Set<string>();

  for (const [base, idxs] of groups) {
    if (idxs.length === 1) {
      final[idxs[0]!] = makeUnique(base, used);
      continue;
    }
    // Primary (keeps the bare label) = biggest cluster, then most negative, then index.
    const ordered = [...idxs].sort(
      (a, b) =>
        stats[b]!.share - stats[a]!.share ||
        stats[a]!.avgSent - stats[b]!.avgSent ||
        a - b,
    );
    ordered.forEach((idx, rank) => {
      if (rank === 0) {
        final[idx] = makeUnique(base, used);
      } else {
        const q = stats[idx]!.distinctiveNode;
        final[idx] = makeUnique(q ? `${base} · ${prettyNode(q)}` : base, used);
      }
    });
  }
  return final;
}

function makeUnique(candidate: string, used: Set<string>): string {
  let label = candidate;
  let n = 2;
  while (used.has(label)) label = `${candidate} · ${n++}`;
  used.add(label);
  return label;
}

/** One tight, verifiable sentence — the node specifics that back the label. */
function buildSummary(s: ClusterStats): string {
  const { share, avgSent, hostileFraction, angriest, gainer, rivalWins } = s;
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
  // Match the wording to the tier: < -0.3 is the "Full-blown backlash" band;
  // -0.3..0 is "Simmering discontent" and shouldn't read as a full blow-up.
  const tone = avgSent < -0.3 ? "turns sharply negative" : "drifts into the negative";
  const locus =
    angriest && angriest.value <= -0.5 ? `, led by ${prettyNode(angriest.node)}` : "";
  return `${pct}% of futures: sentiment ${tone} — ${hostilePct}% of nodes go hostile${locus}.`;
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
