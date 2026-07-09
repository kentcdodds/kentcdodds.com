export type PageCachePrewarmResult = {
  url: string;
  ok: boolean;
  attempts: number;
  status?: number;
  edgeCache?: string;
  error?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function sleep(durationMs: number) {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function requestPage({
  url,
  fetchImpl,
  timeoutMs,
}: {
  url: string;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "text/html",
        "user-agent": "kcd-content-refresh-prewarm",
      },
      redirect: "manual",
      signal: controller.signal,
    });
    await response.arrayBuffer();
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function prewarmPageCache({
  baseUrl,
  paths,
  fetchImpl = fetch,
  log = console,
  maxAttempts = 6,
  pollDelayMs = 1_000,
  timeoutMs = 15_000,
  sleepImpl = sleep,
}: {
  baseUrl: string;
  paths: ReadonlyArray<string>;
  fetchImpl?: typeof fetch;
  log?: Pick<typeof console, "log" | "warn">;
  maxAttempts?: number;
  pollDelayMs?: number;
  timeoutMs?: number;
  sleepImpl?: (durationMs: number) => Promise<unknown>;
}) {
  const results: Array<PageCachePrewarmResult> = [];

  for (const path of paths) {
    const url = new URL(path, baseUrl).toString();
    let result: PageCachePrewarmResult = {
      url,
      ok: false,
      attempts: 0,
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await requestPage({ url, fetchImpl, timeoutMs });
        const edgeCache = response.headers.get("X-Edge-Cache") ?? undefined;
        result = {
          url,
          ok:
            response.status === 200 &&
            (edgeCache === "HIT" || edgeCache === "STALE"),
          attempts: attempt,
          status: response.status,
          edgeCache,
        };

        if (result.ok) break;
        if (
          response.status < 500 &&
          response.status !== 429 &&
          edgeCache !== "MISS"
        ) {
          result.error = `Page is not cacheable (status ${response.status}, X-Edge-Cache ${edgeCache ?? "missing"})`;
          break;
        }
      } catch (error) {
        result = {
          url,
          ok: false,
          attempts: attempt,
          error: getErrorMessage(error),
        };
      }

      if (attempt < maxAttempts) await sleepImpl(pollDelayMs);
    }

    if (result.ok) {
      log.log("Page cache prewarmed.", {
        url: result.url,
        attempts: result.attempts,
        edgeCache: result.edgeCache,
      });
    } else {
      log.warn("Page cache prewarm failed.", result);
    }
    results.push(result);
  }

  return {
    attempted: results.length,
    warmed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}
