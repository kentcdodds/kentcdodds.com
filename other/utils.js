const defaultTimeoutMs = 30_000;

function getSiteHostname() {
  if (process.env.WORKER_URL) {
    return new URL(process.env.WORKER_URL).hostname;
  }
  if (process.env.SITE_URL) {
    return new URL(process.env.SITE_URL).hostname;
  }
  return "kentcdodds-com.kentcdodds.workers.dev";
}

function withStatusMessage(statusCode, body) {
  const message =
    typeof body === "string" && body.trim()
      ? body.trim()
      : "<empty response body>";
  return new Error(
    `refresh-cache request failed with status ${statusCode}: ${message}`,
  );
}

// try to keep this dep-free so we don't have to install deps
export async function postRefreshCache({
  http,
  postData,
  options: {
    headers: headersOverrides,
    timeout: timeoutOverride,
    ...optionsOverrides
  } = {},
}) {
  if (!http) {
    http = await import("https");
  }
  return new Promise((resolve, reject) => {
    try {
      const postDataString = JSON.stringify(postData);
      const options = {
        hostname: getSiteHostname(),
        port: 443,
        path: `/action/refresh-cache`,
        method: "POST",
        headers: {
          auth: process.env.REFRESH_CACHE_SECRET,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postDataString),
          ...headersOverrides,
        },
        ...optionsOverrides,
      };

      const req = http
        .request(options, (res) => {
          let data = "";
          res.on("data", (d) => {
            data += d;
          });

          res.on("end", () => {
            const statusCode = Number(res.statusCode ?? 500);
            const isOk = statusCode >= 200 && statusCode < 300;
            try {
              const parsed = JSON.parse(data);
              if (!isOk) {
                reject(
                  new Error(
                    `refresh-cache request failed with status ${statusCode}: ${JSON.stringify(parsed)}`,
                  ),
                );
                return;
              }
              const pageCacheGeneration =
                res.headers["x-page-cache-generation"];
              const contentVersion = res.headers["x-content-version"];
              resolve({
                ...parsed,
                ...(typeof pageCacheGeneration === "string"
                  ? { pageCacheGeneration }
                  : {}),
                ...(typeof contentVersion === "string"
                  ? { contentVersion }
                  : {}),
              });
            } catch {
              if (!isOk) {
                reject(withStatusMessage(statusCode, data));
                return;
              }
              reject(
                new Error(
                  `refresh-cache request returned non-JSON success response: ${data}`,
                ),
              );
            }
          });
        })
        .on("error", reject);
      const timeoutMs =
        typeof timeoutOverride === "number"
          ? timeoutOverride
          : defaultTimeoutMs;
      req.setTimeout(timeoutMs, () => {
        req.destroy(
          new Error(`refresh-cache request timed out after ${timeoutMs}ms`),
        );
      });
      req.write(postDataString);
      req.end();
    } catch (error) {
      reject(error);
    }
  });
}
