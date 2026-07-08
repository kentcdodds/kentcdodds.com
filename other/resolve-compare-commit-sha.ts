import { fetchJson } from "./get-changed-files.js";

const defaultFetchTimeoutMs = 10_000;

/**
 * Resolve the commit SHA currently reflected by the live site so content-only
 * refreshes can diff against it.
 *
 * Prefer the last successful refresh SHA; fall back to the worker's deploy
 * BUILD_SHA from `/__meta` (replaces the pre-migration `/build/info.json`).
 */
export async function resolveCompareCommitSha({
  baseUrl,
  fetchJsonImpl = fetchJson,
  timeoutTime = defaultFetchTimeoutMs,
}: {
  baseUrl: string;
  fetchJsonImpl?: typeof fetchJson;
  timeoutTime?: number;
}): Promise<string | null> {
  if (!baseUrl) {
    throw new Error("baseUrl is required");
  }

  const shaInfo = await fetchJsonImpl(`${baseUrl}/refresh-commit-sha.json`, {
    timeoutTime,
  });
  if (typeof shaInfo?.sha === "string") {
    return shaInfo.sha;
  }

  const meta = await fetchJsonImpl(`${baseUrl}/__meta`, {
    timeoutTime,
  });
  const buildSha = meta?.buildSha;
  if (
    typeof buildSha === "string" &&
    buildSha.length > 0 &&
    buildSha !== "local-dev"
  ) {
    return buildSha;
  }

  return null;
}
