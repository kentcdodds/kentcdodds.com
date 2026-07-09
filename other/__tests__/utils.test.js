import { EventEmitter } from "node:events";
import { expect, test } from "vitest";
import { postRefreshCache } from "../utils.js";

test("returns cache generation and content version response headers", async () => {
  const response = Object.assign(new EventEmitter(), {
    statusCode: 200,
    headers: {
      "x-page-cache-generation": "generation-2",
      "x-content-version": "content-v2",
    },
  });
  let handleResponse;
  const request = {
    on() {
      return request;
    },
    setTimeout() {},
    write() {},
    end() {
      queueMicrotask(() => {
        handleResponse(response);
        response.emit("data", '{"message":"refreshed"}');
        response.emit("end");
      });
    },
  };
  const http = {
    request(_options, callback) {
      handleResponse = callback;
      return request;
    },
  };

  await expect(
    postRefreshCache({
      http,
      postData: { commitSha: "current-sha" },
      options: { hostname: "example.test" },
    }),
  ).resolves.toEqual({
    message: "refreshed",
    pageCacheGeneration: "generation-2",
    contentVersion: "content-v2",
  });
});
