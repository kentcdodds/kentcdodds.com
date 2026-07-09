import { expect, test } from "vitest";
import { getContentPrewarmUrls } from "../content-prewarm-urls.ts";

const blogSharedUrls = [
  "/",
  "/blog",
  "/blog.json",
  "/blog/rss.xml",
  "/sitemap.xml",
];

test("maps flat and nested blog content to the public post URL", () => {
  expect(
    getContentPrewarmUrls([
      {
        changeType: "modified",
        filename: "services/site/content/blog/flat-post.mdx",
      },
      {
        changeType: "modified",
        filename: "services/site/content/blog/nested-post/example.tsx",
      },
    ]),
  ).toEqual([...blogSharedUrls, "/blog/flat-post", "/blog/nested-post"].sort());
});

test("maps pages and known data files to public URLs", () => {
  expect(
    getContentPrewarmUrls([
      {
        changeType: "modified",
        filename: "services/site/content/pages/uses.md",
      },
      {
        changeType: "modified",
        filename: "services/site/content/data/resume.yml",
      },
    ]),
  ).toEqual(["/resume", "/sitemap.xml", "/uses"]);
});

test("does not request deleted document URLs", () => {
  expect(
    getContentPrewarmUrls([
      {
        changeType: "deleted",
        filename: "services/site/content/blog/retired-post.mdx",
      },
      {
        changeType: "deleted",
        filename: "services/site/content/pages/retired-page.mdx",
      },
    ]),
  ).toEqual(blogSharedUrls);
});

test("warms the new URL and shared URLs from both sides of a move", () => {
  expect(
    getContentPrewarmUrls([
      {
        changeType: "moved",
        filename: "services/site/content/pages/renamed.mdx",
        previousFilename: "services/site/content/blog/original.mdx",
      },
    ]),
  ).toEqual([...blogSharedUrls, "/renamed"].sort());
});

test("ignores content without a corresponding public route", () => {
  expect(
    getContentPrewarmUrls([
      {
        changeType: "modified",
        filename: "services/site/content/blog/README.md",
      },
      {
        changeType: "modified",
        filename: "services/site/content/writing-blog/draft.mdx",
      },
      {
        changeType: "modified",
        filename: "services/site/content/blog/banner.png",
      },
    ]),
  ).toEqual(blogSharedUrls);
});
