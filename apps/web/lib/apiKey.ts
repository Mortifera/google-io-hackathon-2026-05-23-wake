/**
 * Bring-your-own Gemini key, held only in the browser (sessionStorage — cleared
 * when the tab closes). The lib reads it at request time and sends it in the
 * POST body of each run; the server uses it per-request and never persists it.
 * This is per-user: it never touches another user or the server's env.
 */
const KEY = "wake-gemini-key";

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setApiKey(value: string): void {
  if (typeof window === "undefined") return;
  try {
    const v = value.trim();
    if (v) sessionStorage.setItem(KEY, v);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore quota/availability */
  }
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}
