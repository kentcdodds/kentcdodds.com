import { describe, expect, test, vi } from "vitest";
import { resolveCompareCommitSha } from "../resolve-compare-commit-sha.ts";

describe("resolveCompareCommitSha", () => {
  test("prefers refresh-commit-sha when present", async () => {
    const fetchJsonImpl = vi.fn(async (url) => {
      if (url.endsWith("/refresh-commit-sha.json")) {
        return { sha: "refresh-sha", date: "2026-01-01T00:00:00.000Z" };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    await expect(
      resolveCompareCommitSha({
        baseUrl: "https://example.test",
        fetchJsonImpl,
      }),
    ).resolves.toBe("refresh-sha");
    expect(fetchJsonImpl).toHaveBeenCalledTimes(1);
  });

  test("falls back to /__meta buildSha", async () => {
    const fetchJsonImpl = vi.fn(async (url) => {
      if (url.endsWith("/refresh-commit-sha.json")) return null;
      if (url.endsWith("/__meta")) {
        return { buildSha: "meta-sha", contentVersion: "v1" };
      }
      return null;
    });

    await expect(
      resolveCompareCommitSha({
        baseUrl: "https://example.test",
        fetchJsonImpl,
      }),
    ).resolves.toBe("meta-sha");
  });

  test("treats empty refresh sha as missing and falls back to /__meta", async () => {
    const fetchJsonImpl = vi.fn(async (url) => {
      if (url.endsWith("/refresh-commit-sha.json")) {
        return { sha: "", date: "2026-01-01T00:00:00.000Z" };
      }
      if (url.endsWith("/__meta")) {
        return { buildSha: "meta-sha", contentVersion: "v1" };
      }
      return null;
    });

    await expect(
      resolveCompareCommitSha({
        baseUrl: "https://example.test",
        fetchJsonImpl,
      }),
    ).resolves.toBe("meta-sha");
    expect(fetchJsonImpl).toHaveBeenCalledTimes(2);
  });

  test("ignores local-dev buildSha", async () => {
    const fetchJsonImpl = vi.fn(async (url) => {
      if (url.endsWith("/refresh-commit-sha.json")) return null;
      if (url.endsWith("/__meta")) {
        return { buildSha: "local-dev", contentVersion: null };
      }
      return null;
    });

    await expect(
      resolveCompareCommitSha({
        baseUrl: "https://example.test",
        fetchJsonImpl,
      }),
    ).resolves.toBeNull();
  });
});
