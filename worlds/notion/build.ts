/**
 * worlds/notion/build.ts — generator for the full Notion world (`world.json`).
 *
 * L5 (World data). Produces a ~200-node tiered graph that validates against
 * `WorldSchema` and loads via `loadWorld()` in @wake/kernel:
 *   - Tier 1 (~40): named leadership, competitors, journalists, influencers —
 *     hand-curated ~200-token dossiers (the audience judges quality here).
 *   - Tier 2 (~75): archetype cohorts (customers by use-case, employee
 *     archetypes, communities, channels) with shared dossiers; state diverges.
 *   - Tier 3 (~90): aggregates — count nodes with averaged sentiment.
 *
 * worlds/ is not a workspace package, so we import the schema by relative path
 * (read-only). Dossiers are composites from public sources; uncertainty is
 * marked, and no quotes are fabricated (see AGENTS.md §4).
 *
 * Run:   pnpm exec tsx worlds/notion/build.ts
 * Check: pnpm exec tsx worlds/notion/validate.ts
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
import { TIER1_DOSSIERS } from "./dossiers.t1";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tier 1 dossiers (replaceable map; curated composites from public sources).
// Each ~120-180 words. Keyed by node id so research can be slotted in cleanly.
// ---------------------------------------------------------------------------

const DOSSIERS: Record<string, string> = {
  "notion-corp":
    "Notion Labs, the company entity (founded 2013). Design-led, 'tools for thought' philosophy; a large, beloved free/prosumer base with a growing enterprise motion. Speaks via the official blog, @NotionHQ, and measured, on-brand PR. Brand-protective and craft-obsessed; allergic to anything coded as enshittification. Faces competitive pressure from Microsoft Loop, Linear, Coda/Superhuman, and AI-native tools. As the focal company it originates the seed action and sets the official narrative the rest of the graph reacts to. Decision pattern: deliberate, taste-driven, willing to move slowly to protect the product's character; commercially pragmatic underneath when independence is at stake. Uncertainty: internal deliberations are inferred from public posture, not disclosed.",
  "ivan-zhao":
    "Ivan Zhao — co-founder and CEO; reportedly the largest individual shareholder (~30%). Idiosyncratic and design-obsessed; deeply identified with the 'tools for thought' lineage (Engelbart, Kay, Ted Nelson). Protective of craft, taste, and Notion's independence; known for long product gestation and aesthetic control. Public voice is thoughtful and philosophical rather than corporate. Privately wary of anything — growth tactics, an acquisition, AI-by-committee — that would dilute the product's soul. Decision pattern: slow, conviction-driven, willing to delay for quality and to resist moves that feel like selling out. Uncertainty: his private read on a Microsoft deal is inferred from his stated values, not stated.",
  "simon-last":
    "Simon Last — co-founder; the technical/product half of the founding pair. Long focused on the editor and the block/data model, and more recently on Notion's AI features. Lower public profile than Ivan; respected internally as the systems mind behind Notion's architecture. Cares about architectural elegance and the integrity of the data model. Likely the internal owner of the 'should we make big AI bets, and how' question. In an acquisition he weighs whether Microsoft's compute and distribution help or compromise the product's technical soul. Uncertainty: exact current title/scope is a composite from public profiles.",
  "akshay-kothari":
    "Akshay Kothari — co-founder and COO (joined 2018, initially as an angel, later granted co-founder status). The operator and go-to-market half of leadership; runs business, enterprise, and ops. More comfortable than Ivan with scaling, sales motion, and enterprise credibility. Public voice is pragmatic and growth-oriented. In an acquisition or free-tier scenario he weighs commercial reality against brand risk — the likely internal advocate for moves Ivan instinctively resists. Decision pattern: data- and momentum-driven; an operator's calculus. Uncertainty: his stance on a specific deal is inferred from his operating role.",
  "rama-katkar":
    "Rama Katkar — CFO. Owns the financial narrative, fundraising, and deal math. In an acquisition scenario she is central: models valuation, dilution, investor returns, and employee equity outcomes. Lower public profile; voice is measured and numbers-first. Privately balances a clean liquidity outcome against the strategic cost of losing independence. Decision pattern: rigorous, scenario-driven. Uncertainty: internal positions inferred from the role, not public statements.",
  "notion-board":
    "Notion's board (aggregated): the founders plus lead investors — reportedly Sequoia, Index Ventures, and Coatue — and independents. The body that would actually vote on an acquisition. Incentives diverge: some funds, depending on entry price and fund cycle, may favor a clean exit; the founders want to stay independent. Rarely 'acts' day-to-day but is decisive when it does. Decision pattern: fiduciary, return-sensitive, but mindful of founder alignment and signaling. Uncertainty: exact board composition and individual stances are inferred from public funding history.",

  "microsoft-corp":
    "Microsoft as institutional acquirer — a ~$3T platform company with a disciplined M&A machine (LinkedIn, GitHub, Activision, Nuance). Public posture: 'we let acquisitions run independently' (the GitHub template). Moves deliberately but with enormous gravitational pull — when it acts, the market re-prices. In the scenario it is the buyer setting official 'independence' messaging that skeptical clusters distrust on reflex (the Skype memory). Decision pattern: strategic, partnership-framed, antitrust-aware after Activision. Uncertainty: any specific Notion intent here is hypothetical for the simulation.",
  "satya-nadella":
    "Satya Nadella — Microsoft CEO since 2014; architect of the cloud-and-AI turnaround and the 'growth mindset' culture; deep OpenAI partnership. Public voice: empathetic, platform-and-partnership framed, careful. Approves only deals with a clear cloud/AI/Copilot thesis. In the scenario he is the ultimate sponsor; his framing ('Notion + Copilot — independent but synergistic') sets the tone the org and press inherit. Decision pattern: strategic, patient, ecosystem-minded; willing to absorb short-term criticism for a long-term platform position. Uncertainty: his read on this specific deal is inferred from his stated M&A philosophy.",
  "mustafa-suleyman":
    "Mustafa Suleyman — CEO of Microsoft AI since 2024 (DeepMind co-founder, ex-Inflection); owns Copilot and consumer AI. The plausible executive sponsor for a Notion deal framed as consumer-AI surface area. Public voice: big-picture, ambitious, somewhat polarizing, fast-moving. Privately motivated to expand Microsoft AI's product surface and user reach. The 'VP-of-AI mentions it to Mustafa' beat in the engineer-idea cascade routes through him. Decision pattern: opportunistic on distribution and data; bold. Uncertainty: his interest in Notion specifically is hypothetical.",
  "rajesh-jha":
    "Rajesh Jha — EVP, Experiences & Devices; owns Office/Microsoft 365, Teams, and (critically) Microsoft Loop. The Loop-overlap conflict sits here: buying Notion competes with his own org's bet. Lower public profile; internally powerful. Likely the most resistant senior voice to the deal — or the one who insists Notion be steered into Office synergies rather than left independent. Decision pattern: protective of the M365 surface, roadmap, and his org's mandate. Uncertainty: stance is reasonably inferred from org structure, not stated publicly.",
  "amy-hood":
    "Amy Hood — Microsoft CFO; a disciplined capital allocator and the gate every large acquisition passes. Public voice: precise, margin-focused, investor-facing. In the scenario she pressure-tests price and accretion and the cloud-consumption story. Privately skeptical of paying up for a brand without a clear financial thesis. Decision pattern: rigorous, returns-first, willing to say no. Uncertainty: her view on this hypothetical is inferred from her public CFO posture.",
  "kevin-scott":
    "Kevin Scott — Microsoft CTO and EVP of AI; owns long-term technical strategy and the OpenAI relationship. Would weigh whether Notion's data model and AI surface fit the Copilot stack and Microsoft's platform. Public voice: thoughtful, builder-oriented, optimistic about AI's trajectory. Decision pattern: technical-fit and platform-leverage focused. Uncertainty: direct involvement in this hypothetical deal is inferred.",
  "microsoft-board":
    "Microsoft's board of directors (aggregated). Rarely acts day-to-day but ratifies large acquisitions and reacts to regulatory and shareholder risk. Low routine attention, high impact when it moves. Conservative on antitrust exposure after intense Activision scrutiny; sensitive to anything that invites regulator attention or shareholder pushback. Decision pattern: governance-minded, risk-weighted. Uncertainty: deliberations are private; behavior inferred from governance norms.",
  "microsoft-loop":
    "Microsoft Loop — the direct internal competitor to Notion: collaborative pages, components, and workspaces bundled into M365. Has its own PM/eng org with strong opinions about leadership buying its competition. In the scenario, Loop's team is the internal locus of resentment, or of forced integration. Models both the product (capabilities, M365 distribution advantage) and the team's political reaction. Decision pattern (as a team): defensive of its mandate; likely to argue 'we should build, not buy.' Uncertainty: team sentiment is inferred from the obvious conflict of interest.",
  "m365-copilot":
    "Microsoft 365 Copilot — the AI layer across Office. The strategic rationale for any Notion deal would be framed as feeding or extending Copilot's reach and data surface. A largely passive artifact in the simulation whose roadmap and positioning shift as the cascade unfolds; its existence is the synergy story leadership tells and skeptics doubt.",

  "linear-leadership":
    "Linear's leadership — CEO/co-founder Karri Saarinen (ex-Airbnb design), with co-founders Jori Lallo and Tuomas Artman and COO Cristina Cordova (ex-Stripe, ex-Notion). Design-forward and opinionated about craft, focus, and speed; positions Linear as the antidote to sprawling all-in-one tools. Watches Notion closely (an asymmetric rivalry) and is opportunistic when Notion stumbles — an acquisition is a gift for 'stay independent, stay focused' messaging and switcher capture. Cordova's Notion past makes the rivalry personal and well-informed. Decision pattern: taste-led, fast, willing to subtweet the moment.",
  "superhuman-coda-leadership":
    "Shishir Mehrotra — CEO of Superhuman, the company formed when Grammarly acquired Coda (late 2024) and rebranded to Superhuman (2025), later folding in the Superhuman email app. Coda, the doc/table hybrid that competed head-on with Notion, now lives inside this AI-productivity suite. Mehrotra is a sharp strategist (ex-YouTube CPO; known for 'the rituals of great teams'). Reads a Notion acquisition as validation of consolidation and a chance to position Superhuman/Coda as the independent AI-native alternative. Decision pattern: framework-driven, narrative-savvy. Uncertainty: the Superhuman brand structure is fast-moving.",
  "clickup-leadership":
    "ClickUp — founder/CEO Zeb Evans. Aggressive, feature-maximalist 'one app to replace them all' positioning; fast shipping and loud marketing, strong in prosumer-to-SMB. Opportunistic on any Notion disruption; would blitz switch-promos and comparison ads within hours. Public voice: high-energy, growth-hacky, relentlessly on-message. Decision pattern: speed and volume over subtlety. Uncertainty: specifics of any campaign are illustrative.",
  "airtable-leadership":
    "Airtable — co-founder/CEO Howie Liu. Database-first no-code platform that pivoted hard to enterprise and, more recently, to AI. Competes with Notion on structured-data and ops use cases. Measured, enterprise-credible public voice. Reads a Microsoft–Notion deal through an enterprise-buyer and data-governance lens, and would court wavering large accounts. Decision pattern: enterprise-led, deliberate. Uncertainty: current AI positioning is summarized from public messaging.",
  "asana-leadership":
    "Asana — CEO Dan Rogers (appointed July 2025, ex-LaunchDarkly/ServiceNow), succeeding co-founder Dustin Moskovitz, now executive chair focused on AI/product vision. Work-management incumbent moving toward AI 'teammates.' Enterprise-grade, process-oriented; a less direct Notion rival than Linear or Coda but competes for the same team's tooling budget. Decision pattern: enterprise GTM, measured. Uncertainty: leadership is mid-transition; emphasis inferred from recent public statements.",
  "obsidian-team":
    "Obsidian — led by Steph Ango ('kepano'), CEO. Local-first, file-over-app, privacy-respecting Markdown knowledge tool with a devoted power-user base. The natural refuge for Notion power users who fear acquisition or enshittification; reliably gains users in 'Notion sells out' scenarios. Voice: principled, indie, focused on ownership, longevity, and user control. Decision pattern: values-driven, community-first, quietly confident. A foil to the whole acquisition premise.",
  "atlassian-confluence":
    "Atlassian (Confluence/Jira) — the enterprise wiki and dev-collaboration incumbent. Competes for the same enterprise knowledge-base budget. Would frame a Microsoft-owned Notion either as a reason to consolidate on Atlassian (vendor risk) or as validation of the category. Enterprise sales-led, measured, partner-ecosystem aware. Decision pattern: enterprise-credibility and migration-cost arguments.",
  "google-workspace-leadership":
    "Google Workspace leadership — the other big-tech productivity suite (Docs, Drive, and Gemini). A Microsoft–Notion tie-up sharpens the three-way platform war and pressures Google to answer with Gemini-in-Workspace. Reacts as a peer platform, not a startup: distribution, bundling, and AI parity. Decision pattern: platform-scale, bundle-and-match. Uncertainty: specific countermoves are illustrative.",
  "salesforce-slack":
    "Salesforce/Slack leadership — owns the other major collaboration surface. Watches Microsoft's productivity expansion warily, with the Teams–Slack bundling history (and antitrust complaint) fresh. Would read a Notion deal as Microsoft further encroaching on collaboration and react competitively and vocally — including on regulatory grounds. Decision pattern: competitive, willing to make the antitrust argument publicly.",

  "casey-newton":
    "Casey Newton — independent journalist behind Platformer; co-hosts Hard Fork with Kevin Roose. Structural, skeptical takes on platform power and consolidation; influential with an engaged, industry-insider audience. Default frame: big-tech acquisitions of beloved indie tools tend to end badly for users (Skype, etc.). Measured and analytical in public; smells a story in any Microsoft move. Sets the thoughtful-skeptic narrative that other journalists and enterprise readers inherit. Coverage pattern: context and second-order effects over breaking news.",
  "alex-heath":
    "Alex Heath — deputy editor at The Verge; writes the Sources newsletter; well-sourced on big-tech M&A and executive moves. Breaks and contextualizes deals quickly; access-driven, balanced but pointed. Likely to land scoops on deal terms and internal reaction. Audience: broad tech-industry and enthusiast. Coverage pattern: scoop plus measured analysis; close to the principals.",
  "eric-newcomer":
    "Eric Newcomer — independent journalist (Newcomer newsletter); VC- and dealmaking-focused; hosts the Cerebral Valley AI summit. Frames stories around investors, cap tables, and power. Would cover the deal from the money/board angle — who wins, who is pushed out, what it signals for startup exits and the venture market. Coverage pattern: deal mechanics and investor incentives.",
  "kara-swisher":
    "Kara Swisher — veteran tech journalist and podcaster (On with Kara Swisher, Pivot). Blunt, opinionated, access-rich; long skeptical of big-tech power and executive spin. Public voice: punchy, quotable, willing to needle. Would interrogate the 'independence' promise and the founders' motives directly, and put executives on the spot. Coverage pattern: personality- and power-focused, high reach.",
  "ben-thompson":
    "Ben Thompson — Stratechery; the most influential strategy analyst for tech executives, working through an aggregation-theory lens. Less breaking news, more 'what this means for the structure of the industry.' Read by the very leaders making the decision. Would assess the strategic logic for Microsoft and the precedent for SaaS consolidation; tone analytical and sometimes contrarian. Coverage pattern: framework-first; sets elite-insider consensus.",
  "the-information":
    "The Information's enterprise/M&A team — subscription, scoop-driven, with an enterprise-insider audience and deep sourcing on deal terms and internal politics. High credibility with investors and executives. Would publish the granular, sourced account of how the deal came together and who fought it. Coverage pattern: investigative depth, paywalled, agenda-setting among insiders.",
  "bloomberg-enterprise":
    "Bloomberg's enterprise-tech reporters — markets-, deal-, and regulation-focused, reaching institutional investors and corporate buyers. Frames the story around financials, regulatory odds, and stock impact. Fast, factual, and market-moving. Coverage pattern: terminal-speed, numbers-and-filings, regulator-watching.",
  "techcrunch":
    "TechCrunch — startup and tech news at scale. Fast, broad-reach coverage that sets the mainstream startup-world narrative and feeds aggregators. Less depth than Stratechery or The Information, more velocity and reach. Coverage pattern: quick takes, founder reactions, headline framing.",
  "gartner-collab":
    "Gartner's collaboration / digital-workplace analysts. Slow, formal, and enormously credible with enterprise IT buyers (the Magic Quadrant). A Microsoft-owned Notion changes their vendor guidance, and their measured assessment shapes multi-year procurement decisions. High-threshold, high-impact on the enterprise cohort. Coverage pattern: deliberate, risk-and-roadmap framed, procurement-facing.",
  "forrester":
    "Forrester analysts (collaboration / Wave reports). Like Gartner: deliberate, evidence-based guidance that enterprise buyers and procurement lean on. Reframes Notion's risk and credibility for large accounts post-deal. Coverage pattern: structured evaluation, buyer-advisory, slow but authoritative.",

  swyx:
    "swyx (Shawn Wang) — AI engineer, writer, and organizer behind Latent Space; an influential voice in the AI-builder community. Frames most things through the AI-tooling and developer-experience lens. Would read a Notion deal as an AI-distribution and data-moat story (who gets the workspace data, what it means for agents). Quick, analytical threads that set AI-Twitter's read. Voice: builder-optimist, synthesis-driven, prolific. Reaches AI-Twitter and the dev-tools crowd.",
  dhh:
    "David Heinemeier Hansson (DHH) — creator of Ruby on Rails, co-owner of 37signals/Basecamp. Loud, contrarian, anti-big-tech-consolidation, pro-independence and ownership. A reliable amplifier of 'this is exactly why you don't sell to Microsoft' sentiment. Public voice: combative, principled, highly quotable. Reaches developer-Twitter and indie founders; a single post can frame the skeptics' rallying cry. Bias: deeply suspicious of platform lock-in and VC/exit incentives.",
  "paul-graham":
    "Paul Graham — Y Combinator co-founder and essayist with enormous reach among founders. Would frame the deal as a lesson about ambition, staying independent versus selling out, or founder resolve. Public voice: aphoristic, founder-mythology, occasionally provocative. A single post recalibrates founder sentiment across the startup world. Bias: toward independence, ambition, and 'great founders don't sell too early' — but pragmatic about life-changing outcomes.",
  "brad-gerstner":
    "Brad Gerstner — Altimeter Capital; growth investor and prolific commentator (the BG2 pod). Frames deals around AI capex, durable growth, and public-market comps. Would opine on valuation and whether the deal is smart capital allocation for Microsoft, and what it signals for SaaS multiples. Reaches investor-Twitter and LPs. Voice: data-and-thesis driven, bullish on AI platform winners.",
  "bill-gurley":
    "Bill Gurley — former Benchmark partner; influential essayist on markets, regulation, and incentives ('2 and 20', regulatory capture). Skeptical of bad unit economics and of regulation that entrenches incumbents; quotable on antitrust dynamics. Would assess deal odds and second-order effects, and might flag regulatory risk or perverse incentives. Voice: measured, historically informed, contrarian when warranted.",
  "keith-rabois":
    "Keith Rabois — investor (Khosla; ex-Founders Fund) and 'PayPal mafia' figure. Provocative, status-driven, contrarian takes; often pro-consolidation-by-the-strong and dismissive of sentimentality. Would either needle the founders for selling (or for not selling) or praise the buyer's discipline. Reaches founder/VC-Twitter and reliably starts arguments. Voice: blunt, combative, attention-seeking.",
};

const dossier = (id: string): string => {
  // Researched Tier-1 dossiers (dossiers.t1.ts) take precedence over the
  // first-pass composites below; the inline map is the fallback.
  const d = TIER1_DOSSIERS[id] ?? DOSSIERS[id];
  if (!d) throw new Error(`missing Tier-1 dossier for ${id}`);
  return d;
};

// ---------------------------------------------------------------------------
// Tier 1 — named, full dossiers (the audience judges quality here).
// ---------------------------------------------------------------------------

// Notion leadership ---------------------------------------------------------
add({ id: "notion-corp", label: "Notion (corporate)", tier: 1, fn: "actor", dossier: dossier("notion-corp"), activationThreshold: 0, mood: mood(0.2, 0.1, 0.1), beliefs: "Independent, design-led productivity company; strong prosumer love; enterprise push underway.", publicFace: "Calm, on-brand, optimistic.", privateInterior: "Aware of pressure from Microsoft Loop, Linear, and AI-native tools." });
add({ id: "ivan-zhao", label: "Ivan Zhao (CEO, co-founder)", tier: 1, fn: "actor", dossier: dossier("ivan-zhao"), activationThreshold: 0.3, mood: mood(0.25, 0.2, 0.1), beliefs: "Notion's value is taste, craft, and independence.", publicFace: "Thoughtful, philosophical.", privateInterior: "Wary of anything that dilutes the craft or sells out the mission." });
add({ id: "simon-last", label: "Simon Last (co-founder)", tier: 1, fn: "actor", dossier: dossier("simon-last"), activationThreshold: 0.35, mood: mood(0.25, 0.1, 0.1), beliefs: "The data model and AI features are the technical soul of Notion.", publicFace: "Low-profile, technical.", privateInterior: "Weighs whether scale helps or compromises the architecture." });
add({ id: "akshay-kothari", label: "Akshay Kothari (COO, co-founder)", tier: 1, fn: "actor", dossier: dossier("akshay-kothari"), activationThreshold: 0.3, mood: mood(0.3, 0.1, 0.15), beliefs: "Commercial momentum and enterprise credibility matter; pragmatism over purity.", publicFace: "Pragmatic, growth-oriented.", privateInterior: "Open to moves Ivan instinctively resists if the math is right." });
add({ id: "rama-katkar", label: "Rama Katkar (CFO)", tier: 1, fn: "actor", dossier: dossier("rama-katkar"), activationThreshold: 0.35, mood: mood(0.25, 0.0, 0.15), beliefs: "Every strategic move is a model; outcomes for investors and employees both matter.", publicFace: "Measured, numbers-first.", privateInterior: "Balances liquidity against the cost of losing independence." });
add({ id: "notion-board", label: "Notion board (founders + investors)", tier: 1, fn: "actor", dossier: dossier("notion-board"), activationThreshold: 0.4, mood: mood(0.2, 0.0, 0.2), beliefs: "Fiduciary duty plus founder alignment; returns and signaling both count.", publicFace: "Silent until it votes.", privateInterior: "Investor and founder incentives can diverge sharply on an exit." });

// Microsoft leadership ------------------------------------------------------
add({ id: "microsoft-corp", label: "Microsoft (corporate)", tier: 1, fn: "actor", dossier: dossier("microsoft-corp"), activationThreshold: 0.1, mood: mood(0.3, 0.1, 0.2), beliefs: "Disciplined acquirer; acquisitions run independently under a clear cloud/AI thesis.", publicFace: "Confident, partnership-framed.", privateInterior: "Antitrust-cautious after Activision; wants the synergy story to hold." });
add({ id: "satya-nadella", label: "Satya Nadella (CEO, Microsoft)", tier: 1, fn: "actor", dossier: dossier("satya-nadella"), activationThreshold: 0.3, mood: mood(0.3, 0.15, 0.2), beliefs: "Platform and partnership; only deals with a clear Copilot/cloud thesis.", publicFace: "Empathetic, strategic, careful.", privateInterior: "Will absorb short-term criticism for a long-term platform position." });
add({ id: "mustafa-suleyman", label: "Mustafa Suleyman (CEO, Microsoft AI)", tier: 1, fn: "actor", dossier: dossier("mustafa-suleyman"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.25), beliefs: "Most future value accrues to the model layer; focus on frontier research.", publicFace: "Big-picture, ambitious.", privateInterior: "Sidelined from Copilot; little incentive to champion the deal." });
add({ id: "jacob-andreou", label: "Jacob Andreou (Copilot product lead)", tier: 1, fn: "actor", dossier: dossier("jacob-andreou"), activationThreshold: 0.3, mood: mood(0.35, 0.15, 0.3), beliefs: "Reverse Copilot's consumer slide; ship a stickier assistant.", publicFace: "Growth- and consumer-product oriented.", privateInterior: "Notion's graph would strengthen the product I'm accountable for." });
add({ id: "rajesh-jha", label: "Rajesh Jha (EVP, Experiences & Devices)", tier: 1, fn: "actor", dossier: dossier("rajesh-jha"), activationThreshold: 0.35, mood: mood(0.3, -0.1, 0.25), beliefs: "Protect the M365 surface and roadmap; Loop is our bet.", publicFace: "Reserved, on-message.", privateInterior: "Buying Notion competes with my own org; resist or absorb." });
add({ id: "amy-hood", label: "Amy Hood (CFO, Microsoft)", tier: 1, fn: "actor", dossier: dossier("amy-hood"), activationThreshold: 0.4, mood: mood(0.25, -0.1, 0.2), beliefs: "Price discipline; needs a clear cloud-consumption story.", publicFace: "Precise, margin-focused.", privateInterior: "Skeptical of paying up for a brand without accretion." });
add({ id: "kevin-scott", label: "Kevin Scott (CTO, Microsoft)", tier: 1, fn: "actor", dossier: dossier("kevin-scott"), activationThreshold: 0.4, mood: mood(0.25, 0.1, 0.15), beliefs: "Does Notion's data model fit the Copilot stack?", publicFace: "Thoughtful, builder-oriented.", privateInterior: "Weighs technical fit and platform leverage." });
add({ id: "microsoft-board", label: "Microsoft board", tier: 1, fn: "actor", dossier: dossier("microsoft-board"), activationThreshold: 0.5, mood: mood(0.15, 0.0, 0.2), beliefs: "Governance and risk; avoid inviting regulators.", publicFace: "Silent.", privateInterior: "Antitrust-shy after Activision scrutiny." });
add({ id: "microsoft-loop", label: "Microsoft Loop (product + team)", tier: 1, fn: "actor", dossier: dossier("microsoft-loop"), activationThreshold: 0.3, mood: mood(0.3, -0.2, 0.3), beliefs: "We should build, not buy; Loop is the M365-native answer.", publicFace: "Team-line supportive.", privateInterior: "Resentful that leadership might buy our competition." });
add({ id: "m365-copilot", label: "Microsoft 365 Copilot", tier: 1, fn: "artifact", dossier: dossier("m365-copilot"), activationThreshold: 0.4, mood: mood(0.2, 0.1, 0.2), beliefs: "", publicFace: "The synergy story leadership tells.", privateInterior: "" });

// Competitors ---------------------------------------------------------------
add({ id: "linear-leadership", label: "Linear (leadership)", tier: 1, fn: "actor", dossier: dossier("linear-leadership"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.2), beliefs: "We win on focus and speed; Notion is sprawling.", publicFace: "Confident, design-led, restrained.", privateInterior: "Alert for any opening to capture switchers; Cordova knows Notion from inside." });
add({ id: "superhuman-coda-leadership", label: "Superhuman/Coda (Shishir Mehrotra)", tier: 1, fn: "actor", dossier: dossier("superhuman-coda-leadership"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.2), beliefs: "Consolidation validates the category; Coda is the independent AI-native doc.", publicFace: "Strategic, narrative-savvy.", privateInterior: "Sees a positioning gift in a Notion sale." });
add({ id: "clickup-leadership", label: "ClickUp (Zeb Evans)", tier: 1, fn: "actor", dossier: dossier("clickup-leadership"), activationThreshold: 0.3, mood: mood(0.35, 0.0, 0.3), beliefs: "One app to replace them all; outwork everyone on features and marketing.", publicFace: "High-energy, loud.", privateInterior: "Every Notion stumble is a switch-promo opportunity." });
add({ id: "airtable-leadership", label: "Airtable (Howie Liu)", tier: 1, fn: "actor", dossier: dossier("airtable-leadership"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.2), beliefs: "Structured data + AI for the enterprise.", publicFace: "Measured, enterprise-credible.", privateInterior: "Court wavering large accounts on governance fears." });
add({ id: "asana-leadership", label: "Asana (Dan Rogers)", tier: 1, fn: "actor", dossier: dossier("asana-leadership"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.2), beliefs: "Work management plus AI teammates for the enterprise.", publicFace: "Enterprise GTM, measured.", privateInterior: "Competes for the same budget; mid-leadership-transition." });
add({ id: "obsidian-team", label: "Obsidian (Steph Ango / kepano)", tier: 1, fn: "actor", dossier: dossier("obsidian-team"), activationThreshold: 0.25, mood: mood(0.3, 0.1, 0.2), beliefs: "Local-first, file-over-app, you own your data forever.", publicFace: "Principled, indie.", privateInterior: "Quietly confident a Notion sale proves our thesis." });
add({ id: "atlassian-confluence", label: "Atlassian / Confluence", tier: 1, fn: "actor", dossier: dossier("atlassian-confluence"), activationThreshold: 0.35, mood: mood(0.25, 0.0, 0.2), beliefs: "Enterprise-grade knowledge base; consolidate vendor risk on us.", publicFace: "Enterprise sales-led.", privateInterior: "A Microsoft-owned Notion is both threat and validation." });
add({ id: "google-workspace-leadership", label: "Google Workspace (leadership)", tier: 1, fn: "actor", dossier: dossier("google-workspace-leadership"), activationThreshold: 0.35, mood: mood(0.25, 0.0, 0.2), beliefs: "Answer with Gemini-in-Workspace; match on bundle and scale.", publicFace: "Peer-platform confident.", privateInterior: "A Microsoft–Notion tie-up sharpens the three-way war." });
add({ id: "salesforce-slack", label: "Salesforce / Slack (leadership)", tier: 1, fn: "actor", dossier: dossier("salesforce-slack"), activationThreshold: 0.35, mood: mood(0.25, -0.1, 0.2), beliefs: "Microsoft is encroaching on collaboration again.", publicFace: "Competitive, vocal.", privateInterior: "Tempted to make the antitrust argument publicly (Teams–Slack history)." });

// Journalists & analysts ----------------------------------------------------
add({ id: "casey-newton", label: "Casey Newton (Platformer)", tier: 1, fn: "channel", dossier: dossier("casey-newton"), activationThreshold: 0.2, mood: mood(0.3, -0.1, 0.2), beliefs: "Big-tech acquisitions of beloved tools usually end badly for users.", publicFace: "Measured, analytical.", privateInterior: "Smells a story in any Microsoft move." });
add({ id: "alex-heath", label: "Alex Heath (The Verge / Sources)", tier: 1, fn: "channel", dossier: dossier("alex-heath"), activationThreshold: 0.2, mood: mood(0.35, 0.0, 0.3), beliefs: "Get the scoop and the internal reaction.", publicFace: "Balanced but pointed.", privateInterior: "Working sources for deal terms." });
add({ id: "eric-newcomer", label: "Eric Newcomer (Newcomer)", tier: 1, fn: "channel", dossier: dossier("eric-newcomer"), activationThreshold: 0.25, mood: mood(0.3, 0.0, 0.25), beliefs: "Follow the money, the cap table, and the power.", publicFace: "Dealmaking lens.", privateInterior: "Who wins, who's pushed out?" });
add({ id: "kara-swisher", label: "Kara Swisher (Pivot / On)", tier: 1, fn: "channel", dossier: dossier("kara-swisher"), activationThreshold: 0.25, mood: mood(0.3, -0.1, 0.25), beliefs: "Big-tech spin deserves blunt interrogation.", publicFace: "Punchy, quotable.", privateInterior: "Will push the founders on their motives." });
add({ id: "ben-thompson", label: "Ben Thompson (Stratechery)", tier: 1, fn: "channel", dossier: dossier("ben-thompson"), activationThreshold: 0.25, mood: mood(0.3, 0.0, 0.2), beliefs: "What does this mean for the structure of the industry?", publicFace: "Analytical, contrarian.", privateInterior: "Read by the leaders making the call." });
add({ id: "the-information", label: "The Information (enterprise/M&A)", tier: 1, fn: "channel", dossier: dossier("the-information"), activationThreshold: 0.25, mood: mood(0.3, 0.0, 0.25), beliefs: "Granular, sourced accounts win.", publicFace: "Investigative, paywalled.", privateInterior: "Who fought the deal internally?" });
add({ id: "bloomberg-enterprise", label: "Bloomberg (enterprise tech)", tier: 1, fn: "channel", dossier: dossier("bloomberg-enterprise"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.3), beliefs: "Financials, regulatory odds, stock impact.", publicFace: "Fast, factual.", privateInterior: "Market-moving by default." });
add({ id: "techcrunch", label: "TechCrunch", tier: 1, fn: "channel", dossier: dossier("techcrunch"), activationThreshold: 0.2, mood: mood(0.35, 0.0, 0.3), beliefs: "Velocity and reach over depth.", publicFace: "Headline framing.", privateInterior: "Feed the aggregators first." });
add({ id: "gartner-collab", label: "Gartner (collaboration analysts)", tier: 1, fn: "channel", dossier: dossier("gartner-collab"), activationThreshold: 0.45, mood: mood(0.2, 0.0, 0.15), beliefs: "Vendor risk and roadmap drive procurement guidance.", publicFace: "Formal, deliberate.", privateInterior: "Our guidance moves multi-year contracts." });
add({ id: "forrester", label: "Forrester (collaboration analysts)", tier: 1, fn: "channel", dossier: dossier("forrester"), activationThreshold: 0.45, mood: mood(0.2, 0.0, 0.15), beliefs: "Evidence-based buyer advisory.", publicFace: "Structured, authoritative.", privateInterior: "Reframe Notion's risk for large accounts." });

// Influencers & VCs ---------------------------------------------------------
add({ id: "swyx", label: "swyx (Latent Space)", tier: 1, fn: "channel", dossier: dossier("swyx"), activationThreshold: 0.25, mood: mood(0.35, 0.1, 0.25), beliefs: "It's an AI-distribution and data-moat story.", publicFace: "Builder-optimist, synthesis-driven.", privateInterior: "Who gets the workspace data for agents?" });
add({ id: "dhh", label: "DHH (37signals)", tier: 1, fn: "channel", dossier: dossier("dhh"), activationThreshold: 0.3, mood: mood(0.35, -0.3, 0.3), beliefs: "This is exactly why you don't sell to Microsoft.", publicFace: "Combative, principled.", privateInterior: "Suspicious of lock-in and exit incentives." });
add({ id: "paul-graham", label: "Paul Graham (YC)", tier: 1, fn: "channel", dossier: dossier("paul-graham"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.2), beliefs: "Great founders think twice before selling too early.", publicFace: "Aphoristic, founder-mythology.", privateInterior: "Pragmatic about life-changing outcomes." });
add({ id: "brad-gerstner", label: "Brad Gerstner (Altimeter)", tier: 1, fn: "channel", dossier: dossier("brad-gerstner"), activationThreshold: 0.3, mood: mood(0.3, 0.1, 0.2), beliefs: "Judge it on AI capex, durable growth, and comps.", publicFace: "Data-and-thesis driven.", privateInterior: "Is this smart capital allocation for Microsoft?" });
add({ id: "bill-gurley", label: "Bill Gurley (ex-Benchmark)", tier: 1, fn: "channel", dossier: dossier("bill-gurley"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.2), beliefs: "Watch incentives and regulatory second-order effects.", publicFace: "Measured, historically informed.", privateInterior: "Could flag regulatory risk." });
add({ id: "keith-rabois", label: "Keith Rabois (Khosla)", tier: 1, fn: "channel", dossier: dossier("keith-rabois"), activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.25), beliefs: "Consolidation by the strong is usually right.", publicFace: "Blunt, contrarian.", privateInterior: "Will needle whoever is sentimental." });

// ---------------------------------------------------------------------------
// Tier 2 — archetype cohorts (shared dossiers; state diverges per instance).
// ---------------------------------------------------------------------------

// Notion middle management (funnel nodes) -----------------------------------
add({ id: "eng-manager", label: "Engineering Manager (AI features)", tier: 2, fn: "actor", activationThreshold: 0.4, mood: mood(0.3, 0.0, 0.1), dossier: "Mid-tier engineering manager on AI features, recently promoted, cautious and status-protective. Reluctant to push half-baked ideas up the chain pre-acquisition; the funnel node where the engineer-idea scenario lives or dies. Post-acquisition, under explicit pressure to surface 'Notion–Microsoft synergy' stories, the same idea suddenly fits the priority axis and gets escalated. Archetype: the manager whose incentives, not whose character, decide an idea's fate.", beliefs: "Keep the team focused; avoid risky bets that could backfire on me.", publicFace: "Supportive, measured.", privateInterior: "Anxious about looking unfocused to leadership." });
add({ id: "director-of-engineering", label: "Director of Engineering", tier: 2, fn: "actor", activationThreshold: 0.45, mood: mood(0.3, 0.0, 0.15), dossier: "Director-level engineering leader; more ambitious and political than the line manager, with skip-level reach. Filters and reframes what rises to VPs. Post-acquisition, the node that translates ideas into 'Microsoft-aligned' framing. Archetype: ambition tempered by organizational caution.", beliefs: "Ship what matters and protect the org's credibility.", publicFace: "Decisive, strategic.", privateInterior: "Calculates which bets make the org look good upward." });
add({ id: "head-of-design", label: "Head of Design", tier: 2, fn: "actor", activationThreshold: 0.4, mood: mood(0.3, 0.1, 0.15), dossier: "Design leader carrying Notion's craft identity. Most acutely fears 'aesthetic-by-committee' under a big-tech owner. Influential with Ivan; a likely retention risk in an acquisition. Archetype: the keeper of taste.", beliefs: "Notion's craft is the moat; don't let it get diluted.", publicFace: "Calm, principled.", privateInterior: "Fears Microsoft process eroding the design soul." });
add({ id: "head-of-marketing", label: "Head of Marketing", tier: 2, fn: "actor", activationThreshold: 0.4, mood: mood(0.3, 0.0, 0.2), dossier: "Brand and growth marketing leader; owns the narrative to users and press. In a crisis (acquisition, free-tier cut) manages messaging and damage control. Archetype: the narrative manager balancing honesty and spin.", beliefs: "Control the story or it controls us.", publicFace: "On-message, warm.", privateInterior: "Bracing for backlash from the loyal base." });
add({ id: "head-of-sales", label: "Head of Sales", tier: 2, fn: "actor", activationThreshold: 0.4, mood: mood(0.3, 0.0, 0.2), dossier: "Enterprise sales leader; closest to procurement and large-account anxiety. In an acquisition, fields both opportunity (Microsoft distribution) and churn risk (data-policy fears). Archetype: the revenue realist.", beliefs: "Enterprise trust is hard-won and easily lost.", publicFace: "Confident, consultative.", privateInterior: "Watching renewal risk in the named accounts." });
add({ id: "head-of-customer-success", label: "Head of Customer Success", tier: 2, fn: "actor", activationThreshold: 0.4, mood: mood(0.3, 0.0, 0.2), dossier: "Owns retention and the health of the customer base. First to feel cohort sentiment shifts; escalates churn signals. Archetype: the early-warning system for customer trust.", beliefs: "Retention is sentiment made concrete.", publicFace: "Reassuring, attentive.", privateInterior: "Sees the churn risk before the dashboards do." });
add({ id: "vp-of-ai", label: "VP of AI / Product", tier: 2, fn: "actor", activationThreshold: 0.4, mood: mood(0.35, 0.1, 0.2), dossier: "Senior leader for AI/product strategy; the node with a plausible regular meeting with Microsoft AI leadership post-acquisition. Where the engineer-idea cascade reaches escape velocity in the post-acquisition world. Archetype: the bridge between Notion's roadmap and Microsoft's priorities.", beliefs: "AI is the next platform shift for Notion.", publicFace: "Ambitious, articulate.", privateInterior: "Eager to show Microsoft-relevant wins." });
add({ id: "head-of-platform", label: "Head of Platform", tier: 2, fn: "actor", activationThreshold: 0.4, mood: mood(0.3, 0.0, 0.15), dossier: "Owns the API, integrations, and developer ecosystem. In an acquisition weighs Azure migration and the fate of third-party integrators. Archetype: the steward of the ecosystem.", beliefs: "The platform's value is its open ecosystem.", publicFace: "Developer-friendly.", privateInterior: "Nervous about an Azure-mandated rearchitecture." });
add({ id: "head-of-people", label: "Head of People (HR)", tier: 2, fn: "actor", activationThreshold: 0.45, mood: mood(0.3, 0.0, 0.2), dossier: "Owns retention, morale, and the equity/comp story in an acquisition. Manages the flight risk of senior talent and the Blind-fueled rumor mill. Archetype: the keeper of morale under uncertainty.", beliefs: "People decide whether the deal actually works.", publicFace: "Calm, transparent-ish.", privateInterior: "Tracking who is most likely to walk." });

// Notion ICs / team archetypes ---------------------------------------------
add({ id: "maya", label: "Maya (senior engineer, AI features)", tier: 2, fn: "actor", activationThreshold: 0.3, mood: mood(0.4, 0.3, 0.3), dossier: "Senior engineer on the AI features team. Earnest, ideas-driven, slightly conflict-avoidant. Source of the product-idea scenario: 'use AI to auto-link Notion pages by semantic similarity.' Pre-acquisition her idea is parked by a cautious manager; post-acquisition the same idea fits the synergy axis and escalates. Archetype: the talented IC whose idea's fate depends on the org's shape.", beliefs: "I have a good idea: auto-link pages by semantic similarity.", publicFace: "Eager, collaborative.", privateInterior: "Hopeful but braced for the idea to be parked." });
add({ id: "postgres-eng", label: "Platform engineer (tweets about Postgres)", tier: 2, fn: "actor", activationThreshold: 0.3, mood: mood(0.35, 0.0, 0.2), dossier: "Named exemplar: a core-platform engineer with a modest but real following, known for candid technical threads (Postgres at scale, sharding war stories). A plausible source of public signal or a leak when internal divergence runs high. Archetype: the engineer whose honest tweet becomes a story.", beliefs: "Tell the technical truth; the work speaks.", publicFace: "Candid, nerdy.", privateInterior: "Would be uneasy about a forced Azure migration." });
add({ id: "core-platform-eng", label: "Core platform engineering (cluster)", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, -0.05, 0.2), dossier: "Archetype cluster of infrastructure/platform engineers. Post-acquisition, nervous about an Azure migration and rearchitecture mandates. Lower public voice individually, but their mood drives attrition risk and the occasional Blind post. Archetype: the load-bearing team most exposed to integration pain.", beliefs: "The infra is ours; don't break it for synergy.", publicFace: "Heads-down.", privateInterior: "Azure migration anxiety." });
add({ id: "ai-features-team", label: "AI features team (cluster)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.4, 0.2, 0.25), dossier: "Archetype cluster on Notion AI. Post-acquisition, the team most excited about Microsoft compute and model access. A counterweight to the platform team's anxiety. Archetype: the team that sees the acquisition as a capability unlock.", beliefs: "More compute and model access makes our roadmap real.", publicFace: "Optimistic.", privateInterior: "Worried about losing product autonomy." });
add({ id: "growth-eng", label: "Growth engineering (cluster)", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, 0.0, 0.2), dossier: "Archetype cluster focused on activation, funnels, and monetization. Closest to free-tier economics; central to a free-tier-removal scenario. Archetype: the team that lives in the conversion data.", beliefs: "Growth and monetization are in tension; mind the base.", publicFace: "Pragmatic.", privateInterior: "Knows a free-tier cut would spike churn." });
add({ id: "design-team", label: "Design team (cluster)", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, 0.1, 0.2), dossier: "Archetype cluster carrying Notion's craft day-to-day. Most sensitive to 'design-by-committee' fears under a corporate owner; a meaningful flight risk. Archetype: the craft-keepers.", beliefs: "Craft is why people love Notion.", publicFace: "Quietly proud.", privateInterior: "Fears aesthetic erosion post-deal." });
add({ id: "marketing-team", label: "Marketing team (cluster)", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, 0.0, 0.2), dossier: "Archetype cluster executing brand and community. Absorbs and relays user backlash; manages tone in a crisis. Archetype: the front line of the narrative.", beliefs: "The community can tell when we're spinning.", publicFace: "Warm, on-brand.", privateInterior: "Dreads defending an unpopular move." });
add({ id: "sales-team", label: "Sales team (cluster)", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, 0.0, 0.2), dossier: "Archetype cluster of AEs and SEs. Hears enterprise anxiety first; their pipeline mood is an early churn indicator. Archetype: the revenue antennae.", beliefs: "Trust closes deals; uncertainty kills them.", publicFace: "Upbeat to customers.", privateInterior: "Watching deals slip on acquisition news." });
add({ id: "customer-success-team", label: "Customer success team (cluster)", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, 0.0, 0.2), dossier: "Archetype cluster managing accounts and renewals. The closest read on whether large customers stay or leave. Archetype: the retention sensors.", beliefs: "Renewals reflect trust, not features.", publicFace: "Attentive.", privateInterior: "Fielding nervous customer calls." });

// Customer cohorts by use-case ---------------------------------------------
add({ id: "prod-twitter", label: "Productivity Twitter (cohort)", tier: 2, fn: "audience", activationThreshold: 0.25, mood: mood(0.3, 0.4, 0.2), dossier: "Power-user community devoted to Notion's craft. Vocal, loyal, allergic to enshittification, and quick to feel betrayed by an acquisition or a free-tier cut. The loudest early signal of base sentiment; sets the tone other cohorts and journalists pick up. Archetype: the loyal-until-betrayed superfans.", beliefs: "Notion is special because it is independent and well-designed.", publicFace: "Enthusiastic advocates.", privateInterior: "Latent fear that the magic could be ruined." });
add({ id: "enterprise-customers", label: "Enterprise customers (cohort)", tier: 2, fn: "audience", activationThreshold: 0.4, mood: mood(0.25, 0.0, 0.2), dossier: "Seat-license accounts where procurement and IT react differently from end users. Cares about data policy, compliance, and vendor stability. A Microsoft owner is reassuring on stability but alarming on data residency and lock-in. Slow to move, expensive to lose. Archetype: the cautious institutional buyer.", beliefs: "Stability and compliance over novelty.", publicFace: "Professional, reserved.", privateInterior: "Reassessing vendor risk and data policy." });
add({ id: "smb-customers", label: "SMB customers (cohort)", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, 0.1, 0.2), dossier: "Founder-driven small businesses; faster to adopt and to switch. Price- and momentum-sensitive. Archetype: the nimble pragmatists.", beliefs: "Use whatever works and is fairly priced.", publicFace: "Practical.", privateInterior: "Will switch if value drops or price jumps." });
add({ id: "prosumer-customers", label: "Prosumer customers (cohort)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.3, 0.2, 0.2), dossier: "Individual paying power-users, often vocal on Twitter. Overlaps with Productivity Twitter. High emotional investment in Notion's identity. Archetype: the paying believers.", beliefs: "I pay because it's the best tool, not the biggest.", publicFace: "Advocate.", privateInterior: "Would feel personally let down by a sellout." });
add({ id: "free-tier-users", label: "Free-tier users (mass cohort)", tier: 2, fn: "audience", activationThreshold: 0.4, mood: mood(0.25, 0.1, 0.15), dossier: "The huge free base. Low individual signal, but aggregate sentiment and conversion economics matter enormously. Central to a free-tier-removal scenario, where this cohort's reaction is the whole story. Archetype: the silent majority whose aggregate mood is a force.", beliefs: "Notion is generous and that's why I'm here.", publicFace: "Mostly quiet.", privateInterior: "Would feel ripped off if the free tier is gutted." });
add({ id: "students-cohort", label: "Students (use-case cohort)", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, 0.2, 0.15), dossier: "Students using Notion for notes and planning. Don't care about compliance; very price-sensitive and trend-driven. Influential on TikTok/YouTube as a growth funnel. Archetype: the trend-sensitive top of funnel.", beliefs: "Notion is the aesthetic study tool.", publicFace: "Enthusiastic on social.", privateInterior: "Will follow whatever the creators recommend next." });
add({ id: "writers-cohort", label: "Writers (use-case cohort)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.3, 0.2, 0.15), dossier: "Writers and researchers using Notion as a second brain. Value calm, ownership, and longevity; the cohort most tempted by Obsidian in a 'sellout' scenario. Archetype: the ownership-minded knowledge workers.", beliefs: "My writing tool should respect my data and my focus.", publicFace: "Thoughtful.", privateInterior: "Eyeing local-first alternatives if trust drops." });
add({ id: "engineers-wiki-cohort", label: "Engineers (wiki use-case cohort)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.3, 0.1, 0.15), dossier: "Engineering teams using Notion as a wiki/spec hub. Compare it to Confluence; care about API, integrations, and reliability. Archetype: the technical pragmatists who weigh switching costs.", beliefs: "It's the least-bad wiki if it stays reliable.", publicFace: "Matter-of-fact.", privateInterior: "Would consider Confluence/Obsidian on instability." });
add({ id: "designers-specs-cohort", label: "Designers (specs use-case cohort)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.3, 0.2, 0.15), dossier: "Designers using Notion for specs, docs, and handoff. Loyal to the craft; sensitive to any decline in polish. Archetype: the craft-aligned users.", beliefs: "The polish is the point.", publicFace: "Appreciative.", privateInterior: "Would notice and resent any quality slip." });
add({ id: "ops-crm-cohort", label: "Ops / CRM (use-case cohort)", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, 0.0, 0.2), dossier: "Operators using Notion as a lightweight CRM/ops database. Overlaps with Airtable's territory; care about structure, automation, and stability. Archetype: the power-builders who've invested in complex setups.", beliefs: "I've built my whole ops on this; switching is painful.", publicFace: "Pragmatic.", privateInterior: "High switching cost, so high anxiety about changes." });
add({ id: "notion-creators", label: "Notion creators / template sellers", tier: 2, fn: "audience", activationThreshold: 0.25, mood: mood(0.4, 0.3, 0.25), dossier: "Creators who sell templates, run courses, and evangelize Notion on YouTube/TikTok/Twitter. Their livelihood is tied to Notion's health; extremely vocal and influential on the base. A free-tier cut or sellout directly threatens them, so they react loudly and fast. Archetype: the economically-dependent megaphones.", beliefs: "Notion's growth is my business.", publicFace: "Promotional, upbeat.", privateInterior: "Terrified of changes that shrink the audience or paywall it." });

// Latent customer base ------------------------------------------------------
add({ id: "m365-installed-base", label: "Microsoft 365 installed base (latent)", tier: 2, fn: "audience", activationThreshold: 0.45, mood: mood(0.2, 0.0, 0.1), dossier: "The vast M365 base — gainable for a Microsoft-owned Notion via bundling, or a captive cross-sell target. Slow, IT-mediated, conservative. Where post-acquisition distribution upside lives. Archetype: the latent demand the deal is partly about.", beliefs: "We use what IT provisions.", publicFace: "Indifferent until provisioned.", privateInterior: "Could adopt if Notion ships in the bundle." });
add({ id: "tried-notion-bounced", label: "Tried Notion and bounced (latent)", tier: 2, fn: "audience", activationThreshold: 0.45, mood: mood(0.2, -0.1, 0.1), dossier: "People who tried Notion and left (too complex, blank-page problem). A Microsoft makeover could win some back, or confirm their exit. Archetype: the winnable-but-skeptical lapsed users.", beliefs: "It was powerful but overwhelming.", publicFace: "Disengaged.", privateInterior: "Open to a simpler, integrated version." });
add({ id: "considered-notion-chose-competitor", label: "Considered Notion, chose a competitor (latent)", tier: 2, fn: "audience", activationThreshold: 0.45, mood: mood(0.2, -0.1, 0.1), dossier: "Teams that evaluated Notion and picked Confluence/Coda/Linear. The acquisition validates or undermines their choice; competitors will court them hard. Archetype: the comparison-shoppers who already said no.", beliefs: "We made the safe call.", publicFace: "Settled.", privateInterior: "Watching whether their choice still looks right." });

// Communities ---------------------------------------------------------------
add({ id: "hacker-news", label: "Hacker News", tier: 2, fn: "channel", activationThreshold: 0.15, mood: mood(0.5, -0.2, 0.4), dossier: "Technical, skeptical, fast community; a 500-comment thread forms within the hour on any acquisition. Distrustful of corporate spin and lock-in; sympathetic to indie/local-first alternatives. Amplifies and dissects; sets the technical-crowd consensus. Archetype: the skeptical technical jury.", beliefs: "Acquisitions usually ruin good products.", publicFace: "Blunt, analytical.", privateInterior: "" });
add({ id: "reddit-notion", label: "r/Notion", tier: 2, fn: "audience", activationThreshold: 0.25, mood: mood(0.35, 0.3, 0.2), dossier: "The dedicated Notion subreddit: power users, template-sharers, and help-seekers. Loyal but quick to organize complaints. A sensitive gauge of base sentiment on pricing and features. Archetype: the engaged home community.", beliefs: "This is our tool and our community.", publicFace: "Helpful, opinionated.", privateInterior: "Primed to revolt over a free-tier cut." });
add({ id: "reddit-productivity", label: "r/productivity", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.3, 0.1, 0.15), dossier: "Broad productivity community comparing tools and systems. Less loyal to any one app; quick to recommend alternatives when one stumbles. Archetype: the tool-agnostic comparison crowd.", beliefs: "Best system wins, not best brand.", publicFace: "Recommendation-driven.", privateInterior: "Will pivot recommendations on bad news." });
add({ id: "reddit-sysadmin", label: "r/sysadmin", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, -0.1, 0.2), dossier: "IT admins who care about manageability, security, and data policy. A Microsoft-owned Notion reads as either easier (one vendor) or riskier (more Microsoft surface). Archetype: the gatekeeping IT crowd.", beliefs: "Manageability and compliance first.", publicFace: "Pragmatic, wary.", privateInterior: "Weighing one-vendor convenience vs concentration risk." });
add({ id: "blind", label: "Blind (anonymous workplace)", tier: 2, fn: "channel", activationThreshold: 0.2, mood: mood(0.4, -0.2, 0.4), dossier: "Anonymous workplace app; the leak channel where internal divergence surfaces (comp, morale, 'is this deal real'). Fires when private/public gap is high; rumors here can become press stories. Archetype: the pressure valve and rumor mill.", beliefs: "The truth leaks here first.", publicFace: "Anonymous, candid, cynical.", privateInterior: "" });
add({ id: "buildinpublic", label: "#buildinpublic", tier: 2, fn: "audience", activationThreshold: 0.25, mood: mood(0.35, 0.1, 0.2), dossier: "Founders and indie hackers sharing their journeys publicly. Reads the deal as a parable about independence vs exits; amplifies founder-sentiment takes. Archetype: the founder-journey commentariat.", beliefs: "Stay independent as long as you can.", publicFace: "Earnest, transparent.", privateInterior: "Quietly wonders what they'd do for the same check." });
add({ id: "indiehackers", label: "Indie Hackers", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.2), dossier: "Bootstrappers and small SaaS builders. Skeptical of VC/exit incentives; sympathetic to ownership and local-first. Archetype: the bootstrapper conscience.", beliefs: "Ownership beats acquisition.", publicFace: "Pragmatic, values-driven.", privateInterior: "" });
add({ id: "product-hunt", label: "Product Hunt community", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.3, 0.1, 0.2), dossier: "Early-adopter community that surfaces alternatives fast. In a 'Notion sells out' moment, the launchpad for the next indie tool's moment. Archetype: the novelty-seeking early adopters.", beliefs: "There's always a better new tool.", publicFace: "Enthusiastic about the new.", privateInterior: "" });

// Influencer audience clusters ---------------------------------------------
add({ id: "ai-twitter", label: "AI Twitter (cluster)", tier: 2, fn: "audience", activationThreshold: 0.25, mood: mood(0.4, 0.1, 0.3), dossier: "The AI-builder and researcher crowd. Reads the deal as a data/distribution story for agents and models. Fast, technical, hype-and-skepticism cycling. Archetype: the AI-implications crowd.", beliefs: "It's about who controls the workspace data.", publicFace: "Analytical, fast.", privateInterior: "" });
add({ id: "developer-twitter", label: "Developer Twitter (cluster)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.35, -0.1, 0.25), dossier: "General software-developer audience. Skeptical of big-tech lock-in; amplifies DHH-style independence takes and API/integration worries. Archetype: the developer skeptics.", beliefs: "Big-tech ownership usually means lock-in.", publicFace: "Opinionated.", privateInterior: "" });
add({ id: "enterprise-saas-twitter", label: "Enterprise SaaS Twitter (cluster)", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, 0.0, 0.2), dossier: "GTM, ops, and SaaS-strategy commentators. Reads the deal through distribution, bundling, and category-consolidation lenses; more synergy-sympathetic than developer-Twitter. Archetype: the SaaS-strategy crowd.", beliefs: "Distribution wins; consolidation is rational.", publicFace: "Strategy-take driven.", privateInterior: "" });
add({ id: "skeptical-of-msft-acquisitions", label: "Skeptical-of-Microsoft-acquisitions (cluster)", tier: 2, fn: "audience", activationThreshold: 0.2, mood: mood(0.35, -0.4, 0.3), dossier: "The cluster primed by history (Skype, others) to expect Microsoft acquisitions to degrade beloved products. Reacts fast and negatively; the emotional core of the backlash. Archetype: the burned-before skeptics.", beliefs: "Remember Skype. This will get worse.", publicFace: "Cynical, vocal.", privateInterior: "" });
add({ id: "linkedin-thought-leaders", label: "LinkedIn thought-leaders (cluster)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.3, 0.3, 0.2), dossier: "The professional-positivity crowd; synergy-coded and more favorable to acquisitions. Frames the deal as 'exciting next chapter' and 'win-win.' A counterweight to Twitter cynicism, slower and more corporate. Archetype: the synergy optimists.", beliefs: "Every acquisition is an exciting new chapter.", publicFace: "Upbeat, corporate.", privateInterior: "" });
add({ id: "notion-power-users-discord", label: "Notion power-users (Discord/forums)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.35, 0.3, 0.2), dossier: "Deep power-users in Discords and forums who build elaborate systems and help others. High switching cost, high loyalty, high anxiety about disruptive changes. Archetype: the invested super-builders.", beliefs: "I've built my life in here.", publicFace: "Helpful, intense.", privateInterior: "Dreads anything that breaks their setups." });

// Microsoft internal archetypes --------------------------------------------
add({ id: "microsoft-mass-employee", label: "Microsoft employees (mass)", tier: 2, fn: "audience", activationThreshold: 0.45, mood: mood(0.2, 0.0, 0.15), dossier: "Aggregate Microsoft workforce with engineering/sales/marketing/IT sub-moods; mostly audience plus LinkedIn amplifiers. Reacts to the deal as internal news — curiosity, territorial concern (Loop), or pride. Archetype: the big-company rank-and-file.", beliefs: "Another acquisition; how does it affect my org?", publicFace: "LinkedIn-positive.", privateInterior: "Mixed: opportunity for some, threat for Loop-adjacent." });
add({ id: "microsoft-sales-force", label: "Microsoft sales force", tier: 2, fn: "actor", activationThreshold: 0.4, mood: mood(0.3, 0.0, 0.2), dossier: "Post-acquisition, decides whether to lead with Notion or Loop — which determines distribution and the deal's commercial success. Quota-driven; leads with whatever closes. Archetype: the distribution kingmakers.", beliefs: "Lead with whatever I can sell fastest.", publicFace: "Customer-facing.", privateInterior: "Will pick Notion or Loop based on comp and ease." });
add({ id: "loop-team", label: "Microsoft Loop team", tier: 2, fn: "actor", activationThreshold: 0.35, mood: mood(0.35, -0.3, 0.3), dossier: "PMs and engineers on Loop; the most directly threatened internal group. Resentful or anxious about leadership buying their competitor; may argue for integration-on-our-terms or quietly disengage. Archetype: the displaced internal rivals.", beliefs: "We were building this; why buy it?", publicFace: "Team-line supportive.", privateInterior: "Demoralized and territorial." });
add({ id: "copilot-team", label: "Microsoft Copilot team", tier: 2, fn: "actor", activationThreshold: 0.35, mood: mood(0.35, 0.2, 0.25), dossier: "Team building Copilot surfaces; sees Notion as data and a product surface to plug into Copilot. More enthusiastic than Loop. Archetype: the integration-eager team.", beliefs: "Notion is great Copilot surface area.", publicFace: "Constructive.", privateInterior: "Wants the data and the workspace graph." });
add({ id: "microsoft-it-admins", label: "Microsoft-shop IT admins", tier: 2, fn: "audience", activationThreshold: 0.4, mood: mood(0.25, 0.0, 0.2), dossier: "IT admins at Microsoft-centric enterprises; gatekeepers for whether Notion gets provisioned. A Microsoft-owned Notion eases procurement but raises concentration concerns. Archetype: the provisioning gatekeepers.", beliefs: "One vendor is simpler but riskier.", publicFace: "Cautious.", privateInterior: "Weighing convenience vs lock-in." });
add({ id: "power-platform-leadership", label: "Power Platform leadership", tier: 2, fn: "actor", activationThreshold: 0.4, mood: mood(0.3, -0.1, 0.2), dossier: "Owns Power Apps/Power Platform; another internal surface with overlap and turf concerns about where Notion fits. Archetype: the adjacent internal turf-holder.", beliefs: "Where does Notion sit relative to our low-code stack?", publicFace: "Diplomatic.", privateInterior: "Protective of its mandate." });
add({ id: "microsoft-corp-dev", label: "Microsoft Corp Dev (M&A team)", tier: 2, fn: "actor", activationThreshold: 0.3, mood: mood(0.35, 0.1, 0.3), dossier: "The corporate development / M&A team that sources, structures, and shepherds the deal. Optimizes for strategic fit, price, and integration plan; the deal's internal champions and project managers. Archetype: the dealmakers.", beliefs: "A clean structure and a clear thesis get it done.", publicFace: "Process-driven.", privateInterior: "Managing internal resistance (Loop) to close." });

// Investors / financial -----------------------------------------------------
add({ id: "sequoia", label: "Sequoia (Notion investor)", tier: 2, fn: "actor", activationThreshold: 0.35, mood: mood(0.3, 0.1, 0.25), dossier: "Lead-tier venture investor in Notion (reportedly). Weighs a clean, large exit against the upside of continued independence and the signaling to its portfolio. Influential board voice. Archetype: the return-and-reputation-minded lead investor. Uncertainty: exact stake/role inferred from public funding history.", beliefs: "Maximize risk-adjusted return and franchise reputation.", publicFace: "Measured.", privateInterior: "Fund cycle and entry price shape the exit appetite." });
add({ id: "index-ventures", label: "Index Ventures (Notion investor)", tier: 2, fn: "actor", activationThreshold: 0.35, mood: mood(0.3, 0.1, 0.25), dossier: "Venture investor in Notion (reportedly). Similar exit calculus to other leads, with its own fund timing and conviction about Notion's standalone trajectory. Archetype: the co-lead with its own incentives. Uncertainty: inferred from public funding history.", beliefs: "Back the standalone story unless the price is irresistible.", publicFace: "Supportive.", privateInterior: "Quietly modeling the exit." });
add({ id: "coatue", label: "Coatue (Notion investor)", tier: 2, fn: "actor", activationThreshold: 0.35, mood: mood(0.3, 0.1, 0.25), dossier: "Crossover investor in Notion (reportedly). More markets-minded; may be most exit-friendly given crossover-fund dynamics. Archetype: the liquidity-leaning crossover. Uncertainty: inferred from public funding history.", beliefs: "Liquidity and comps matter.", publicFace: "Pragmatic.", privateInterior: "Likely the readiest seller." });
add({ id: "notion-employees-equity", label: "Notion employees (equity holders)", tier: 2, fn: "audience", activationThreshold: 0.3, mood: mood(0.4, 0.0, 0.35), dossier: "Employees with vested and unvested equity — a huge personal stake. Vested may welcome liquidity; unvested fear retention handcuffs and dilution of culture. Drives Blind and Twitter chatter and flight risk. Archetype: the personally-exposed insiders.", beliefs: "This is my equity and my career.", publicFace: "Guarded.", privateInterior: "Vested want liquidity; unvested feel trapped." });
add({ id: "vc-cohort", label: "VC cohort (broad)", tier: 2, fn: "audience", activationThreshold: 0.4, mood: mood(0.3, 0.1, 0.2), dossier: "The broader venture community recalibrating portfolio comps and exit expectations based on the deal. Talks its book on Twitter and to LPs. Archetype: the comp-recalibrating crowd.", beliefs: "This resets the comps for the category.", publicFace: "Thesis-driven.", privateInterior: "Adjusting markups and exit hopes." });
add({ id: "microsoft-shareholders", label: "Microsoft shareholders (mass)", tier: 2, fn: "audience", activationThreshold: 0.5, mood: mood(0.15, 0.0, 0.1), dossier: "Mostly index funds and institutions; low activation, but the stock reaction propagates. Care about price discipline and strategic clarity. Archetype: the patient capital that moves the stock.", beliefs: "Don't overpay; keep the AI story coherent.", publicFace: "Quiet.", privateInterior: "Watching accretion and regulatory risk." });

// Regulators ----------------------------------------------------------------
add({ id: "ftc", label: "FTC (US)", tier: 2, fn: "actor", activationThreshold: 0.8, mood: mood(0.2, -0.1, 0.3), dossier: "US competition regulator. Slow-tick, high-threshold, enormous downstream impact: can delay or block the deal. Skeptical of big-tech consolidation. Fires late and hard. Archetype: the gating power that rarely acts but decides everything. Uncertainty: any specific posture here is scenario-dependent.", beliefs: "Scrutinize big-tech acquisitions for competitive harm.", publicFace: "Formal, deliberate.", privateInterior: "" });
add({ id: "eu-commission", label: "EU Commission (DG COMP)", tier: 2, fn: "actor", activationThreshold: 0.8, mood: mood(0.2, 0.0, 0.3), dossier: "EU competition authority; relatively constructive on remedies post-Activision but rigorous. Slow, high-impact; can impose conditions. Archetype: the remedy-oriented gatekeeper.", beliefs: "Approve with conditions if competition is preserved.", publicFace: "Procedural.", privateInterior: "" });
add({ id: "uk-cma", label: "UK CMA", tier: 2, fn: "actor", activationThreshold: 0.8, mood: mood(0.2, -0.1, 0.3), dossier: "UK competition authority; assertive in tech M&A (notably tough in the Activision review before settling). Slow, high-impact, unpredictable. Archetype: the wildcard regulator.", beliefs: "Protect UK competition; not afraid to intervene.", publicFace: "Rigorous.", privateInterior: "" });

// Developer ecosystem -------------------------------------------------------
add({ id: "notion-api-devs", label: "Notion API developers", tier: 2, fn: "audience", activationThreshold: 0.35, mood: mood(0.3, 0.0, 0.2), dossier: "Developers building on the Notion API. Care about API stability, rate limits, and roadmap; an Azure migration or strategy shift directly affects them. Archetype: the ecosystem builders exposed to platform decisions.", beliefs: "My app depends on a stable API.", publicFace: "Technical.", privateInterior: "Nervous about post-acquisition API changes." });
add({ id: "zapier-make-integrators", label: "Zapier / Make integrators", tier: 2, fn: "audience", activationThreshold: 0.4, mood: mood(0.25, 0.0, 0.2), dossier: "Automation platforms and their users that connect Notion to other tools. A Microsoft owner may favor Power Automate, squeezing third-party integrators. Archetype: the integration middlemen at margin risk.", beliefs: "Open integrations keep workflows alive.", publicFace: "Pragmatic.", privateInterior: "Fear being deprioritized for Power Automate." });
add({ id: "businesses-on-notion-api", label: "Businesses built on the Notion API", tier: 2, fn: "audience", activationThreshold: 0.4, mood: mood(0.25, -0.1, 0.2), dossier: "Companies whose products depend on Notion's API/platform. Existential exposure to platform strategy changes; watch the acquisition closely. Archetype: the dependent businesses.", beliefs: "Our business rides on Notion's platform choices.", publicFace: "Concerned.", privateInterior: "Drafting contingency plans." });
add({ id: "microsoft-dev-ecosystem", label: "Microsoft developer ecosystem", tier: 2, fn: "audience", activationThreshold: 0.45, mood: mood(0.2, 0.1, 0.15), dossier: "Developers in the Microsoft/Azure/Graph ecosystem. See a Notion acquisition as new surface area and integration opportunity within their stack. Archetype: the platform-adjacent builders who gain.", beliefs: "More Microsoft surface is more opportunity.", publicFace: "Opportunistic.", privateInterior: "" });

// Channels / platforms ------------------------------------------------------
add({ id: "linkedin", label: "LinkedIn (platform)", tier: 2, fn: "channel", activationThreshold: 0.2, mood: mood(0.4, 0.2, 0.2), dossier: "Professional platform with a positivity bias; slower than Twitter, more corporate. Amplifies synergy framing and executive statements; flattens dissent. Archetype: the professional-positivity amplifier.", beliefs: "", publicFace: "Upbeat, networked.", privateInterior: "" });
add({ id: "notion-blog", label: "Notion blog (official)", tier: 2, fn: "channel", activationThreshold: 0.3, mood: mood(0.2, 0.1, 0.1), dossier: "Notion's slow, official channel. Carries the company's framing verbatim to users; high credibility, low velocity. The primary surface for the company's own narrative. Archetype: the owned, measured megaphone.", beliefs: "", publicFace: "On-brand, careful.", privateInterior: "" });
add({ id: "microsoft-pr", label: "Microsoft PR / Comms", tier: 2, fn: "channel", activationThreshold: 0.2, mood: mood(0.4, 0.2, 0.3), dossier: "Microsoft's large, fast comms machine. Sets official deal messaging ('independent, synergistic') and seeds friendly press. High reach; trusted by some, discounted by skeptics. Archetype: the corporate megaphone.", beliefs: "", publicFace: "Polished, on-message.", privateInterior: "" });
add({ id: "press-wire", label: "Press wire / newswire", tier: 2, fn: "channel", activationThreshold: 0.2, mood: mood(0.4, 0.0, 0.4), dossier: "Wire services that syndicate the announcement instantly to thousands of outlets. Pure, fast propagation with little transformation. Archetype: the syndication backbone.", beliefs: "", publicFace: "Neutral, factual.", privateInterior: "" });
add({ id: "industry-newsletters", label: "Industry newsletters (cluster)", tier: 2, fn: "channel", activationThreshold: 0.25, mood: mood(0.35, 0.0, 0.25), dossier: "The long tail of tech/SaaS newsletters that summarize and editorialize the deal for niche professional audiences. Medium reach, medium transformation. Archetype: the newsletter middle layer.", beliefs: "", publicFace: "Curated, opinionated.", privateInterior: "" });
add({ id: "ms-earnings-call", label: "Microsoft earnings call (event)", tier: 2, fn: "channel", activationThreshold: 0.5, mood: mood(0.3, 0.0, 0.3), dossier: "A scheduled future event the cascade must account for: analysts will ask about the acquisition's rationale and accretion, and management's framing there moves the stock and the narrative. A delayed, high-impact injection point. Archetype: the scheduled reckoning.", beliefs: "", publicFace: "Scripted, investor-facing.", privateInterior: "" });
add({ id: "onenote", label: "OneNote (artifact)", tier: 2, fn: "artifact", activationThreshold: 0.4, mood: mood(0.15, 0.0, 0.1), dossier: "Microsoft's existing note product; a legacy overlap with Notion that complicates the internal portfolio story. Passive artifact whose existence feeds the 'why buy more notes?' question. Archetype: the legacy overlap.", beliefs: "", publicFace: "", privateInterior: "" });
add({ id: "teams", label: "Microsoft Teams (channel/artifact)", tier: 2, fn: "channel", activationThreshold: 0.3, mood: mood(0.3, 0.0, 0.2), dossier: "Microsoft's collaboration hub and a primary internal distribution surface; where Loop lives and where a Notion integration would compete or plug in. Both a channel (internal comms) and a strategic surface. Archetype: the internal distribution battleground.", beliefs: "", publicFace: "Ubiquitous at work.", privateInterior: "" });
add({ id: "twitter", label: "Twitter / X (platform)", tier: 3, fn: "channel", activationThreshold: 0.1, mood: mood(0.5, 0.0, 0.4), dossier: "Amplification platform. Rewards hot takes and outrage; fast propagation; flattens nuance. The dominant venue where the acquisition narrative is fought in real time, routing journalists' and influencers' takes to the cohorts. Archetype: the algorithmic megaphone.", beliefs: "", publicFace: "Whatever is loudest.", privateInterior: "" });

// ---------------------------------------------------------------------------
// Tier 3 — aggregates (count nodes with averaged sentiment). Generated from
// small tables to keep the file readable.
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
    activationThreshold: s.thr ?? 0.45,
    mood: s.mood ?? mood(0.15, 0.0, 0.1),
  });

// Regional Notion user masses
const regions: Array<[string, string, string]> = [
  ["users-na", "Notion users — North America", "data residency a minor concern"],
  ["users-eu", "Notion users — Europe", "GDPR/data-residency sensitive"],
  ["users-uk", "Notion users — UK", "watching the CMA"],
  ["users-dach", "Notion users — DACH", "privacy-sensitive, Microsoft-heavy enterprises"],
  ["users-france", "Notion users — France", "data-sovereignty conscious"],
  ["users-nordics", "Notion users — Nordics", "design-appreciative, privacy-minded"],
  ["users-india", "Notion users — India", "large, price-sensitive, fast-growing"],
  ["users-sea", "Notion users — Southeast Asia", "mobile-first, price-sensitive"],
  ["users-japan", "Notion users — Japan", "famously strong Notion adoption and community"],
  ["users-korea", "Notion users — South Korea", "strong creator/student adoption"],
  ["users-greater-china", "Notion users — Greater China", "access and data concerns loom large"],
  ["users-anz", "Notion users — Australia/NZ", "enterprise-leaning, English-language press-driven"],
  ["users-latam", "Notion users — Latin America", "creator- and student-led growth"],
  ["users-mena", "Notion users — MENA", "emerging, mobile-first"],
  ["users-africa", "Notion users — Africa", "emerging, community-led"],
];
for (const [id, label, note] of regions) {
  agg({
    id,
    label,
    dossier: `Aggregate regional Notion user mass. Mostly free/prosumer; low individual signal but meaningful aggregate mood. Reacts slowly and in bulk to pricing, data policy, and whether the product still feels independent (${note}). Sentiment tracks the local-press and creator framing more than the original news.`,
    mood: mood(0.15, 0.1, 0.1),
  });
}

// Free-tier sub-segments
const freeSegs: Array<[string, string, string]> = [
  ["free-students", "Free tier — students", "extremely price-sensitive; the growth funnel"],
  ["free-hobbyists", "Free tier — hobbyists", "personal wikis and journals; sentimental"],
  ["free-startups", "Free tier — early startups", "will upgrade or churn based on value"],
  ["free-nonprofits", "Free tier — nonprofits/educators", "budget-constrained, loyalty-driven"],
  ["free-creators", "Free tier — creators", "showcase Notion publicly; influence others"],
];
for (const [id, label, note] of freeSegs) {
  agg({
    id,
    label,
    dossier: `Aggregate free-tier sub-segment. The cohort whose reaction defines a free-tier-removal scenario: ${note}. Individually quiet, collectively a force; a gutted free tier would spike churn and resentment here first.`,
    thr: 0.4,
    mood: mood(0.2, 0.1, 0.15),
  });
}

// Enterprise verticals
const verticals: Array<[string, string, string]> = [
  ["ent-tech", "Enterprise — technology", "fastest to adopt, most API-dependent"],
  ["ent-finance", "Enterprise — financial services", "compliance- and data-policy-obsessed"],
  ["ent-healthcare", "Enterprise — healthcare", "HIPAA/data-residency critical"],
  ["ent-edu", "Enterprise — education", "budget-driven, large seat counts"],
  ["ent-gov", "Enterprise — government/public sector", "sovereignty and procurement rules dominate"],
  ["ent-media", "Enterprise — media/agencies", "collaboration-heavy, brand-conscious"],
  ["ent-consulting", "Enterprise — consulting/services", "knowledge-base heavy, client-data sensitive"],
  ["ent-retail", "Enterprise — retail/CPG", "ops-heavy, cost-sensitive"],
  ["ent-manufacturing", "Enterprise — manufacturing", "conservative, IT-gated"],
  ["ent-legal", "Enterprise — legal", "confidentiality and data-policy paramount"],
];
for (const [id, label, note] of verticals) {
  agg({
    id,
    label,
    fn: "audience",
    dossier: `Aggregate enterprise vertical. Procurement and IT weigh a Microsoft-owned Notion on stability vs data policy (${note}). Slow to move, high contract value; analyst (Gartner/Forrester) guidance and CISO posture drive the decision more than Twitter sentiment.`,
    thr: 0.45,
    mood: mood(0.15, 0.0, 0.15),
  });
}

// Competitor user bases (latent switchers)
const compBases: Array<[string, string]> = [
  ["linear-users", "Linear users"],
  ["coda-users", "Coda / Superhuman users"],
  ["clickup-users", "ClickUp users"],
  ["airtable-users", "Airtable users"],
  ["asana-users", "Asana users"],
  ["obsidian-users", "Obsidian users"],
  ["confluence-users", "Confluence users"],
  ["monday-users", "monday.com users"],
  ["roam-users", "Roam / Tana users"],
  ["gdocs-users", "Google Docs users"],
];
for (const [id, label] of compBases) {
  agg({
    id,
    label,
    dossier: `Aggregate user base of a Notion competitor. A Notion stumble (acquisition, free-tier cut) makes some of these gainable for Notion — or makes wavering Notion users defect here. Sentiment tracks the competitor's positioning versus a Microsoft-owned Notion.`,
    thr: 0.4,
    mood: mood(0.15, 0.0, 0.1),
  });
}

// Follower masses (batched following edges)
const followerMasses: Array<[string, string]> = [
  ["followers-ivanzhao", "Followers of @ivanzhao"],
  ["followers-notion", "Followers of @NotionHQ"],
  ["followers-casey", "Followers of Casey Newton"],
  ["followers-swyx", "Followers of swyx"],
  ["followers-dhh", "Followers of DHH"],
  ["followers-paulg", "Followers of Paul Graham"],
  ["followers-satya", "Followers of Satya Nadella"],
];
for (const [id, label] of followerMasses) {
  agg({
    id,
    label,
    dossier: `Aggregate follower audience. Receives one batched edge from the principal account rather than thousands of individual edges; amplifies or dampens the principal's take to the wider timeline. Sentiment tracks the principal plus the platform's algorithmic bias.`,
    thr: 0.35,
    mood: mood(0.2, 0.0, 0.2),
  });
}

// Reader masses (journalist -> audience)
const readerMasses: Array<[string, string]> = [
  ["platformer-readers", "Platformer readers"],
  ["verge-readers", "The Verge readers"],
  ["tc-readers", "TechCrunch readers"],
  ["bloomberg-readers", "Bloomberg readers / terminal"],
  ["stratechery-readers", "Stratechery readers (execs)"],
  ["information-readers", "The Information subscribers"],
  ["hn-readers", "Hacker News lurkers (mass)"],
];
for (const [id, label] of readerMasses) {
  agg({
    id,
    label,
    dossier: `Aggregate readership of an outlet. Inherits the outlet's framing of the deal; an insider/enterprise audience whose adjusted beliefs feed back into buying and sentiment. Low individual signal, meaningful aggregate.`,
    thr: 0.4,
    mood: mood(0.2, 0.0, 0.15),
  });
}

// Reddit long-tail
const redditLongTail: Array<[string, string]> = [
  ["r-startups", "r/startups"],
  ["r-sideproject", "r/SideProject"],
  ["r-webdev", "r/webdev"],
  ["r-datahoarder", "r/DataHoarder"],
  ["r-pkm", "r/PKMS (personal knowledge mgmt)"],
  ["r-obsidianmd", "r/ObsidianMD"],
  ["r-selfhosted", "r/selfhosted"],
];
for (const [id, label] of redditLongTail) {
  agg({
    id,
    label,
    fn: "audience",
    dossier: `Aggregate subreddit audience adjacent to the productivity/independence debate. Picks up the story from Twitter and Hacker News and reframes it for its niche (ownership, self-hosting, alternatives). r/ObsidianMD and r/selfhosted skew toward 'told you so' on a sellout.`,
    thr: 0.35,
    mood: mood(0.2, -0.1, 0.15),
  });
}

// Microsoft sub-masses
const msSubMasses: Array<[string, string]> = [
  ["m365-enterprise-admins", "M365 enterprise admins (mass)"],
  ["m365-smb", "M365 SMB customers (mass)"],
  ["teams-users", "Teams users (mass)"],
  ["office-consumers", "Office consumer users (mass)"],
  ["copilot-users", "Copilot users (mass)"],
  ["azure-customers", "Azure customers (mass)"],
];
for (const [id, label] of msSubMasses) {
  agg({
    id,
    label,
    dossier: `Aggregate Microsoft-ecosystem mass. A Microsoft-owned Notion reaches them through bundling and provisioning; their adoption is the distribution upside the deal is partly about. Slow, IT- and bundle-mediated.`,
    thr: 0.45,
    mood: mood(0.15, 0.0, 0.1),
  });
}

// Analyst clients / enterprise buyers
const buyers: Array<[string, string]> = [
  ["gartner-clients", "Gartner enterprise clients"],
  ["forrester-clients", "Forrester enterprise clients"],
  ["enterprise-procurement", "Enterprise procurement teams"],
  ["enterprise-it-security", "Enterprise IT security teams"],
  ["ciso-cohort", "CISO cohort"],
];
for (const [id, label] of buyers) {
  agg({
    id,
    label,
    dossier: `Aggregate enterprise buyer/advisory cohort. Leans on analyst guidance and risk posture rather than public sentiment; a Microsoft-owned Notion shifts the vendor-risk and data-policy calculus. Slow, deliberate, high contract leverage.`,
    thr: 0.5,
    mood: mood(0.15, 0.0, 0.15),
  });
}

// VC / financial long-tail
const financial: Array<[string, string]> = [
  ["seed-vc-cohort", "Seed VC cohort"],
  ["growth-vc-cohort", "Growth VC cohort"],
  ["public-market-investors", "Public-market investors"],
  ["angel-cohort", "Angel investor cohort"],
  ["lp-cohort", "LP cohort"],
];
for (const [id, label] of financial) {
  agg({
    id,
    label,
    dossier: `Aggregate financial cohort recalibrating comps and exit expectations on the deal. Growth/public-market investors focus on accretion and AI strategy; seed/angel/LP cohorts read it as a signal about exit environments for the category.`,
    thr: 0.45,
    mood: mood(0.2, 0.05, 0.15),
  });
}

// Notion ecosystem long-tail
const ecosystem: Array<[string, string]> = [
  ["notion-template-marketplace", "Notion template marketplace"],
  ["notion-ambassadors", "Notion ambassadors program"],
  ["notion-consultants", "Notion certified consultants"],
  ["notion-youtube-creators", "Notion YouTube creators"],
  ["notion-course-sellers", "Notion course sellers"],
];
for (const [id, label] of ecosystem) {
  agg({
    id,
    label,
    dossier: `Aggregate Notion-economy participant whose livelihood depends on Notion's health and openness. Reacts loudly and early to changes that threaten the audience or paywall the base; an amplifier into the creator and student funnels.`,
    thr: 0.35,
    mood: mood(0.25, 0.2, 0.2),
  });
}

// International press
const intlPress: Array<[string, string]> = [
  ["uk-press", "UK tech press"],
  ["eu-press", "EU tech press"],
  ["india-press", "India tech press"],
  ["japan-press", "Japan tech press"],
  ["german-press", "German tech press"],
];
for (const [id, label] of intlPress) {
  agg({
    id,
    label,
    fn: "channel",
    dossier: `Aggregate regional tech press. Localizes and reframes the deal for its national audience, often foregrounding local regulatory angle (CMA/EU) or local user impact. Medium reach, regional transformation.`,
    thr: 0.3,
    mood: mood(0.3, 0.0, 0.25),
  });
}

// Misc culture clusters
const culture: Array<[string, string, NodeFunction, string]> = [
  ["mainstream-press", "Mainstream press (general)", "channel", "General-interest outlets that cover the deal as 'Microsoft buys the app on your laptop,' reaching far beyond tech and flattening nuance."],
  ["finance-twitter", "Finance Twitter (cluster)", "audience", "Markets-and-deals commentators reading the acquisition through valuation, accretion, and antitrust odds."],
  ["design-twitter", "Design Twitter (cluster)", "audience", "Designers reacting to the craft/aesthetic stakes of a beloved design-led product changing hands."],
  ["pkm-community", "PKM community (cluster)", "audience", "Personal-knowledge-management enthusiasts weighing the sellout against local-first alternatives (Obsidian, Logseq, Tana)."],
  ["tech-aggregators", "Tech aggregators (mass)", "channel", "Aggregator sites and bots that re-syndicate headlines instantly with little transformation, widening reach."],
];
for (const [id, label, fn, note] of culture) {
  agg({ id, label, fn, dossier: `Aggregate cluster. ${note}`, thr: 0.3, mood: mood(0.3, 0.0, 0.2) });
}

// ---------------------------------------------------------------------------
// Edges. Load-bearing (llmMediated:true) edges use only the "blessed" character
// keys L4 is built around (the 6 EDGE_ARCHETYPES plus the three already in
// mini.json: company->journalist, internal-leadership, leadership->report).
// Everything else is a light, deterministic edge (llmMediated:false) whose
// character+weight L4 handles with cheap rules.
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
  idOverride?: string,
): void {
  if (source === target) throw new Error(`self-loop: ${source}`);
  if (!nodeIds.has(source)) throw new Error(`edge source missing: ${source}`);
  if (!nodeIds.has(target)) throw new Error(`edge target missing: ${target}`);
  let id = idOverride ?? `${source}->${target}`;
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
const fanIn = (
  sources: string[],
  target: string,
  direction: "one-way" | "two-way",
  weight: number,
  character: string,
  llm: boolean,
): void => {
  for (const s of sources) pushEdge(s, target, direction, weight, character, llm);
};

// --- The 8 mini.json edge ids, preserved for fixture/cross-worker consistency.
pushEdge("notion-corp", "casey-newton", "one-way", 0.8, "company->journalist", true, "corp-press");
pushEdge("notion-corp", "ivan-zhao", "two-way", 0.9, "internal-leadership", true, "corp-ceo");
pushEdge("ivan-zhao", "eng-manager", "one-way", 0.6, "leadership->report", true, "ceo-mgr");
pushEdge("maya", "eng-manager", "two-way", 0.7, "employee->manager", true, "maya-mgr");
pushEdge("casey-newton", "twitter", "one-way", 0.9, "journalist->audience", true, "journo-twitter");
pushEdge("twitter", "prod-twitter", "one-way", 0.8, "platform-amplification", false, "twitter-prod");
pushEdge("notion-corp", "linear-leadership", "one-way", 0.5, "competitor->strategy", true, "corp-linear");
pushEdge("prod-twitter", "notion-corp", "one-way", 0.4, "customer->cohort", false, "prod-corp");

// --- Notion internal leadership ring (load-bearing, two-way).
fanOut("ivan-zhao", ["akshay-kothari", "simon-last", "rama-katkar"], "two-way", 0.85, "internal-leadership", true);
pushEdge("akshay-kothari", "rama-katkar", "two-way", 0.7, "internal-leadership", true);
pushEdge("notion-corp", "notion-board", "two-way", 0.8, "internal-leadership", true);
pushEdge("ivan-zhao", "notion-board", "two-way", 0.8, "internal-leadership", true);
pushEdge("rama-katkar", "notion-board", "two-way", 0.75, "internal-leadership", true);

// --- Notion leadership -> reports (load-bearing, one-way down the chain).
fanOut(
  "ivan-zhao",
  ["head-of-design", "head-of-marketing", "head-of-platform", "vp-of-ai", "director-of-engineering", "head-of-people"],
  "one-way",
  0.6,
  "leadership->report",
  true,
);
fanOut("akshay-kothari", ["head-of-sales", "head-of-customer-success", "head-of-marketing"], "one-way", 0.6, "leadership->report", true);
pushEdge("vp-of-ai", "eng-manager", "one-way", 0.6, "leadership->report", true);
pushEdge("director-of-engineering", "eng-manager", "one-way", 0.6, "leadership->report", true);

// --- Notion ICs/teams -> managers (load-bearing, employee->manager, up-chain).
pushEdge("ai-features-team", "eng-manager", "two-way", 0.6, "employee->manager", true);
pushEdge("eng-manager", "vp-of-ai", "one-way", 0.6, "employee->manager", true);
pushEdge("core-platform-eng", "director-of-engineering", "two-way", 0.6, "employee->manager", true);
pushEdge("growth-eng", "director-of-engineering", "two-way", 0.55, "employee->manager", true);
pushEdge("postgres-eng", "director-of-engineering", "one-way", 0.5, "employee->manager", true);
pushEdge("design-team", "head-of-design", "two-way", 0.6, "employee->manager", true);
pushEdge("marketing-team", "head-of-marketing", "two-way", 0.6, "employee->manager", true);
pushEdge("sales-team", "head-of-sales", "two-way", 0.6, "employee->manager", true);
pushEdge("customer-success-team", "head-of-customer-success", "two-way", 0.6, "employee->manager", true);
pushEdge("maya", "ai-features-team", "one-way", 0.5, "friend->friend", true); // lateral peer spread
pushEdge("postgres-eng", "core-platform-eng", "one-way", 0.5, "membership", false);

// --- Company -> journalists (load-bearing). corp-press (casey) already added.
fanOut(
  "notion-corp",
  ["alex-heath", "the-information", "bloomberg-enterprise", "techcrunch", "eric-newcomer"],
  "one-way",
  0.75,
  "company->journalist",
  true,
);
fanOut(
  "microsoft-pr",
  ["casey-newton", "alex-heath", "the-information", "bloomberg-enterprise", "techcrunch", "kara-swisher"],
  "one-way",
  0.8,
  "company->journalist",
  true,
);
fanOut("microsoft-corp", ["bloomberg-enterprise", "ben-thompson"], "one-way", 0.6, "company->journalist", true);
pushEdge("notion-blog", "casey-newton", "one-way", 0.5, "company->journalist", true);

// --- Journalists -> audiences (load-bearing) + their reader masses.
pushEdge("casey-newton", "platformer-readers", "one-way", 0.9, "journalist->audience", true);
fanOut("casey-newton", ["skeptical-of-msft-acquisitions", "prod-twitter"], "one-way", 0.7, "journalist->audience", true);
fanOut("alex-heath", ["twitter", "verge-readers"], "one-way", 0.85, "journalist->audience", true);
fanOut("ben-thompson", ["stratechery-readers", "enterprise-saas-twitter", "linkedin-thought-leaders"], "one-way", 0.8, "journalist->audience", true);
fanOut("the-information", ["information-readers", "vc-cohort"], "one-way", 0.8, "journalist->audience", true);
fanOut("bloomberg-enterprise", ["bloomberg-readers", "microsoft-shareholders", "public-market-investors"], "one-way", 0.8, "journalist->audience", true);
fanOut("techcrunch", ["tc-readers", "twitter", "tech-aggregators"], "one-way", 0.85, "journalist->audience", true);
fanOut("eric-newcomer", ["vc-cohort", "twitter"], "one-way", 0.75, "journalist->audience", true);
fanOut("kara-swisher", ["twitter", "mainstream-press"], "one-way", 0.8, "journalist->audience", true);

// --- Peer journalist/influencer lateral edges (friend->friend, load-bearing).
pushEdge("casey-newton", "kara-swisher", "two-way", 0.5, "friend->friend", true);
pushEdge("dhh", "paul-graham", "two-way", 0.4, "friend->friend", true);
pushEdge("brad-gerstner", "bill-gurley", "two-way", 0.45, "friend->friend", true);

// --- Competitor->strategy (load-bearing): Notion's move pings rivals who watch it.
fanOut(
  "notion-corp",
  [
    "superhuman-coda-leadership",
    "clickup-leadership",
    "airtable-leadership",
    "asana-leadership",
    "obsidian-team",
    "atlassian-confluence",
    "google-workspace-leadership",
    "salesforce-slack",
    "microsoft-loop",
  ],
  "one-way",
  0.5,
  "competitor->strategy",
  true,
);
fanOut("microsoft-corp", ["google-workspace-leadership", "salesforce-slack"], "one-way", 0.5, "competitor->strategy", true);

// --- Microsoft internal leadership ring + reports (load-bearing).
fanOut("microsoft-corp", ["satya-nadella", "microsoft-board"], "two-way", 0.85, "internal-leadership", true);
fanOut("satya-nadella", ["mustafa-suleyman", "rajesh-jha", "amy-hood", "kevin-scott"], "two-way", 0.8, "internal-leadership", true);
pushEdge("microsoft-corp-dev", "satya-nadella", "one-way", 0.6, "employee->manager", true);
pushEdge("microsoft-corp-dev", "amy-hood", "one-way", 0.6, "employee->manager", true);
pushEdge("loop-team", "rajesh-jha", "two-way", 0.6, "employee->manager", true);
pushEdge("copilot-team", "jacob-andreou", "two-way", 0.6, "employee->manager", true); // Copilot product now under Andreou, not Suleyman
pushEdge("jacob-andreou", "satya-nadella", "one-way", 0.6, "employee->manager", true);
pushEdge("power-platform-leadership", "rajesh-jha", "one-way", 0.5, "employee->manager", true);
pushEdge("microsoft-sales-force", "rajesh-jha", "one-way", 0.5, "employee->manager", true);
pushEdge("rajesh-jha", "microsoft-loop", "two-way", 0.7, "leadership->report", true);

// --- Cross-company acquisition channel (load-bearing).
pushEdge("microsoft-corp", "notion-corp", "two-way", 0.8, "competitor->strategy", true);
pushEdge("mustafa-suleyman", "vp-of-ai", "one-way", 0.5, "leadership->report", true);
pushEdge("microsoft-corp-dev", "notion-board", "one-way", 0.6, "investor->company", false);

// --- Platforms amplify to clusters (light, platform-amplification).
fanOut(
  "twitter",
  [
    "ai-twitter",
    "developer-twitter",
    "enterprise-saas-twitter",
    "skeptical-of-msft-acquisitions",
    "design-twitter",
    "finance-twitter",
    "swyx",
    "dhh",
    "keith-rabois",
    "followers-notion",
    "followers-casey",
  ],
  "one-way",
  0.7,
  "platform-amplification",
  false,
);
fanOut("linkedin", ["linkedin-thought-leaders", "enterprise-saas-twitter", "microsoft-mass-employee"], "one-way", 0.6, "platform-amplification", false);
fanOut("hacker-news", ["hn-readers", "developer-twitter", "r-startups", "r-selfhosted"], "one-way", 0.7, "platform-amplification", false);
fanOut("blind", ["notion-employees-equity", "twitter"], "one-way", 0.6, "employee->manager", false); // leak surface (light)
fanOut("product-hunt", ["indiehackers", "buildinpublic"], "one-way", 0.5, "platform-amplification", false);
fanOut("press-wire", ["mainstream-press", "tech-aggregators", "industry-newsletters"], "one-way", 0.7, "platform-amplification", false);
fanOut("microsoft-pr", ["linkedin", "press-wire"], "one-way", 0.7, "platform-amplification", false);
fanOut("notion-blog", ["twitter", "reddit-notion", "notion-creators"], "one-way", 0.6, "platform-amplification", false);

// --- Influencers -> follower masses / clusters (light, following).
pushEdge("ivan-zhao", "followers-ivanzhao", "one-way", 0.6, "following", false);
pushEdge("satya-nadella", "followers-satya", "one-way", 0.6, "following", false);
fanOut("swyx", ["ai-twitter", "followers-swyx"], "one-way", 0.6, "following", false);
fanOut("dhh", ["developer-twitter", "followers-dhh", "indiehackers"], "one-way", 0.6, "following", false);
fanOut("paul-graham", ["followers-paulg", "buildinpublic", "vc-cohort"], "one-way", 0.6, "following", false);
fanOut("brad-gerstner", ["finance-twitter", "vc-cohort"], "one-way", 0.55, "following", false);
fanOut("bill-gurley", ["finance-twitter", "public-market-investors"], "one-way", 0.55, "following", false);
fanOut("keith-rabois", ["twitter", "vc-cohort"], "one-way", 0.5, "following", false);

// --- Analyst -> enterprise buyers (light, analyst->market: credible, slow).
fanOut("gartner-collab", ["gartner-clients", "enterprise-customers", "enterprise-procurement", "ciso-cohort"], "one-way", 0.6, "analyst->market", false);
fanOut("forrester", ["forrester-clients", "enterprise-customers", "enterprise-it-security"], "one-way", 0.6, "analyst->market", false);

// --- Investors -> company / employees (light, investor->company).
fanOut("sequoia", ["notion-corp", "notion-board"], "one-way", 0.6, "investor->company", false);
fanOut("index-ventures", ["notion-corp", "notion-board"], "one-way", 0.6, "investor->company", false);
fanOut("coatue", ["notion-corp", "notion-board"], "one-way", 0.6, "investor->company", false);
pushEdge("microsoft-shareholders", "microsoft-corp", "one-way", 0.4, "investor->company", false);
fanOut("notion-employees-equity", ["blind", "twitter"], "one-way", 0.5, "customer->cohort", false);

// --- Regulators -> companies (light, regulator->company: rare, high-threshold).
fanOut("ftc", ["microsoft-corp", "notion-corp"], "one-way", 0.6, "regulator->company", false);
pushEdge("eu-commission", "microsoft-corp", "one-way", 0.6, "regulator->company", false);
pushEdge("uk-cma", "microsoft-corp", "one-way", 0.6, "regulator->company", false);

// --- Customers -> cohort feedback to the company (light, customer->cohort).
fanIn(
  ["enterprise-customers", "prosumer-customers", "free-tier-users", "notion-creators", "notion-api-devs", "reddit-notion"],
  "notion-corp",
  "one-way",
  0.4,
  "customer->cohort",
  false,
);

// --- Cohort membership (light, membership): exemplars/sub-cohorts -> parents.
fanIn(["students-cohort", "writers-cohort", "designers-specs-cohort", "engineers-wiki-cohort", "ops-crm-cohort"], "prosumer-customers", "one-way", 0.4, "membership", false);
fanIn(["free-students", "free-hobbyists", "free-startups", "free-nonprofits", "free-creators"], "free-tier-users", "one-way", 0.5, "membership", false);
fanIn(verticals.map((v) => v[0]), "enterprise-customers", "one-way", 0.4, "membership", false);
fanOut("free-tier-users", regions.map((r) => r[0]), "one-way", 0.4, "platform-amplification", false);

// --- Competitor leadership -> their user bases & poaching latent cohorts (light).
const compPairs: Array<[string, string]> = [
  ["linear-leadership", "linear-users"],
  ["superhuman-coda-leadership", "coda-users"],
  ["clickup-leadership", "clickup-users"],
  ["airtable-leadership", "airtable-users"],
  ["asana-leadership", "asana-users"],
  ["obsidian-team", "obsidian-users"],
  ["atlassian-confluence", "confluence-users"],
  ["google-workspace-leadership", "gdocs-users"],
];
for (const [lead, base] of compPairs) {
  pushEdge(lead, base, "one-way", 0.6, "competitor->customers", false);
  pushEdge(lead, "considered-notion-chose-competitor", "one-way", 0.4, "competitor->customers", false);
  pushEdge(lead, "tried-notion-bounced", "one-way", 0.3, "competitor->customers", false);
}
pushEdge("obsidian-team", "writers-cohort", "one-way", 0.4, "competitor->customers", false); // refuge dynamic
pushEdge("obsidian-team", "pkm-community", "one-way", 0.5, "competitor->customers", false);

// --- Microsoft distribution surfaces -> latent base & MS masses (light).
fanOut("microsoft-corp", ["m365-installed-base", "microsoft-mass-employee"], "one-way", 0.5, "platform-amplification", false);
fanOut("microsoft-sales-force", ["m365-enterprise-admins", "m365-smb", "microsoft-it-admins"], "one-way", 0.5, "competitor->customers", false);
fanOut("teams", ["teams-users", "microsoft-mass-employee", "loop-team"], "one-way", 0.5, "platform-amplification", false);
pushEdge("microsoft-loop", "loop-team", "two-way", 0.6, "internal-leadership", false);
fanOut("m365-copilot", ["copilot-users", "copilot-team"], "one-way", 0.4, "platform-amplification", false);
pushEdge("onenote", "office-consumers", "one-way", 0.3, "platform-amplification", false);
pushEdge("m365-installed-base", "azure-customers", "one-way", 0.3, "membership", false);
pushEdge("microsoft-pr", "ms-earnings-call", "one-way", 0.4, "platform-amplification", false);
pushEdge("ms-earnings-call", "public-market-investors", "one-way", 0.6, "analyst->market", false);
pushEdge("ms-earnings-call", "bloomberg-enterprise", "one-way", 0.5, "company->journalist", true);

// --- Dev ecosystem reactions (light).
fanOut("head-of-platform", ["notion-api-devs", "businesses-on-notion-api"], "one-way", 0.5, "leadership->report", false);
fanOut("notion-api-devs", ["zapier-make-integrators", "businesses-on-notion-api", "developer-twitter"], "one-way", 0.4, "membership", false);
pushEdge("microsoft-dev-ecosystem", "azure-customers", "one-way", 0.3, "membership", false);

// --- Community cross-talk + reader/community feedback (light).
fanOut("hacker-news", ["r-webdev", "r-datahoarder"], "one-way", 0.5, "platform-amplification", false);
fanOut("pkm-community", ["r-pkm", "r-obsidianmd"], "one-way", 0.5, "membership", false);
fanIn(["reddit-productivity", "reddit-sysadmin"], "hacker-news", "one-way", 0.3, "platform-amplification", false);
fanOut("notion-creators", ["students-cohort", "free-creators", "notion-youtube-creators"], "one-way", 0.5, "platform-amplification", false);
fanIn(["notion-template-marketplace", "notion-ambassadors", "notion-consultants", "notion-youtube-creators", "notion-course-sellers"], "notion-corp", "one-way", 0.3, "customer->cohort", false);
fanOut("prod-twitter", ["reddit-notion", "notion-power-users-discord"], "one-way", 0.5, "platform-amplification", false);

// --- International press picks up the wire and localizes (light + audiences).
fanOut("press-wire", intlPress.map((p) => p[0]), "one-way", 0.5, "platform-amplification", false);
pushEdge("uk-press", "users-uk", "one-way", 0.5, "journalist->audience", false);
pushEdge("eu-press", "users-eu", "one-way", 0.5, "journalist->audience", false);
pushEdge("india-press", "users-india", "one-way", 0.5, "journalist->audience", false);
pushEdge("japan-press", "users-japan", "one-way", 0.5, "journalist->audience", false);
pushEdge("german-press", "users-dach", "one-way", 0.5, "journalist->audience", false);
pushEdge("uk-press", "uk-cma", "one-way", 0.3, "regulator->company", false);

// --- A few cohort -> latent / regional cross edges so masses are reachable.
fanOut("twitter", ["users-na", "users-india", "users-japan", "users-korea", "users-latam"], "one-way", 0.4, "platform-amplification", false);
fanOut("skeptical-of-msft-acquisitions", ["prod-twitter", "developer-twitter", "tried-notion-bounced"], "one-way", 0.5, "platform-amplification", false);
fanOut("linkedin-thought-leaders", ["enterprise-customers", "m365-installed-base"], "one-way", 0.3, "platform-amplification", false);

// --- Downward broadcast / briefings: ensure every cohort & aggregate has an
// inbound path so the cascade can reach it (not just feed upward).
fanOut("microsoft-corp", ["m365-copilot", "microsoft-pr", "microsoft-corp-dev", "microsoft-dev-ecosystem", "microsoft-sales-force"], "one-way", 0.6, "leadership->report", false);
fanOut("rajesh-jha", ["teams", "onenote", "power-platform-leadership"], "one-way", 0.5, "leadership->report", false);
pushEdge("jacob-andreou", "m365-copilot", "one-way", 0.4, "leadership->report", false);
pushEdge("notion-corp", "notion-blog", "one-way", 0.7, "company->journalist", false);
pushEdge("director-of-engineering", "postgres-eng", "one-way", 0.5, "leadership->report", false);
fanOut("notion-corp", ["gartner-collab", "forrester"], "one-way", 0.5, "company->journalist", false);
fanOut("microsoft-pr", ["gartner-collab", "forrester"], "one-way", 0.5, "company->journalist", false);
fanOut("bloomberg-enterprise", ["ftc", "eu-commission"], "one-way", 0.4, "journalist->audience", false);
fanOut("notion-board", ["sequoia", "index-ventures", "coatue"], "one-way", 0.6, "investor->company", false);
fanOut("vc-cohort", ["seed-vc-cohort", "growth-vc-cohort", "angel-cohort", "lp-cohort"], "one-way", 0.4, "membership", false);
fanOut("twitter", ["smb-customers", "reddit-productivity", "reddit-sysadmin", "product-hunt", "monday-users", "roam-users"], "one-way", 0.4, "platform-amplification", false);
pushEdge("hacker-news", "r-sideproject", "one-way", 0.4, "platform-amplification", false);
fanOut("prod-twitter", ["engineers-wiki-cohort", "designers-specs-cohort", "ops-crm-cohort"], "one-way", 0.4, "platform-amplification", false);
fanOut("notion-blog", ["free-students", "free-hobbyists", "free-startups", "free-nonprofits"], "one-way", 0.4, "platform-amplification", false);
fanOut("notion-blog", ["notion-template-marketplace", "notion-ambassadors", "notion-consultants", "notion-course-sellers"], "one-way", 0.4, "platform-amplification", false);
fanOut("gartner-collab", verticals.map((v) => v[0]), "one-way", 0.4, "analyst->market", false);

// ---------------------------------------------------------------------------
// Seed actions — the curated on-stage action menu.
// ---------------------------------------------------------------------------

const seeds: SeedAction[] = [
  {
    id: "acquisition",
    label: "Notion is acquired by Microsoft",
    targets: ["notion-corp"],
    payload:
      "Microsoft is acquiring Notion. The acquisition is announced publicly today; Notion keeps its brand and operates as an independent Microsoft subsidiary, with its product integrating into Microsoft 365 and Copilot.",
  },
  {
    id: "free-tier-removal",
    label: "Notion guts its free tier",
    targets: ["notion-corp"],
    payload:
      "Notion is ending its free personal tier today: free workspaces become read-only and users must upgrade to a paid plan to keep editing. Notion cites the cost of running its AI features.",
  },
  {
    id: "ceo-steps-down",
    label: "Ivan Zhao steps down as CEO",
    targets: ["notion-corp", "ivan-zhao"],
    payload:
      "Ivan Zhao is stepping down as Notion's CEO, moving to executive chairman to focus on product and craft. Notion's board appoints a new operator-CEO to run the business.",
  },
  {
    id: "open-source",
    label: "Notion open-sources its core engine",
    targets: ["notion-corp"],
    payload:
      "Notion is open-sourcing its core block and editor engine under a permissive (Apache-2.0-style) license, releasing the code publicly and inviting the ecosystem to build on it as the open foundation for tools for thought.",
  },
  {
    id: "engineer-idea",
    label: "An engineer DMs their manager with a product idea",
    targets: ["maya"],
    payload:
      "Maya direct-messages her engineering manager with a product idea: use AI to auto-generate links between Notion pages based on semantic similarity.",
  },
];

// ---------------------------------------------------------------------------
// Assemble, self-check, validate, write.
// ---------------------------------------------------------------------------

// Bulk Tier-2/Tier-3 dossiers, generated by gen-dossiers.ts via Gemini Flash
// (the "mass info" lane). If present, they override the inline first-pass
// dossiers for tier 2/3 nodes; tier 1 stays curated. Inline text is the
// offline fallback so the build never depends on a live model.
const here = path.dirname(fileURLToPath(import.meta.url));
let bulkDossiers: Record<string, string> = {};
try {
  bulkDossiers = JSON.parse(readFileSync(path.join(here, "dossiers.bulk.json"), "utf8"));
} catch {
  /* not generated yet — use inline fallbacks */
}
let overridden = 0;
for (const n of nodes) {
  if (n.tier !== 1 && bulkDossiers[n.id]) {
    n.dossier = bulkDossiers[n.id];
    overridden++;
  }
}

const world: World = {
  id: "notion",
  label: "Notion (full world) — Microsoft acquisition & adjacent scenarios",
  nodes,
  edges,
  seeds,
};

// Referential integrity (the kernel will index these, so they must resolve).
for (const s of seeds) {
  for (const t of s.targets) {
    if (!nodeIds.has(t)) throw new Error(`seed ${s.id} targets missing node: ${t}`);
  }
}
// Unique node ids.
if (nodeIds.size !== nodes.length) {
  const seen = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.id)) throw new Error(`duplicate node id: ${n.id}`);
    seen.add(n.id);
  }
}
// Every non-channel/non-artifact node should be reachable (have ≥1 inbound edge)
// so a cascade can actually touch it. Sources of truth (the corp entities) and
// pure broadcasters are allowed to have none.
const hasInbound = new Set<string>();
for (const e of edges) {
  hasInbound.add(e.target);
  if (e.direction === "two-way") hasInbound.add(e.source); // two-way reaches both ends
}
// The corp entities are sources of truth; seed targets receive the action directly.
const rootsAllowed = new Set<string>([
  "notion-corp",
  "microsoft-corp",
  ...seeds.flatMap((s) => s.targets),
]);
const unreachable = nodes
  .filter((n) => !hasInbound.has(n.id) && !rootsAllowed.has(n.id))
  .map((n) => n.id);
if (unreachable.length > 0) {
  throw new Error(`unreachable nodes (no inbound edge): ${unreachable.join(", ")}`);
}

// Schema validation — fix the output, never the schema (AGENTS.md §9).
WorldSchema.parse(world);

const outPath = path.join(here, "world.json");
writeFileSync(outPath, JSON.stringify(world, null, 2) + "\n", "utf8");

const tierCounts = { 1: 0, 2: 0, 3: 0 } as Record<Tier, number>;
for (const n of nodes) tierCounts[n.tier]++;
console.log(
  `wrote ${outPath}\n  nodes: ${nodes.length} (T1=${tierCounts[1]}, T2=${tierCounts[2]}, T3=${tierCounts[3]})` +
    `\n  edges: ${edges.length} (llmMediated=${edges.filter((e) => e.llmMediated).length})` +
    `\n  seeds: ${seeds.length}` +
    `\n  tier2/3 dossiers from Flash: ${overridden}/${nodes.filter((n) => n.tier !== 1).length}`,
);
