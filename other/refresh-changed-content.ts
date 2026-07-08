// try to keep this dep-free so we don't have to install deps
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { publishViaEndpoint as publishViaEndpointImpl } from "../services/site-worker/scripts/publish-artifacts-lib.mjs";
import { getChangedFiles, fetchJson } from "./get-changed-files.js";
import { resolveCompareCommitSha } from "./resolve-compare-commit-sha.ts";
import { postRefreshCache } from "./utils.js";

const defaultBaseUrl =
  process.env.SITE_URL ?? "https://kentcdodds-com.kentcdodds.workers.dev";

const defaultFetchTimeoutMs = 10_000;

const defaultRefreshRetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 2_000,
};

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    const serialized = JSON.stringify(error);
    if (typeof serialized === "string") {
      return serialized;
    }
    return String(error);
  } catch {
    return String(error);
  }
}

const sleep = (durationMs: number) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, durationMs);
    if (typeof timer?.unref === "function") {
      timer.unref();
    }
  });

async function postRefreshCacheWithRetry({
  postRefreshCacheImpl,
  postData,
  hostname,
  log,
  maxAttempts = defaultRefreshRetryOptions.maxAttempts,
  baseDelayMs = defaultRefreshRetryOptions.baseDelayMs,
}: {
  postRefreshCacheImpl: typeof postRefreshCache;
  postData: { commitSha?: string; keys?: Array<string> };
  hostname: string;
  log: Pick<typeof console, "warn">;
  maxAttempts?: number;
  baseDelayMs?: number;
}) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await postRefreshCacheImpl({
        http: undefined,
        postData,
        options: { hostname },
      });
      return { ok: true, attempts: attempt, response };
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      const retryDelayMs = baseDelayMs * attempt;
      log.warn(
        `Refresh cache request failed on attempt ${attempt}/${maxAttempts}. Retrying in ${retryDelayMs}ms.`,
        { error: getErrorMessage(error) },
      );
      await sleep(retryDelayMs);
    }
  }

  return {
    ok: false,
    attempts: maxAttempts,
    error: lastError,
  };
}

function getWorkerUrl() {
  if (process.env.WORKER_URL) return process.env.WORKER_URL.replace(/\/$/, "");
  return defaultBaseUrl.replace(/\/$/, "");
}

function compileMdxArtifacts(bundlePath: string) {
  const result = spawnSync(
    "npm",
    [
      "run",
      "mdx:compile",
      "--workspace",
      "kentcdodds.com",
      "--",
      "--out",
      bundlePath,
    ],
    {
      encoding: "utf8",
      stdio: "inherit",
    },
  );
  if (result.status !== 0) {
    throw new Error("mdx:compile failed");
  }
}

async function publishArtifacts(
  bundlePath: string,
  workerUrl: string,
  publishViaEndpoint = publishViaEndpointImpl,
) {
  const endpointUrl = `${workerUrl}/resources/mdx-artifacts`;
  const { version } = await publishViaEndpoint(bundlePath, endpointUrl);
  return { version };
}

export async function refreshChangedContent({
  currentCommitSha,
  baseUrl = defaultBaseUrl,
  bundlePath = process.env.MDX_BUNDLE_PATH ?? "/tmp/mdx-bundle.json",
  workerUrl = getWorkerUrl(),
  fetchJsonImpl = fetchJson,
  getChangedFilesImpl = getChangedFiles,
  postRefreshCacheImpl = postRefreshCache,
  publishArtifactsImpl = publishArtifacts,
  log = console,
  maxRefreshAttempts = defaultRefreshRetryOptions.maxAttempts,
  retryDelayMs = defaultRefreshRetryOptions.baseDelayMs,
  skipPublish = process.env.SKIP_ARTIFACT_PUBLISH === "true",
}: {
  currentCommitSha?: string;
  baseUrl?: string;
  bundlePath?: string;
  workerUrl?: string;
  fetchJsonImpl?: typeof fetchJson;
  getChangedFilesImpl?: typeof getChangedFiles;
  postRefreshCacheImpl?: typeof postRefreshCache;
  publishArtifactsImpl?: typeof publishArtifacts;
  log?: Pick<typeof console, "log" | "warn" | "error">;
  maxRefreshAttempts?: number;
  retryDelayMs?: number;
  skipPublish?: boolean;
} = {}) {
  if (!currentCommitSha) {
    throw new Error("currentCommitSha is required");
  }

  const compareSha = await resolveCompareCommitSha({
    baseUrl,
    fetchJsonImpl,
    timeoutTime: defaultFetchTimeoutMs,
  });
  if (typeof compareSha !== "string") {
    log.log("🤷‍♂️ No sha to compare to. Unsure what to refresh.");
    return { status: "no-compare-sha" as const };
  }

  const changedFiles =
    (await getChangedFilesImpl(currentCommitSha, compareSha)) ?? [];
  const contentPaths = changedFiles
    .filter((f) => f.filename.startsWith("services/site/content/"))
    .map((f) => f.filename.replace(/^services\/site\/content\//, ""));
  if (!contentPaths.length) {
    log.log("🆗 Not refreshing changed content because no content changed.");
    return { status: "no-content-changes" as const };
  }

  log.log(`⚡️ Content changed. Publishing compiled artifacts.`, {
    currentCommitSha,
    compareSha,
    contentPaths,
    workerUrl,
  });

  if (!skipPublish) {
    compileMdxArtifacts(bundlePath);
    const publishResult = await publishArtifactsImpl(bundlePath, workerUrl);
    log.log(`Published artifact bundle version ${publishResult.version}`);
  }

  // Refresh the same host the artifacts were published to.
  const refreshResult = await postRefreshCacheWithRetry({
    postRefreshCacheImpl,
    postData: {
      commitSha: currentCommitSha,
    },
    hostname: new URL(workerUrl).hostname,
    log,
    maxAttempts: maxRefreshAttempts,
    baseDelayMs: retryDelayMs,
  });

  if (refreshResult.ok) {
    log.log(`Content refresh finished.`, {
      response: refreshResult.response,
      attempts: refreshResult.attempts,
    });
    return {
      status: "refreshed" as const,
      attempts: refreshResult.attempts,
      contentPaths,
    };
  }

  log.warn(
    "⚠️ Content changed but cache refresh failed. Continuing without failing this workflow run.",
    {
      currentCommitSha,
      compareSha,
      contentPaths,
      attempts: refreshResult.attempts,
      error: getErrorMessage(refreshResult.error),
    },
  );
  return {
    status: "refresh-failed" as const,
    attempts: refreshResult.attempts,
    contentPaths,
  };
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const [currentCommitSha] = process.argv.slice(2);
  void refreshChangedContent({ currentCommitSha }).catch((error) => {
    console.error("Unexpected error while refreshing changed content.", {
      error: getErrorMessage(error),
    });
    process.exitCode = 1;
  });
}
