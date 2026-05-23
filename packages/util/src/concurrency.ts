/**
 * Map over items with a bounded number of in-flight async tasks. This is the
 * core primitive for parallelism in Wake: a tick fans out one LLM call per
 * active node, and we run as many as the rate limit allows at once.
 *
 * Results are returned in input order. The first rejection rejects the whole
 * call (use a try/catch inside `fn` if you want per-item resilience).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (limit <= 0) throw new Error("limit must be > 0");
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i] as T, i);
    }
  };

  const pool = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(pool);
  return results;
}
