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

/**
 * Like {@link mapWithConcurrency}, but **yields each result the moment it
 * completes** (bounded by `limit`), as `{ item, result, index }`. Use when you
 * want to react to results as they arrive — e.g. streaming each node's decision
 * to the UI the instant its LLM call returns, instead of waiting for the batch.
 * Yields in completion order; `index` is the original input position.
 */
export async function* mapStream<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): AsyncGenerator<{ item: T; result: R; index: number }> {
  if (limit <= 0) throw new Error("limit must be > 0");
  const executing = new Map<
    number,
    Promise<{ index: number; item: T; result: R }>
  >();
  let next = 0;
  const start = (): void => {
    if (next >= items.length) return;
    const i = next++;
    const item = items[i] as T;
    executing.set(
      i,
      fn(item, i).then((result) => ({ index: i, item, result })),
    );
  };
  for (let k = 0; k < Math.min(limit, items.length); k++) start();
  while (executing.size > 0) {
    const done = await Promise.race(executing.values());
    executing.delete(done.index);
    yield done;
    start();
  }
}
