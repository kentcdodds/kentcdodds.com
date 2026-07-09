export type PageCachePrewarmResult = {
  url: string;
  ok: boolean;
  attempts: number;
  status?: number;
  edgeCache?: string;
  generation?: string;
  contentVersion?: string;
  stored?: boolean;
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
  expectedGeneration,
  expectedContentVersion,
  timeoutMs,
}: {
  url: string;
  fetchImpl: typeof fetch;
  expectedGeneration?: string;
  expectedContentVersion?: string;
  timeoutMs: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: {
        accept: "text/html",
        "user-agent": "kcd-content-refresh-prewarm",
        ...(expectedGeneration
          ? { "x-page-cache-prewarm": expectedGeneration }
          : {}),
        ...(expectedContentVersion
          ? {
              "x-page-cache-prewarm-content-version": expectedContentVersion,
            }
          : {}),
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
  expectedGeneration,
  expectedContentVersion,
  fetchImpl = fetch,
  log = console,
  maxAttempts = 75,
  pollDelayMs = 1_000,
  timeoutMs = 15_000,
  sleepImpl = sleep,
}: {
  baseUrl: string;
  paths: ReadonlyArray<string>;
  expectedGeneration?: string;
  expectedContentVersion?: string;
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
        const response = await requestPage({
          url,
          fetchImpl,
          expectedGeneration,
          expectedContentVersion,
          timeoutMs,
        });
        const edgeCache = response.headers.get("X-Edge-Cache") ?? undefined;
        const generation =
          response.headers.get("X-Page-Cache-Generation") ?? undefined;
        const contentVersion =
          response.headers.get("X-Content-Version") ?? undefined;
        const storedHeader = response.headers.get("X-Page-Cache-Stored");
        const stored =
          storedHeader === null ? undefined : storedHeader === "true";
        const generationMatches =
          !expectedGeneration || generation === expectedGeneration;
        const contentVersionMatches =
          !expectedContentVersion || contentVersion === expectedContentVersion;
        result = {
          url,
          ok:
            response.status === 200 &&
            generationMatches &&
            contentVersionMatches &&
            (edgeCache === "HIT" || edgeCache === "STALE" || stored === true),
          attempts: attempt,
          status: response.status,
          edgeCache,
          ...(generation ? { generation } : {}),
          ...(contentVersion ? { contentVersion } : {}),
          ...(stored !== undefined ? { stored } : {}),
        };

        if (result.ok) break;
        const waitingForGeneration =
          Boolean(expectedGeneration) && !generationMatches;
        const waitingForContentVersion =
          Boolean(expectedContentVersion) && !contentVersionMatches;
        if (
          generationMatches &&
          contentVersionMatches &&
          edgeCache === "MISS" &&
          stored === false
        ) {
          result.error = "Worker rendered the page but could not store it";
          break;
        }
        if (
          !waitingForGeneration &&
          !waitingForContentVersion &&
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
        generation: result.generation,
        contentVersion: result.contentVersion,
        stored: result.stored,
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
