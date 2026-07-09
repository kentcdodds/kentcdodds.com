import { expect, test } from "vitest";
import { parseChangedFiles } from "../get-changed-files.js";

test("parses added, modified, deleted, and renamed git paths", () => {
  expect(
    parseChangedFiles(
      [
        "A\tservices/site/content/blog/added.mdx",
        "M\tservices/site/content/blog/modified.mdx",
        "D\tservices/site/content/blog/deleted.mdx",
        "R100\tservices/site/content/blog/old.mdx\tservices/site/content/blog/new.mdx",
      ].join("\n"),
    ),
  ).toEqual([
    {
      changeType: "added",
      filename: "services/site/content/blog/added.mdx",
    },
    {
      changeType: "modified",
      filename: "services/site/content/blog/modified.mdx",
    },
    {
      changeType: "deleted",
      filename: "services/site/content/blog/deleted.mdx",
    },
    {
      changeType: "moved",
      filename: "services/site/content/blog/new.mdx",
      previousFilename: "services/site/content/blog/old.mdx",
    },
  ]);
});
