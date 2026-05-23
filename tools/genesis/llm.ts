/**
 * Genesis LLM layer — two Gemini capabilities the pipeline needs:
 *   - ground(prompt):  a Google-Search-grounded research call (real cast facts).
 *   - json(args):      a structured-output call (responseSchema -> typed JSON).
 *
 * Direct REST (no SDK dep) mirroring worlds/notion/gen-dossiers.ts, so this folder
 * stays self-contained and importable by relative path like worlds/. Both paths
 * retry with backoff on 429/5xx AND network blips, and accumulate token usage so
 * the CLI can report real cost. The interface is injectable so genesis.test.ts
 * runs the whole pipeline offline with a fake.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

/** Minimal .env reader (the key is never logged). */
export function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(path.join(repoRoot, ".env"), "utf8");
    const out: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[1] && m[2] !== undefined) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

export interface GenesisUsage {
  calls: number;
  inTokens: number;
  outTokens: number;
}

export interface GroundResult {
  text: string;
  /** Search queries Gemini issued (from groundingMetadata), for the UI/log. */
  queries: string[];
}

export interface JsonArgs {
  system?: string;
  user: string;
  /** Gemini responseSchema (OpenAPI-subset: type "OBJECT"/"ARRAY"/"STRING"...). */
  schema: unknown;
  temperature?: number;
}

/** The capability surface the pipeline depends on (real or faked in tests). */
export interface GenesisLLM {
  readonly usage: GenesisUsage;
  ground(prompt: string): Promise<GroundResult>;
  json<T>(args: JsonArgs): Promise<T>;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const NETWORK_RE =
  /fetch failed|socket hang up|econnreset|etimedout|econnrefused|eai_again|enotfound|und_err_/i;
function isTransient(status: number | undefined, err: unknown): boolean {
  if (status === 429 || (status !== undefined && status >= 500)) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const code = (err as { cause?: { code?: string } })?.cause?.code ?? "";
  return NETWORK_RE.test(msg) || NETWORK_RE.test(code);
}

/** Real Gemini client over the v1beta REST endpoint. */
export class RestGeminiLLM implements GenesisLLM {
  readonly usage: GenesisUsage = { calls: 0, inTokens: 0, outTokens: 0 };
  private readonly model: string;
  private readonly endpoint: (m: string) => string;

  constructor(apiKey: string, model = "gemini-3.5-flash") {
    this.model = model;
    this.endpoint = (m) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
  }

  private async call(body: unknown, attempt = 1): Promise<any> {
    let res: Response;
    try {
      res = await fetch(this.endpoint(this.model), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      // Network-layer failure (ECONNRESET, fetch failed, ...).
      if (attempt <= 5 && isTransient(undefined, err)) {
        await sleep(500 * 2 ** (attempt - 1));
        return this.call(body, attempt + 1);
      }
      throw err;
    }
    if (!res.ok) {
      if (attempt <= 5 && isTransient(res.status, undefined)) {
        await sleep(500 * 2 ** (attempt - 1));
        return this.call(body, attempt + 1);
      }
      throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as any;
    this.usage.calls++;
    this.usage.inTokens += data?.usageMetadata?.promptTokenCount ?? 0;
    this.usage.outTokens += data?.usageMetadata?.candidatesTokenCount ?? 0;
    return data;
  }

  async ground(prompt: string): Promise<GroundResult> {
    const data = await this.call({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.4 },
    });
    const cand = data?.candidates?.[0];
    const text: string =
      cand?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    const queries: string[] = cand?.groundingMetadata?.webSearchQueries ?? [];
    return { text: text.trim(), queries };
  }

  async json<T>(args: JsonArgs): Promise<T> {
    const data = await this.call({
      ...(args.system ? { systemInstruction: { parts: [{ text: args.system }] } } : {}),
      contents: [{ role: "user", parts: [{ text: args.user }] }],
      generationConfig: {
        temperature: args.temperature ?? 0.7,
        responseMimeType: "application/json",
        responseSchema: args.schema,
      },
    });
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return JSON.parse(stripFence(text)) as T;
  }
}

function stripFence(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return m?.[1] ?? t;
}

/** Rough Flash cost from accumulated tokens (input ~$0.30/M, output ~$2.50/M). */
export function estimateCost(u: GenesisUsage): number {
  return (u.inTokens / 1e6) * 0.3 + (u.outTokens / 1e6) * 2.5;
}
