import type { Cascade, NodeState, MonteCarloResult } from "@wake/contracts";
import cascadeJson from "@fixtures/cascades/notion-acquisition.json";
import mcJson from "@fixtures/montecarlo/notion-acquisition.json";

const cascade = cascadeJson as unknown as Cascade;
const mc = mcJson as unknown as MonteCarloResult;

// Placeholder colour ramp by sentiment. L8 replaces this with the real palette.
function sentimentColor(s: number): string {
  if (s <= -0.4) return "#e0556b"; // hostile
  if (s < -0.1) return "#e0a155"; // alarmed
  if (s < 0.1) return "#8a93a6"; // neutral
  return "#5bd1a0"; // positive
}

const card: React.CSSProperties = {
  background: "#12151d",
  border: "1px solid #232838",
  borderRadius: 10,
  padding: 16,
};

/**
 * Placeholder UI — owned by L8 (see briefs/L8-viz.md). It proves the seam:
 * everything here is read straight from the fixture Cascade + MonteCarloResult,
 * so the real force-directed graph / cascade animation / fan view can be built
 * against these exact shapes with zero dependency on the kernel.
 */
export default function Page() {
  const final = cascade.finalState;
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0d12",
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui",
        color: "#e6e9f0",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.5 }}>Wake</h1>
          <p style={{ margin: "4px 0 0", color: "#8a93a6" }}>
            a world model for organizational action &middot;{" "}
            <code style={{ color: "#5bd1a0" }}>
              {cascade.meta.worldId} / {cascade.meta.seedActionId}
            </code>{" "}
            <span style={{ color: "#5b6b8a" }}>
              (placeholder — rendering the fixture cascade)
            </span>
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 16,
          }}
        >
          <section style={card}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Final node states</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {Object.entries(final).map(([id, st]) => {
                const s = st as NodeState;
                return (
                  <div
                    key={id}
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 12,
                        background: sentimentColor(s.mood.sentiment),
                        flex: "0 0 auto",
                      }}
                    />
                    <span style={{ width: 150, fontSize: 13 }}>{id}</span>
                    <span style={{ fontSize: 12, color: "#8a93a6" }}>
                      {s.publicFace}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={card}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>Cascade timeline</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {cascade.ticks.map((t, i) => (
                <div key={i}>
                  <div style={{ fontSize: 12, color: "#5bd1a0" }}>
                    t={t.clock} &middot; {t.activeNodeIds.join(", ")}
                  </div>
                  {t.events.map((e) => (
                    <div key={e.id} style={{ fontSize: 12, color: "#c2c8d6" }}>
                      <span style={{ color: "#5b6b8a" }}>[{e.type}]</span>{" "}
                      {e.source} → {e.target}: {e.content}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>

        <section style={{ ...card, marginTop: 16 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>
            Monte Carlo — {mc.runs.length} runs, {mc.clusters.length} clusters
          </h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {mc.clusters.map((c) => (
              <div
                key={c.id}
                style={{
                  flex: "1 1 240px",
                  border: "1px solid #232838",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 600 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: "#8a93a6", marginTop: 4 }}>
                  {c.memberRunIds.length} futures
                </div>
                <div style={{ fontSize: 12, color: "#c2c8d6", marginTop: 6 }}>
                  {c.summary}
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginBottom: 0, marginTop: 14 }}>
            <strong>Pivotal variable:</strong> {mc.pivotal.description}{" "}
            <span style={{ color: "#5b6b8a" }}>
              ({Math.round(mc.pivotal.explainedVariance * 100)}% of variance)
            </span>
          </p>
        </section>
      </div>
    </main>
  );
}
