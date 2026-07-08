// try to keep this dep-free so we don't have to install deps
import { execSync } from "child_process";
import https from "https";

let warnedTimoutTime = false;

export function fetchJson(url, { timeoutTime, timoutTime } = {}) {
  if (
    typeof timeoutTime === "undefined" &&
    typeof timoutTime !== "undefined" &&
    !warnedTimoutTime
  ) {
    warnedTimoutTime = true;
    console.warn(
      "[fetchJson] `timoutTime` is deprecated; use `timeoutTime` instead.",
    );
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function settle(callback) {
      if (settled) return;
      settled = true;
      clearTimer();
      callback();
    }

    const request = https
      .get(url, (res) => {
        let data = "";
        res.on("data", (d) => {
          data += d;
        });

        res.on("end", () => {
          const statusCode = res.statusCode ?? 0;
          if (statusCode < 200 || statusCode >= 300) {
            settle(() =>
              reject(
                new Error(
                  `Request to ${url} failed with status ${statusCode}: ${data.slice(0, 200)}`,
                ),
              ),
            );
            return;
          }

          if (!data) {
            settle(() => resolve(null));
            return;
          }

          try {
            const parsed = JSON.parse(data);
            settle(() => resolve(parsed));
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            settle(() =>
              reject(
                new Error(
                  `Request to ${url} returned non-JSON body: ${message}`,
                ),
              ),
            );
          }
        });
      })
      .on("error", (e) => {
        settle(() => reject(e));
      });
    const effectiveTimeoutTime = timeoutTime ?? timoutTime;
    if (effectiveTimeoutTime) {
      timer = setTimeout(() => {
        request.destroy(new Error("Request timed out"));
      }, effectiveTimeoutTime);
    }
  });
}

const changeTypes = {
  M: "modified",
  A: "added",
  D: "deleted",
  R: "moved",
};

export async function getChangedFiles(currentCommitSha, compareCommitSha) {
  try {
    const lineParser = /^(?<change>\w).*?\s+(?<filename>.+$)/;
    const gitOutput = execSync(
      `git diff --name-status ${currentCommitSha} ${compareCommitSha}`,
    ).toString();
    const changedFiles = gitOutput
      .split("\n")
      .map((line) => line.match(lineParser)?.groups)
      .filter(Boolean);
    const changes = [];
    for (const { change, filename } of changedFiles) {
      const changeType = changeTypes[change];
      if (changeType) {
        changes.push({ changeType: changeTypes[change], filename });
      } else {
        console.error(`Unknown change type: ${change} ${filename}`);
      }
    }
    return changes;
  } catch (error) {
    console.error(`Something went wrong trying to get changed files.`, error);
    return null;
  }
}
