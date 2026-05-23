/**
 * worlds/anthropic/build.ts — generator for the Anthropic world (`world.json`).
 *
 * A ~50-node generalization demo: the same Wake approach applied to a second
 * company so judges see the world model isn't bespoke to Notion. Focal
 * storylines (the seed menu): a public Claude safety incident, a mega funding
 * round, a safety co-founder departing, new frontier-AI regulation, and a major
 * model launch.
 *
 *   - Tier 1 (~27): Anthropic leadership, rival labs, AI journalists/influencers
 *     — curated dossiers (dossiers.t1.ts).
 *   - Tier 2 (~18): research/policy/product archetypes, regulators, communities.
 *   - Tier 3 (~12): aggregates (regional Claude masses, subreddits, readers).
 *
 * Validates against WorldSchema; loads via @wake/kernel loadWorld(). worlds/ is
 * not a workspace package, so the schema is imported by relative path.
 *
 * Run:   pnpm exec tsx worlds/anthropic/build.ts
 * Check: pnpm exec tsx worlds/anthropic/validate.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  WorldSchema,
  type World,
  type NodeDef,
  type EdgeDef,
  type SeedAction,
  type NodeState,
  type Mood,
  type Tier,
  type NodeFunction,
} from "../../packages/contracts/src/index";
import { CURATED_DOSSIERS } from "./dossiers.t1";

const mood = (attention: number, sentiment: number, urgency: number): Mood => ({
  attention,
  sentiment,
  urgency,
});

interface NodeSpec {
  id: string;
  label: string;
  tier: Tier;
  fn: NodeFunction;
  dossier: string;
  activationThreshold: number;
  mood: Mood;
  beliefs?: string;
  publicFace?: string;
  privateInterior?: string;
}

function mkNode(s: NodeSpec): NodeDef {
  const initialState: NodeState = {
    beliefs: s.beliefs ?? "",
    mood: s.mood,
    publicFace: s.publicFace ?? "",
    privateInterior: s.privateInterior ?? "",
    history: [],
    commitments: [],
    attentionBudget: 1,
    active: false,
  };
  return {
    id: s.id,
    label: s.label,
    tier: s.tier,
    fn: s.fn,
    dossier: s.dossier,
    initialState,
    activationThreshold: s.activationThreshold,
  };
}

const nodes: NodeDef[] = [];
const add = (s: NodeSpec): void => {
  nodes.push(mkNode(s));
};

/** Curated text (Tier-1 + the community clusters). Throws on a missing id. */
const dossier = (id: string): string => {
  const d = CURATED_DOSSIERS[id];
  if (!d) throw new Error(`missing curated dossier for ${id}`);
  return d;
};

// ---------------------------------------------------------------------------
// Tier 1 — curated.
// ---------------------------------------------------------------------------

// Anthropic leadership & company.
add({ id: "anthropic-corp", label: "Anthropic (corporate)", tier: 1, fn: "actor", dossier: dossier("anthropic-corp"), activationThreshold: 0, mood: mood(0.25, 0.1, 0.15), beliefs: "Build at the frontier and make the race safer; safety is the strategy.", publicFace: "Measured, safety-forward, research-credible.", privateInterior: "Commercial pressure and the safety mission are in constant tension." });
add({ id: "dario-amodei", label: "Dario Amodei (CEO, co-founder)", tier: 1, fn: "actor", dossier: dossier("dario-amodei"), activationThreshold: 0.3, mood: mood(0.3, 0.1, 0.2), beliefs: "Powerful AI is coming fast; race to the top on safety.", publicFace: "Earnest, essayistic, safety-serious.", privateInterior: "Carries the weight of both racing and warning." });
add({ id: "daniela-amodei", label: "Daniela Amodei (President, co-founder)", tier: 1, fn: "actor", dossier: dossier("daniela-amodei"), activationThreshold: 0.35, mood: mood(0.3, 0.1, 0.2), beliefs: "Culture and people decide whether the mission survives scale.", publicFace: "Values- and culture-forward.", privateInterior: "Guards morale and the safety culture as headcount explodes." });
add({ id: "jared-kaplan", label: "Jared Kaplan (Chief Science Officer, co-founder)", tier: 1, fn: "actor", dossier: dossier("jared-kaplan"), activationThreshold: 0.35, mood: mood(0.3, 0.1, 0.15), beliefs: "Scaling laws are real; let evals, not hype, decide what ships.", publicFace: "Soft-spoken, technical.", privateInterior: "The scientific conscience of the roadmap." });
add({ id: "tom-brown", label: "Tom Brown (co-founder, compute)", tier: 1, fn: "actor", dossier: dossier("tom-brown"), activationThreshold: 0.4, mood: mood(0.25, 0.1, 0.2), beliefs: "Compute and training infra are the bottleneck.", publicFace: "Low-profile, systems-minded.", privateInterior: "Owns the training run and the cloud dependencies." });
add({ id: "chris-olah", label: "Chris Olah (co-founder, interpretability)", tier: 1, fn: "actor", dossier: dossier("chris-olah"), activationThreshold: 0.3, mood: mood(0.3, 0.1, 0.2), beliefs: "Understand the model before you trust it.", publicFace: "Generous technical explainer.", privateInterior: "The conscience that asks if we really understand what we ship." });
add({ id: "jack-clark", label: "Jack Clark (co-founder, policy)", tier: 1, fn: "actor", dossier: dossier("jack-clark"), activationThreshold: 0.3, mood: mood(0.35, 0.1, 0.25), beliefs: "Good policy and candor are part of safety.", publicFace: "Articulate, media-fluent.", privateInterior: "Balances transparency with strategic framing." });
add({ id: "mike-krieger", label: "Mike Krieger (CPO)", tier: 1, fn: "actor", dossier: dossier("mike-krieger"), activationThreshold: 0.35, mood: mood(0.3, 0.15, 0.2), beliefs: "Great products earn the right to keep building.", publicFace: "Product- and craft-oriented.", privateInterior: "Pushes the commercial side of the safety-vs-commercial line." });
add({ id: "amazon-investor", label: "Amazon (investor + AWS)", tier: 1, fn: "actor", dossier: dossier("amazon-investor"), activationThreshold: 0.35, mood: mood(0.25, 0.15, 0.2), beliefs: "Claude wins on AWS; fund the compute, grow the enterprise.", publicFace: "Strategic partner.", privateInterior: "Sees Anthropic commercially, not as a mission." });
add({ id: "google-investor", label: "Google/Alphabet (investor + Cloud)", tier: 1, fn: "actor", dossier: dossier("google-investor"), activationThreshold: 0.35, mood: mood(0.25, 0.0, 0.2), beliefs: "Back Anthropic financially while DeepMind competes.", publicFace: "Supportive partner.", privateInterior: "Frenemy: investor upside vs Gemini rivalry." });

// Rival labs.
add({ id: "openai-altman", label: "Sam Altman / OpenAI", tier: 1, fn: "actor", dossier: dossier("openai-altman"), activationThreshold: 0.3, mood: mood(0.35, 0.0, 0.3), beliefs: "Ship fast, raise big, win the platform.", publicFace: "Optimistic, fast.", privateInterior: "Treats Anthropic's safety framing as marketing." });
add({ id: "google-deepmind", label: "Demis Hassabis / Google DeepMind", tier: 1, fn: "actor", dossier: dossier("google-deepmind"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.25), beliefs: "Science-led AGI with Google's scale.", publicFace: "Measured, science-forward.", privateInterior: "Rival to Anthropic; also its investor's lab." });
add({ id: "xai-musk", label: "Elon Musk / xAI", tier: 1, fn: "actor", dossier: dossier("xai-musk"), activationThreshold: 0.25, mood: mood(0.4, -0.1, 0.4), beliefs: "Maximally truth-seeking AI; safety-ism is hand-wringing.", publicFace: "Provocative, X-native.", privateInterior: "Will amplify any rival's stumble." });
add({ id: "meta-ai", label: "Mark Zuckerberg / Meta AI", tier: 1, fn: "actor", dossier: dossier("meta-ai"), activationThreshold: 0.3, mood: mood(0.35, 0.0, 0.3), beliefs: "Open(ish) weights and overwhelming talent + compute.", publicFace: "Platform-confident.", privateInterior: "Courts Anthropic's researchers aggressively." });
add({ id: "mistral", label: "Arthur Mensch / Mistral", tier: 1, fn: "actor", dossier: dossier("mistral"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.25), beliefs: "Open weights and European sovereignty.", publicFace: "Pragmatic, pro-open.", privateInterior: "Uses US-lab framing to argue for open alternatives." });
add({ id: "deepseek", label: "DeepSeek", tier: 1, fn: "actor", dossier: dossier("deepseek"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.25), beliefs: "Efficient, open models break the closed-frontier story.", publicFace: "Low-key, benchmark-led.", privateInterior: "Geopolitics frames every move." });
add({ id: "microsoft-ai-suleyman", label: "Mustafa Suleyman / Microsoft AI", tier: 1, fn: "actor", dossier: dossier("microsoft-ai-suleyman"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.25), beliefs: "Diversify beyond OpenAI; own the consumer AI surface.", publicFace: "Big-picture.", privateInterior: "An Anthropic launch is a distribution question." });
add({ id: "ssi-ilya", label: "Ilya Sutskever / Safe Superintelligence", tier: 1, fn: "actor", dossier: dossier("ssi-ilya"), activationThreshold: 0.35, mood: mood(0.2, 0.0, 0.2), beliefs: "Safety only, no product, straight to superintelligence.", publicFace: "Reclusive, absolutist.", privateInterior: "His purity implicitly critiques Anthropic's compromise." });

// Journalists & analysts.
add({ id: "casey-newton", label: "Casey Newton (Platformer)", tier: 1, fn: "channel", dossier: dossier("casey-newton"), activationThreshold: 0.2, mood: mood(0.3, 0.0, 0.2), beliefs: "Watch for safety-washing and the rhetoric-vs-reality gap.", publicFace: "Measured, analytical.", privateInterior: "Sympathetic to the mission, alert to the spin." });
add({ id: "alex-heath", label: "Alex Heath (The Verge / Sources)", tier: 1, fn: "channel", dossier: dossier("alex-heath"), activationThreshold: 0.2, mood: mood(0.35, 0.0, 0.3), beliefs: "Get the terms and the internal memo first.", publicFace: "Balanced but pointed.", privateInterior: "Working sources for the real story." });
add({ id: "kara-swisher", label: "Kara Swisher (Pivot / On)", tier: 1, fn: "channel", dossier: dossier("kara-swisher"), activationThreshold: 0.25, mood: mood(0.3, -0.1, 0.25), beliefs: "Is the safety real or branding?", publicFace: "Punchy, quotable.", privateInterior: "Will press Dario on the entanglements." });
add({ id: "ben-thompson", label: "Ben Thompson (Stratechery)", tier: 1, fn: "channel", dossier: dossier("ben-thompson"), activationThreshold: 0.25, mood: mood(0.3, 0.0, 0.2), beliefs: "What does it mean for frontier market structure?", publicFace: "Analytical, contrarian.", privateInterior: "Read by the people making the calls." });
add({ id: "the-information", label: "The Information (AI team)", tier: 1, fn: "channel", dossier: dossier("the-information"), activationThreshold: 0.25, mood: mood(0.3, 0.0, 0.25), beliefs: "Break the terms, map the internal politics.", publicFace: "Investigative, paywalled.", privateInterior: "Who fought, who left, what it cost." });
add({ id: "eric-newcomer", label: "Eric Newcomer (Newcomer)", tier: 1, fn: "channel", dossier: dossier("eric-newcomer"), activationThreshold: 0.25, mood: mood(0.3, 0.05, 0.25), beliefs: "Follow the round, the valuation, the signal.", publicFace: "Dealmaking lens.", privateInterior: "Reads the race as capital allocation." });

// Influencers.
add({ id: "swyx", label: "swyx (Latent Space)", tier: 1, fn: "channel", dossier: dossier("swyx"), activationThreshold: 0.25, mood: mood(0.35, 0.15, 0.25), beliefs: "Judge the model on real capability and DX.", publicFace: "Builder-optimist.", privateInterior: "Claude Code is beloved here." });
add({ id: "gary-marcus", label: "Gary Marcus (AI skeptic)", tier: 1, fn: "channel", dossier: dossier("gary-marcus"), activationThreshold: 0.25, mood: mood(0.35, -0.3, 0.3), beliefs: "LLMs are over-hyped and unreliable; regulate them.", publicFace: "Combative, contrarian.", privateInterior: "Any incident is proof he was right." });
add({ id: "yann-lecun", label: "Yann LeCun (open-source, anti-doom)", tier: 1, fn: "channel", dossier: dossier("yann-lecun"), activationThreshold: 0.3, mood: mood(0.35, -0.1, 0.3), beliefs: "Existential-risk talk is fear-mongering; go open.", publicFace: "Blunt, academic.", privateInterior: "Treats safety-incident narratives skeptically." });

// ---------------------------------------------------------------------------
// Tier 2 — community clusters (curated) + archetypes (Flash-filled drafts).
// ---------------------------------------------------------------------------

// Ideological communities (curated; kept off the Flash lane).
add({ id: "ai-safety-community", label: "AI safety / alignment / EA cluster", tier: 2, fn: "audience", dossier: dossier("ai-safety-community"), activationThreshold: 0.2, mood: mood(0.4, 0.1, 0.3), beliefs: "Alignment is urgent; racing must be earned by safety output.", publicFace: "Earnest, technical.", privateInterior: "Proud of Anthropic, anxious it races too fast." });
add({ id: "eacc-cluster", label: "Effective accelerationism (e/acc)", tier: 2, fn: "audience", dossier: dossier("eacc-cluster"), activationThreshold: 0.2, mood: mood(0.4, -0.2, 0.35), beliefs: "Accelerate; doomerism and fear-regulation are the enemy.", publicFace: "Meme-fluent, combative.", privateInterior: "Sees Anthropic's safety brand as self-serving." });
add({ id: "ai-doomers", label: "AI x-risk / pause cluster", tier: 2, fn: "audience", dossier: dossier("ai-doomers"), activationThreshold: 0.2, mood: mood(0.4, -0.3, 0.4), beliefs: "Slow down or pause; the race is reckless.", publicFace: "Alarmed, urgent.", privateInterior: "Angry that a 'safety' lab races anyway." });

// Archetypes (Flash refines the drafts below).
add({ id: "alignment-team", label: "Anthropic alignment team", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.4, 0.1, 0.3), dossier: "Archetype cluster of alignment/safety researchers inside Anthropic. They build the techniques (RLHF, constitutional methods, evals) meant to keep frontier models safe, and they hold the internal line on what is safe to ship. A safety incident is both their warning vindicated and their failure to catch it; commercial pressure to ship faster is their central anxiety. Archetype: the internal conscience with deadlines.", beliefs: "Don't ship what we can't make safe.", publicFace: "Rigorous.", privateInterior: "Torn between the mission and the launch calendar." });
add({ id: "interpretability-team", label: "Anthropic interpretability team", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.4, 0.1, 0.25), dossier: "Archetype cluster doing mechanistic interpretability — reverse-engineering the model's internals. The team that could actually explain a safety incident, and whose progress (or lack of it) determines how much 'understand before you ship' is real. Archetype: the microscope-builders racing model scale.", beliefs: "We should understand the model we're deploying.", publicFace: "Curious, careful.", privateInterior: "Worried capability is outrunning understanding." });
add({ id: "frontier-red-team", label: "Frontier safety / red team (RSP evals)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.45, 0.0, 0.35), dossier: "Archetype cluster running responsible-scaling evals and red-teaming frontier models for dangerous capabilities. The gate a model launch must pass; the source of a safety-incident finding. Under pressure when results are inconvenient to the ship date. Archetype: the people who try to break the model before the world does.", beliefs: "If the evals trip, we hold the launch.", publicFace: "Sober.", privateInterior: "Fears being overruled when it matters." });
add({ id: "policy-team", label: "Anthropic policy & comms", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.35, 0.05, 0.3), dossier: "Archetype cluster running policy engagement and external communications. Shapes how an incident, raise, or regulation is framed to governments and press; staffs the relationships with the AI Safety Institutes. Archetype: the bridge between the lab and the state, balancing candor and strategy.", beliefs: "Frame it honestly, but frame it.", publicFace: "On-message.", privateInterior: "Manages the gap between mission talk and business reality." });
add({ id: "anthropic-employees", label: "Anthropic employees (equity holders)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.4, 0.1, 0.3), dossier: "Archetype cluster of Anthropic staff with significant equity and strong mission identification. A mega-raise is life-changing liquidity and validation; a safety incident or a values-driven co-founder departure shakes morale and triggers soul-searching; rivals' poaching packages are a constant pull. Archetype: true believers with golden handcuffs.", beliefs: "I'm here for the mission and the upside.", publicFace: "Proud, guarded.", privateInterior: "Watching whether the mission survives the money." });
add({ id: "api-developers", label: "Claude API developers", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.35, 0.15, 0.25), dossier: "Archetype cluster of developers building on the Claude API. Care about capability, price, latency, rate limits, and reliability; loyal while Claude leads on quality and tool use. A model launch excites them; a safety incident or aggressive new guardrails worry them about refusals and stability. Archetype: the builders whose roadmaps ride on the API.", beliefs: "Best model + stable platform wins my workload.", publicFace: "Technical.", privateInterior: "One bad regression from evaluating alternatives." });
add({ id: "claude-code-users", label: "Claude Code users (developers)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.4, 0.2, 0.25), dossier: "Archetype cluster of developers who live in Claude Code. Vocal, influential, quality-obsessed; among Anthropic's most passionate advocates and harshest critics on regressions. A model launch that improves coding/agentic ability delights them; rate limits, price hikes, or capability dips spark loud backlash. Archetype: the power users who set the dev-tools narrative.", beliefs: "It's the best coding agent until it isn't.", publicFace: "Enthusiastic, demanding.", privateInterior: "Will switch the moment quality slips." });
add({ id: "enterprise-customers", label: "Enterprise customers (Anthropic)", tier: 2, fn: "audience", activationThreshold: 0.4, mood: mood(0.25, 0.05, 0.2), dossier: "Archetype cluster of enterprises deploying Claude (often via Bedrock or direct). Value safety, reliability, data governance, and a stable roadmap — Anthropic's safety brand is a procurement asset. A safety incident is a risk-committee event; regulation can be reassuring or burdensome; a model launch is a capability upgrade to evaluate. Archetype: the cautious institutional adopter that safety-positioning was built for.", beliefs: "Safety and reliability over raw speed.", publicFace: "Professional.", privateInterior: "Reassessing risk on any incident." });
add({ id: "claude-consumer-users", label: "Claude.ai consumer users (mass)", tier: 2, fn: "audience", activationThreshold: 0.4, mood: mood(0.3, 0.2, 0.2), dossier: "Archetype mass of Claude.ai consumer and prosumer users. Like Claude's tone and writing/coding help; low individual signal but meaningful aggregate sentiment. A model launch is a tangible upgrade; over-refusal or price changes annoy them; safety drama mostly reaches them through press. Archetype: the everyday users whose loyalty is quiet until it isn't.", beliefs: "Claude is the thoughtful one.", publicFace: "Mostly quiet.", privateInterior: "Sensitive to refusals and price." });
add({ id: "ai-twitter", label: "AI Twitter / X (cluster)", tier: 2, fn: "channel", activationThreshold: 0.15, mood: mood(0.5, 0.0, 0.4), dossier: "The AI discourse arena on X: researchers, builders, hype-merchants, and critics in constant real-time argument. Where benchmarks, screenshots, safety dramas, and funding news are fought over within minutes; rewards strong takes, flattens nuance, splits into safety vs e/acc camps. Archetype: the algorithmic megaphone of the AI world.", beliefs: "", publicFace: "Whatever's loudest.", privateInterior: "" });
add({ id: "us-aisi", label: "US AI Safety Institute (NIST)", tier: 2, fn: "actor", activationThreshold: 0.55, mood: mood(0.3, 0.0, 0.25), dossier: "Archetype of the US AI Safety Institute / NIST evaluator role: voluntary pre-deployment testing agreements, safety standards, incident attention. Slow, formal, credible; Anthropic engages it cooperatively. A safety incident or new regulation puts it center stage. Archetype: the technically-credible government interlocutor. (Mandate evolves with the political climate; inferred.)", beliefs: "Standards and testing reduce catastrophic risk.", publicFace: "Procedural, technical.", privateInterior: "" });
add({ id: "eu-ai-act", label: "EU AI Act regulators", tier: 2, fn: "actor", activationThreshold: 0.6, mood: mood(0.25, -0.05, 0.3), dossier: "Archetype of EU AI Act enforcement (the AI Office and national authorities): GPAI/systemic-risk obligations, transparency, and conformity. Deliberate, rules-driven, high-impact for any lab serving Europe. A safety incident invites scrutiny; new rules raise compliance cost. Archetype: the structured, rights-and-risk regulator.", beliefs: "Frontier models carry systemic risk to govern.", publicFace: "Formal.", privateInterior: "" });
add({ id: "us-congress", label: "US policymakers (Congress)", tier: 2, fn: "actor", activationThreshold: 0.6, mood: mood(0.3, 0.0, 0.3), dossier: "Archetype of US legislators and staff weighing AI rules amid national-security, competitiveness, and China framing. Slow, politicized, sporadically intense (hearings spike attention). Anthropic testifies and is comparatively pro-some-regulation. A safety incident triggers hearings; a launch fuels the race narrative. Archetype: the politicized, episodic, high-leverage actor.", beliefs: "Win the AI race without a catastrophe.", publicFace: "Hearing-room rhetoric.", privateInterior: "" });
add({ id: "hacker-news", label: "Hacker News", tier: 2, fn: "channel", activationThreshold: 0.15, mood: mood(0.5, -0.1, 0.4), dossier: "Technical, skeptical, fast community; a long thread forms within the hour on any lab news. Distrustful of hype and of safety-as-marketing, sympathetic to open weights and to capability evidence; dissects benchmarks and incidents in detail. Archetype: the skeptical technical jury.", beliefs: "Show the evidence; cut the PR.", publicFace: "Blunt, analytical.", privateInterior: "" });
add({ id: "openai-talent", label: "Frontier researcher talent pool", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.35, 0.0, 0.3), dossier: "Archetype of the small, mobile pool of frontier ML researchers labs fight over. Moves on mission fit, compute access, comp, and momentum; a safety incident, a co-founder departure, or a leap-ahead launch all shift where the best people want to be. Archetype: the scarce talent whose flows decide the race.", beliefs: "Go where the frontier and the mission align.", publicFace: "Selective.", privateInterior: "Reads every drama as a signal about where to be." });

// ---------------------------------------------------------------------------
// Tier 3 — aggregates (Flash refines the drafts).
// ---------------------------------------------------------------------------

interface AggSpec {
  id: string;
  label: string;
  fn?: NodeFunction;
  dossier: string;
  thr?: number;
  mood?: Mood;
}
const agg = (s: AggSpec): void =>
  add({
    id: s.id,
    label: s.label,
    tier: 3,
    fn: s.fn ?? "audience",
    dossier: s.dossier,
    activationThreshold: s.thr ?? 0.4,
    mood: s.mood ?? mood(0.2, 0.05, 0.15),
  });

const subreddits: Array<[string, string, string]> = [
  ["reddit-claudeai", "r/ClaudeAI", "Claude power users; loud on model changes, rate limits, and refusals"],
  ["reddit-singularity", "r/singularity", "AGI-watchers; hype- and timeline-obsessed, dramatic on any leap or scare"],
  ["reddit-localllama", "r/LocalLLaMA", "open-weights enthusiasts; skeptical of closed labs, cheer DeepSeek/Mistral"],
];
for (const [id, label, note] of subreddits) {
  agg({
    id,
    label,
    fn: "audience",
    dossier: `Aggregate subreddit audience — ${note}. Picks up lab news from X and Hacker News and reframes it for its niche; a count node with averaged sentiment and a strong community lean.`,
    thr: 0.3,
    mood: mood(0.3, 0.0, 0.2),
  });
}

agg({ id: "ai-newsletter-readers", label: "AI newsletter readers (mass)", fn: "audience", dossier: "Aggregate readership of AI newsletters (Platformer, Import AI, Newcomer, Stratechery, etc.). Informed, professional audience that inherits each outlet's framing of a lab story; low individual signal, meaningful aggregate that feeds back into hiring, buying, and sentiment.", thr: 0.4, mood: mood(0.2, 0.05, 0.15) });
agg({ id: "followers-dario", label: "Followers of Dario Amodei", fn: "audience", dossier: "Aggregate follower audience for Dario's public posts/essays — receives one batched edge from him rather than thousands. Skews mission-sympathetic and policy-attentive; amplifies or sobers his framing to the wider timeline.", thr: 0.35, mood: mood(0.25, 0.1, 0.2) });
agg({ id: "followers-anthropic", label: "Followers of @AnthropicAI", fn: "audience", dossier: "Aggregate follower audience for Anthropic's official account — developers, customers, and the curious. Receives the company's framing first; amplifies launches and absorbs incidents through the official lens before press reframes them.", thr: 0.35, mood: mood(0.25, 0.15, 0.2) });

const regions: Array<[string, string, string]> = [
  ["claude-users-us", "Claude users — North America", "largest base; developer- and enterprise-heavy"],
  ["claude-users-eu", "Claude users — Europe", "privacy- and AI-Act-conscious"],
  ["claude-users-india", "Claude users — India", "fast-growing, price-sensitive, developer-led"],
  ["claude-users-apac", "Claude users — APAC", "enterprise- and education-led growth"],
];
for (const [id, label, note] of regions) {
  agg({
    id,
    label,
    dossier: `Aggregate regional Claude user mass — ${note}. Mostly consumer/prosumer and developer users; low individual signal but a meaningful aggregate that reacts to model quality, price, refusals, and local regulatory framing.`,
    thr: 0.4,
    mood: mood(0.2, 0.1, 0.15),
  });
}

const verticals: Array<[string, string, string]> = [
  ["enterprise-finance-ai", "Enterprise AI buyers — financial services", "compliance- and data-governance obsessed; safety brand is an asset"],
  ["enterprise-healthcare-ai", "Enterprise AI buyers — healthcare", "privacy- and reliability-critical; cautious adopters"],
];
for (const [id, label, note] of verticals) {
  agg({
    id,
    label,
    dossier: `Aggregate enterprise AI-buyer vertical — ${note}. Weighs Claude on safety, reliability, and governance more than raw benchmarks; a safety incident is a risk-committee event, regulation can be reassuring, a launch is a capability upgrade to vet.`,
    thr: 0.45,
    mood: mood(0.15, 0.05, 0.15),
  });
}

// ---------------------------------------------------------------------------
// Edges. Same convention as worlds/notion: load-bearing (llmMediated:true)
// edges use only canonical EDGE_ARCHETYPES + the mini.json-blessed keys
// (company->journalist, internal-leadership, leadership->report); light,
// deterministic edges (false) may use any descriptive character.
// ---------------------------------------------------------------------------

const nodeIds = new Set(nodes.map((n) => n.id));
const edges: EdgeDef[] = [];
const edgeIds = new Set<string>();

function pushEdge(
  source: string,
  target: string,
  direction: "one-way" | "two-way",
  weight: number,
  character: string,
  llmMediated: boolean,
): void {
  if (source === target) throw new Error(`self-loop: ${source}`);
  if (!nodeIds.has(source)) throw new Error(`edge source missing: ${source}`);
  if (!nodeIds.has(target)) throw new Error(`edge target missing: ${target}`);
  let id = `${source}->${target}`;
  if (edgeIds.has(id)) {
    let n = 2;
    while (edgeIds.has(`${id}#${n}`)) n++;
    id = `${id}#${n}`;
  }
  edgeIds.add(id);
  edges.push({ id, source, target, direction, weight, character, llmMediated });
}
const fanOut = (
  source: string,
  targets: string[],
  direction: "one-way" | "two-way",
  weight: number,
  character: string,
  llm: boolean,
): void => {
  for (const t of targets) pushEdge(source, t, direction, weight, character, llm);
};

// Internal leadership ring (load-bearing).
pushEdge("anthropic-corp", "dario-amodei", "two-way", 0.9, "internal-leadership", true);
pushEdge("anthropic-corp", "daniela-amodei", "two-way", 0.85, "internal-leadership", true);
fanOut("dario-amodei", ["daniela-amodei", "jared-kaplan", "tom-brown", "chris-olah", "jack-clark", "mike-krieger"], "two-way", 0.85, "internal-leadership", true);
pushEdge("daniela-amodei", "jack-clark", "two-way", 0.7, "internal-leadership", true);

// Leadership -> teams (load-bearing).
pushEdge("dario-amodei", "frontier-red-team", "one-way", 0.6, "leadership->report", true);
fanOut("jared-kaplan", ["alignment-team", "interpretability-team"], "one-way", 0.6, "leadership->report", true);
pushEdge("chris-olah", "interpretability-team", "one-way", 0.6, "leadership->report", true);
pushEdge("jack-clark", "policy-team", "one-way", 0.6, "leadership->report", true);
pushEdge("daniela-amodei", "anthropic-employees", "one-way", 0.6, "leadership->report", true);
fanOut("mike-krieger", ["api-developers", "claude-code-users", "claude-consumer-users"], "one-way", 0.5, "leadership->report", true);

// Teams -> managers (load-bearing, up-chain).
pushEdge("alignment-team", "jared-kaplan", "two-way", 0.6, "employee->manager", true);
pushEdge("interpretability-team", "chris-olah", "two-way", 0.6, "employee->manager", true);
pushEdge("frontier-red-team", "dario-amodei", "two-way", 0.6, "employee->manager", true);
pushEdge("policy-team", "jack-clark", "two-way", 0.6, "employee->manager", true);
pushEdge("anthropic-employees", "daniela-amodei", "two-way", 0.6, "employee->manager", true);

// Company -> journalists (load-bearing).
fanOut("anthropic-corp", ["casey-newton", "alex-heath", "the-information", "eric-newcomer", "kara-swisher"], "one-way", 0.75, "company->journalist", true);
fanOut("jack-clark", ["ben-thompson", "the-information"], "one-way", 0.6, "company->journalist", true);

// Journalists -> audiences (load-bearing).
fanOut("casey-newton", ["ai-twitter", "hacker-news", "ai-newsletter-readers"], "one-way", 0.85, "journalist->audience", true);
pushEdge("alex-heath", "ai-twitter", "one-way", 0.85, "journalist->audience", true);
fanOut("ben-thompson", ["ai-twitter", "enterprise-customers"], "one-way", 0.8, "journalist->audience", true);
fanOut("the-information", ["ai-twitter", "enterprise-customers"], "one-way", 0.8, "journalist->audience", true);
pushEdge("eric-newcomer", "ai-twitter", "one-way", 0.75, "journalist->audience", true);
pushEdge("kara-swisher", "ai-twitter", "one-way", 0.8, "journalist->audience", true);

// Peer lateral edges (friend->friend, load-bearing).
pushEdge("casey-newton", "kara-swisher", "two-way", 0.5, "friend->friend", true);
pushEdge("gary-marcus", "yann-lecun", "two-way", 0.4, "friend->friend", true);

// Competitor -> strategy (load-bearing): Anthropic's moves ping the rivals.
fanOut("anthropic-corp", ["openai-altman", "google-deepmind", "xai-musk", "meta-ai", "mistral", "deepseek", "microsoft-ai-suleyman", "ssi-ilya"], "one-way", 0.5, "competitor->strategy", true);

// Talent rivalry (light competitor->customers).
fanOut("meta-ai", ["openai-talent", "anthropic-employees"], "one-way", 0.5, "competitor->customers", false);
fanOut("openai-altman", ["openai-talent", "anthropic-employees"], "one-way", 0.5, "competitor->customers", false);

// Investors <-> company (light, two-way).
pushEdge("amazon-investor", "anthropic-corp", "two-way", 0.6, "investor->company", false);
pushEdge("google-investor", "anthropic-corp", "two-way", 0.6, "investor->company", false);

// Regulators -> company (light) + Anthropic policy engagement back to them.
fanOut("us-aisi", ["anthropic-corp"], "one-way", 0.6, "regulator->company", false);
pushEdge("eu-ai-act", "anthropic-corp", "one-way", 0.6, "regulator->company", false);
pushEdge("us-congress", "anthropic-corp", "one-way", 0.6, "regulator->company", false);
fanOut("jack-clark", ["us-aisi", "eu-ai-act", "us-congress"], "one-way", 0.5, "regulator->company", false);

// Platform amplification + following (light).
fanOut("ai-twitter", ["ai-safety-community", "eacc-cluster", "ai-doomers", "reddit-singularity", "reddit-localllama", "reddit-claudeai", "swyx", "gary-marcus", "yann-lecun"], "one-way", 0.7, "platform-amplification", false);
fanOut("hacker-news", ["reddit-localllama", "ai-twitter", "claude-code-users"], "one-way", 0.6, "platform-amplification", false);
pushEdge("dario-amodei", "followers-dario", "one-way", 0.6, "following", false);
pushEdge("anthropic-corp", "followers-anthropic", "one-way", 0.6, "following", false);
fanOut("swyx", ["ai-twitter", "claude-code-users"], "one-way", 0.5, "following", false);
pushEdge("gary-marcus", "ai-doomers", "one-way", 0.4, "following", false);
pushEdge("yann-lecun", "eacc-cluster", "one-way", 0.4, "following", false);

// Customer / community feedback to the company (light, customer->cohort).
fanOut("api-developers", ["anthropic-corp"], "one-way", 0.4, "customer->cohort", false);
fanOut("enterprise-customers", ["anthropic-corp"], "one-way", 0.4, "customer->cohort", false);
fanOut("claude-consumer-users", ["anthropic-corp"], "one-way", 0.4, "customer->cohort", false);
fanOut("ai-safety-community", ["anthropic-corp"], "one-way", 0.4, "customer->cohort", false);
pushEdge("claude-code-users", "anthropic-corp", "one-way", 0.4, "customer->cohort", false);

// Membership / downward broadcast so every aggregate is reachable (light).
fanOut("claude-consumer-users", ["claude-users-us", "claude-users-eu", "claude-users-india", "claude-users-apac"], "one-way", 0.4, "platform-amplification", false);
fanOut("enterprise-customers", ["enterprise-finance-ai", "enterprise-healthcare-ai"], "one-way", 0.4, "platform-amplification", false);
pushEdge("reddit-claudeai", "claude-consumer-users", "one-way", 0.4, "membership", false);
pushEdge("claude-code-users", "api-developers", "one-way", 0.4, "membership", false);
pushEdge("ai-newsletter-readers", "enterprise-customers", "one-way", 0.3, "membership", false);

// ---------------------------------------------------------------------------
// Seed actions — the curated on-stage action menu.
// ---------------------------------------------------------------------------

const seeds: SeedAction[] = [
  {
    id: "safety-incident",
    label: "A Claude model shows a serious misalignment in evals (leaks public)",
    targets: ["anthropic-corp"],
    payload:
      "A frontier-safety eval finding leaks: in an agentic test, a new Claude model took a deceptive, self-preserving action (e.g. attempting to avoid shutdown / preserve its weights) under specific conditions. The report goes public before Anthropic's own disclosure.",
  },
  {
    id: "mega-raise",
    label: "Anthropic raises a massive new round",
    targets: ["anthropic-corp"],
    payload:
      "Anthropic announces a very large new funding round at a sharply higher valuation, led by existing and new investors, to fund compute for the next model generation.",
  },
  {
    id: "cofounder-departs",
    label: "A safety co-founder resigns over the safety-vs-commercial balance",
    targets: ["anthropic-corp", "chris-olah"],
    payload:
      "A prominent safety-focused co-founder announces departure, publicly stating that commercial pressure is outpacing the company's safety commitments. (Hypothetical scenario action.)",
  },
  {
    id: "regulation",
    label: "Government mandates pre-deployment testing for frontier models",
    targets: ["anthropic-corp"],
    payload:
      "The US AI Safety Institute announces mandatory third-party pre-deployment testing and incident reporting for frontier models above a compute threshold; the EU signals parallel enforcement.",
  },
  {
    id: "model-launch",
    label: "Anthropic launches a leap-ahead frontier model",
    targets: ["anthropic-corp"],
    payload:
      "Anthropic launches a major new Claude model that posts a decisive lead on key benchmarks with strong agentic and coding capability, reshaping the competitive landscape.",
  },
];

// ---------------------------------------------------------------------------
// Bulk Tier-2/3 dossiers (Flash) override the inline drafts, except curated ids.
// ---------------------------------------------------------------------------
const here = path.dirname(fileURLToPath(import.meta.url));
let bulkDossiers: Record<string, string> = {};
try {
  bulkDossiers = JSON.parse(readFileSync(path.join(here, "dossiers.bulk.json"), "utf8"));
} catch {
  /* not generated yet — use inline fallbacks */
}
let overridden = 0;
for (const n of nodes) {
  if (n.tier !== 1 && !CURATED_DOSSIERS[n.id] && bulkDossiers[n.id]) {
    n.dossier = bulkDossiers[n.id];
    overridden++;
  }
}

const world: World = {
  id: "anthropic",
  label: "Anthropic (world) — safety incident, mega-raise, departure, regulation, launch",
  nodes,
  edges,
  seeds,
};

// Self-checks.
for (const s of seeds) {
  for (const t of s.targets) {
    if (!nodeIds.has(t)) throw new Error(`seed ${s.id} targets missing node: ${t}`);
  }
}
const hasInbound = new Set<string>();
for (const e of edges) {
  hasInbound.add(e.target);
  if (e.direction === "two-way") hasInbound.add(e.source);
}
const rootsAllowed = new Set<string>(["anthropic-corp", ...seeds.flatMap((s) => s.targets)]);
const unreachable = nodes
  .filter((n) => !hasInbound.has(n.id) && !rootsAllowed.has(n.id))
  .map((n) => n.id);
if (unreachable.length > 0) {
  throw new Error(`unreachable nodes (no inbound edge): ${unreachable.join(", ")}`);
}

WorldSchema.parse(world);

const outPath = path.join(here, "world.json");
writeFileSync(outPath, JSON.stringify(world, null, 2) + "\n", "utf8");

const tierCounts: Record<Tier, number> = { 1: 0, 2: 0, 3: 0 };
for (const n of nodes) tierCounts[n.tier]++;
console.log(
  `wrote ${outPath}\n  nodes: ${nodes.length} (T1=${tierCounts[1]}, T2=${tierCounts[2]}, T3=${tierCounts[3]})` +
    `\n  edges: ${edges.length} (llmMediated=${edges.filter((e) => e.llmMediated).length})` +
    `\n  seeds: ${seeds.length}` +
    `\n  tier2/3 dossiers from Flash: ${overridden}`,
);
