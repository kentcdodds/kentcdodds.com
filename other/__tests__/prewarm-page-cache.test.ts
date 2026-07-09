import { expect, test, vi } from "vitest";
import { prewarmPageCache } from "../prewarm-page-cache.ts";

function createLogger() {
  return { log: vi.fn(), warn: vi.fn() };
}

test("polls a cache miss until the asynchronous fill becomes a hit", async () => {
  const fetchImpl = vi
    .fn()
    .mockResolvedValueOnce(
      new Response("rendered", {
        status: 200,
        headers: { "X-Edge-Cache": "MISS" },
      }),
    )
    .mockResolvedValueOnce(
      new Response("cached", {
        status: 200,
        headers: { "X-Edge-Cache": "HIT" },
      }),
    );
  const sleepImpl = vi.fn(async () => undefined);
  const log = createLogger();

  const result = await prewarmPageCache({
    baseUrl: "https://example.com",
    paths: ["/blog/example"],
    fetchImpl,
    log,
    sleepImpl,
  });

  expect(result).toEqual({
    attempted: 1,
    warmed: 1,
    failed: 0,
    results: [
      {
        url: "https://example.com/blog/example",
        ok: true,
        attempts: 2,
        status: 200,
        edgeCache: "HIT",
      },
    ],
  });
  expect(fetchImpl).toHaveBeenCalledWith(
    "https://example.com/blog/example",
    expect.objectContaining({
      headers: {
        accept: "text/html",
        "user-agent": "kcd-content-refresh-prewarm",
      },
      redirect: "manual",
    }),
  );
  expect(sleepImpl).toHaveBeenCalledOnce();
  expect(log.log).toHaveBeenCalledOnce();
  expect(log.warn).not.toHaveBeenCalled();
});

test("reports a cache bypass without retrying", async () => {
  const fetchImpl = vi.fn(async () => {
    return new Response("private", {
      status: 200,
      headers: { "X-Edge-Cache": "BYPASS" },
    });
  });
  const sleepImpl = vi.fn(async () => undefined);
  const log = createLogger();

  const result = await prewarmPageCache({
    baseUrl: "https://example.com",
    paths: ["/private"],
    fetchImpl,
    log,
    sleepImpl,
  });

  expect(result.failed).toBe(1);
  expect(result.results[0]).toMatchObject({
    ok: false,
    attempts: 1,
    status: 200,
    edgeCache: "BYPASS",
    error: "Page is not cacheable (status 200, X-Edge-Cache BYPASS)",
  });
  expect(fetchImpl).toHaveBeenCalledOnce();
  expect(sleepImpl).not.toHaveBeenCalled();
  expect(log.warn).toHaveBeenCalledOnce();
});

test("waits for the refreshed generation and accepts a confirmed synchronous fill", async () => {
  const fetchImpl = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(null, {
        status: 409,
        headers: {
          "X-Edge-Cache": "BYPASS",
          "X-Page-Cache-Generation": "old-generation",
        },
      }),
    )
    .mockResolvedValueOnce(
      new Response("rendered", {
        status: 200,
        headers: {
          "X-Edge-Cache": "MISS",
          "X-Page-Cache-Generation": "new-generation",
          "X-Page-Cache-Stored": "true",
        },
      }),
    );
  const sleepImpl = vi.fn(async () => undefined);

  const result = await prewarmPageCache({
    baseUrl: "https://example.com",
    paths: ["/blog/example"],
    expectedGeneration: "new-generation",
    fetchImpl,
    log: createLogger(),
    maxAttempts: 2,
    sleepImpl,
  });

  expect(result.results[0]).toEqual({
    url: "https://example.com/blog/example",
    ok: true,
    attempts: 2,
    status: 200,
    edgeCache: "MISS",
    generation: "new-generation",
    stored: true,
  });
  expect(fetchImpl).toHaveBeenLastCalledWith(
    "https://example.com/blog/example",
    expect.objectContaining({
      headers: expect.objectContaining({
        "x-page-cache-prewarm": "new-generation",
      }),
    }),
  );
  expect(sleepImpl).toHaveBeenCalledOnce();
});

test("retries transient failures and reports an exhausted prewarm", async () => {
  const fetchImpl = vi
    .fn()
    .mockRejectedValueOnce(new Error("network unavailable"))
    .mockResolvedValueOnce(
      new Response("unavailable", {
        status: 503,
        headers: { "X-Edge-Cache": "MISS" },
      }),
    );
  const log = createLogger();

  const result = await prewarmPageCache({
    baseUrl: "https://example.com",
    paths: ["/blog/example"],
    fetchImpl,
    log,
    maxAttempts: 2,
    sleepImpl: async () => undefined,
  });

  expect(result.failed).toBe(1);
  expect(result.results[0]).toMatchObject({
    ok: false,
    attempts: 2,
    status: 503,
    edgeCache: "MISS",
  });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(log.warn).toHaveBeenCalledOnce();
});
