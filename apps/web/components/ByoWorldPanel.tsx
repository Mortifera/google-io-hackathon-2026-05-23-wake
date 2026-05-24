"use client";

/**
 * Bring-Your-Own-World panel.
 *
 * Lets the operator upload a world.json (e.g. downloaded from /genesis),
 * validates it with WorldSchema, lets them pick a seed, then runs a live
 * cascade via POST /api/stream-cascade — rendering it through the existing
 * graph + cascade machinery.
 *
 * Props the caller needs to supply:
 *  - onWorldLoaded  — called once the world is parsed; caller should swap
 *                     the Stage world prop and reset graph layout.
 *  - onStartStream  — called with the BYO world + chosen seed; caller
 *                     opens the stream (the same handlers as openCascadeStream).
 *  - onClose        — dismiss the panel.
 *  - liveStatus     — current stream status from Stage.
 */

import { useCallback, useRef, useState } from "react";
import { WorldSchema } from "@wake/contracts";
import type { World } from "@wake/contracts";
import s from "./stage.module.css";

interface Props {
  onWorldLoaded: (world: World) => void;
  onStartStream: (world: World, seed: string) => void;
  onClose: () => void;
  liveStatus: "idle" | "connecting" | "streaming" | "done" | "error";
}

type UploadState = "idle" | "invalid" | "ready";

export default function ByoWorldPanel({
  onWorldLoaded,
  onStartStream,
  onClose,
  liveStatus,
}: Props) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [validationError, setValidationError] = useState("");
  const [world, setWorld] = useState<World | null>(null);
  const [selectedSeed, setSelectedSeed] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        setUploadState("invalid");
        setValidationError("File is not valid JSON.");
        return;
      }
      const result = WorldSchema.safeParse(raw);
      if (!result.success) {
        setUploadState("invalid");
        const issues = result.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        setValidationError(`WorldSchema validation failed — ${issues}`);
        return;
      }
      const parsed = result.data;
      setWorld(parsed);
      setSelectedSeed(parsed.seeds[0]?.id ?? "");
      setUploadState("ready");
      setValidationError("");
      onWorldLoaded(parsed);
    };
    reader.readAsText(file);
  }, [onWorldLoaded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRun = () => {
    if (!world || !selectedSeed) return;
    onStartStream(world, selectedSeed);
  };

  const busy = liveStatus === "connecting" || liveStatus === "streaming";

  return (
    <>
      <div className={s.scrim} onClick={onClose} />
      <aside className={s.console} role="dialog" aria-label="Upload a world">
        <div className={s.consoleHead}>
          <div className={s.consoleTitle}>
            Upload a world <span className={s.kbd}>BYO</span>
          </div>
          <button className={s.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={s.consoleScroll}>
          <div className={s.opSection}>Drop a world.json from /genesis</div>

          {/* Drop zone */}
          <div
            className={s.byoDropZone}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            data-state={uploadState}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: "none" }}
              onChange={handleInputChange}
            />
            {uploadState === "ready" && world ? (
              <div className={s.byoReady}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--accent)" }}>
                  <path d="M10.28 2.28 4.5 8.06 1.72 5.28a1 1 0 0 0-1.44 1.44l3.5 3.5a1 1 0 0 0 1.44 0l6.5-6.5a1 1 0 0 0-1.44-1.44Z" />
                </svg>
                <span>
                  <strong>{world.id}</strong>{" "}
                  <span style={{ color: "var(--text-faint)" }}>
                    · {world.nodes.length} nodes · {world.edges.length} edges
                  </span>
                </span>
              </div>
            ) : uploadState === "invalid" ? (
              <div className={s.byoError}>{validationError}</div>
            ) : (
              <div className={s.byoHint}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.4 }}>
                  <path d="M12 2a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 0 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L11 11.586V3a1 1 0 0 1 1-1ZM5 19a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H5Z" />
                </svg>
                <span>Drop world.json or click to browse</span>
              </div>
            )}
          </div>

          {/* Seed picker */}
          {uploadState === "ready" && world && world.seeds.length > 0 && (
            <>
              <div className={`${s.opSection} ${s.spaced}`}>Choose a seed action</div>
              {world.seeds.map((seed) => (
                <button
                  key={seed.id}
                  className={s.action}
                  data-active={seed.id === selectedSeed}
                  data-live={true}
                  onClick={() => setSelectedSeed(seed.id)}
                  title={seed.payload}
                >
                  <span className={s.actionLabel}>{seed.label}</span>
                  <span className={s.actionPayload} style={{ display: "block", marginTop: 2 }}>
                    {seed.payload.length > 80 ? seed.payload.slice(0, 77) + "…" : seed.payload}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Run button */}
          {uploadState === "ready" && (
            <>
              <div className={`${s.opSection} ${s.spaced}`}>Run</div>
              <button
                className={`${s.opAction} ${s.primary}`}
                style={{ width: "100%" }}
                onClick={handleRun}
                disabled={!selectedSeed || busy}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {busy ? "Running…" : "Run live cascade →"}
              </button>
              {liveStatus === "connecting" || liveStatus === "streaming" ? (
                <div className={s.liveLine} data-status={liveStatus}>
                  <span className={s.liveDot} />
                  {liveStatus === "connecting" ? "opening stream…" : "streaming the simulation tick-by-tick"}
                </div>
              ) : null}
            </>
          )}

          {/* Tip */}
          <div className={s.opTip}>
            Generate a world on{" "}
            <a href="/genesis" style={{ color: "var(--accent)" }}>
              /genesis
            </a>{" "}
            and click{" "}
            <strong>Download world.json</strong>, then upload it here to run a live cascade on your own world. Any valid <code>World</code> JSON that satisfies the Wake schema works.
          </div>
        </div>
      </aside>
    </>
  );
}
