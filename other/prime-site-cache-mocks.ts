#!/usr/bin/env node
import "dotenv/config";
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const siteDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../services/site",
);

const port = Number(process.env.PORT ?? 4001);
const healthUrl = `http://127.0.0.1:${port}/healthcheck`;
const blogUrl = `http://127.0.0.1:${port}/blog`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForOk(url: string, timeoutMs: number) {
  const start = Date.now();
  let lastError: unknown = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5_000),
      });
      const text = await res.text();
      if (res.ok) return text;
      lastError = new Error(`${url} returned ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

async function warmBlogPage() {
  // Use curl so large mock response headers do not trip undici limits.
  // Curl may exit non-zero if RR 7.16 closes the stream early; trust stdout.
  try {
    const { stdout } = await execFileAsync("curl", [
      "--silent",
      "--max-time",
      "120",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      blogUrl,
    ]);
    const status = stdout.toString().trim();
    if (!status.startsWith("2")) {
      throw new Error(`${blogUrl} returned ${status}`);
    }
  } catch (error) {
    const stdout =
      error &&
      typeof error === "object" &&
      "stdout" in error &&
      error.stdout != null
        ? error.stdout.toString().trim()
        : "";
    if (stdout.startsWith("2")) return;
    throw error;
  }
}

function killServerTree(server: ReturnType<typeof spawn>) {
  if (!server.pid) return;
  try {
    process.kill(-server.pid, "SIGINT");
  } catch {
    try {
      server.kill("SIGINT");
    } catch {
      // ignore
    }
  }
}

async function main() {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    MOCKS: "true",
    PORT: String(port),
  };

  const server = spawn(process.execPath, ["./index.ts"], {
    cwd: siteDir,
    stdio: "inherit",
    env,
    detached: true,
  });

  let serverExit: {
    code: number | null;
    signal: NodeJS.Signals | null;
  } | null = null;
  server.once("exit", (code, signal) => {
    serverExit = { code, signal };
  });

  let cacheWarmed = false;
  try {
    await waitForOk(healthUrl, 120_000);
    await warmBlogPage();
    cacheWarmed = true;
    // Let in-flight single-fetch streams settle before shutdown (RR 7.16).
    await sleep(500);
  } finally {
    killServerTree(server);
    for (let i = 0; i < 40; i++) {
      if (serverExit) break;
      await sleep(250);
    }
    if (!serverExit) {
      try {
        process.kill(-server.pid!, "SIGKILL");
      } catch {
        server.kill("SIGKILL");
      }
    }
  }

  if (
    !cacheWarmed ||
    (serverExit && serverExit.code !== 0 && serverExit.code !== null)
  ) {
    if (!cacheWarmed) {
      throw new Error("Failed to warm site cache");
    }
    // RR 7.16 can exit non-zero after client disconnect during stream teardown.
    if (serverExit) {
      console.warn(
        `Server exited with code ${serverExit.code} after cache was warmed (signal ${serverExit.signal ?? "null"})`,
      );
    }
  }
}

main()
  .then(() => {
    console.log("cache primed ⚡️");
  })
  .catch((error) => {
    console.error("❌ prime-cache:mocks failed", error);
    process.exit(1);
  });
