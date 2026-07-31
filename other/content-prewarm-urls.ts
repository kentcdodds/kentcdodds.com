const contentRoot = "services/site/content/";

const blogSharedUrls = [
  "/",
  "/blog",
  "/blog.json",
  "/blog/rss.xml",
  "/sitemap.xml",
] as const;

const dataUrlsByFilename: Record<string, ReadonlyArray<string>> = {
  "credits.yml": ["/credits"],
  "resume.yml": ["/resume"],
  "talks.yml": ["/talks"],
  "testimonials.yml": ["/testimonials"],
};

/** Legacy/unversioned app-cache keys for YAML content data files. */
const dataCacheKeyByFilename: Record<string, string> = {
  "credits.yml": "content:data:credits.yml",
  "resume.yml": "content:data:resume.yml",
  "talks.yml": "content:data:talks.yml",
  "testimonials.yml": "content:data:testimonials.yml",
};

export type ContentChange = {
  changeType: "added" | "deleted" | "modified" | "moved";
  filename: string;
  previousFilename?: string;
};

function getContentPath(filename: string) {
  const normalized = filename.replaceAll("\\", "/");
  if (!normalized.startsWith(contentRoot)) return null;
  return normalized.slice(contentRoot.length);
}

function getDocumentUrl(contentPath: string) {
  const parts = contentPath.split("/");
  const [contentDir, firstEntry] = parts;
  if (!firstEntry) return null;

  if (contentDir === "blog") {
    if (/^readme\.mdx?$/i.test(firstEntry)) return null;
    if (parts.length === 2 && !/\.(mdx|md)$/i.test(firstEntry)) return null;
    const slug = firstEntry.replace(/\.(mdx|md)$/i, "");
    return slug ? `/blog/${slug}` : null;
  }

  if (
    contentDir === "pages" &&
    parts.length === 2 &&
    /\.(mdx|md)$/i.test(firstEntry) &&
    !/^readme\.mdx?$/i.test(firstEntry)
  ) {
    const slug = firstEntry.replace(/\.(mdx|md)$/i, "");
    return slug ? `/${slug}` : null;
  }

  return null;
}

function addSharedUrls(urls: Set<string>, contentPath: string) {
  if (contentPath.startsWith("blog/")) {
    for (const url of blogSharedUrls) urls.add(url);
    return;
  }

  if (contentPath.startsWith("pages/")) {
    urls.add("/sitemap.xml");
    return;
  }

  if (contentPath.startsWith("data/")) {
    urls.add("/sitemap.xml");
    const filename = contentPath.slice("data/".length);
    for (const url of dataUrlsByFilename[filename] ?? []) urls.add(url);
  }
}

export function getContentPrewarmUrls(changes: ReadonlyArray<ContentChange>) {
  const urls = new Set<string>();

  for (const change of changes) {
    const contentPath = getContentPath(change.filename);
    if (contentPath) {
      addSharedUrls(urls, contentPath);
      if (change.changeType !== "deleted") {
        const documentUrl = getDocumentUrl(contentPath);
        if (documentUrl) urls.add(documentUrl);
      }
    }

    if (change.changeType === "moved" && change.previousFilename) {
      const previousContentPath = getContentPath(change.previousFilename);
      if (previousContentPath) addSharedUrls(urls, previousContentPath);
    }
  }

  return Array.from(urls).sort();
}

function addDataCacheKey(keys: Set<string>, contentPath: string) {
  if (!contentPath.startsWith("data/")) return;
  const filename = contentPath.slice("data/".length);
  const key = dataCacheKeyByFilename[filename];
  if (key) keys.add(key);
}

/**
 * Application-cache keys that must be deleted when content data YAML changes.
 * Without this, long-TTL `content:data:*` entries can outlive republished
 * artifacts and prewarm stale pages into a fresh page-cache generation.
 */
export function getContentCacheKeys(changes: ReadonlyArray<ContentChange>) {
  const keys = new Set<string>();

  for (const change of changes) {
    const contentPath = getContentPath(change.filename);
    if (contentPath) addDataCacheKey(keys, contentPath);

    if (change.changeType === "moved" && change.previousFilename) {
      const previousContentPath = getContentPath(change.previousFilename);
      if (previousContentPath) addDataCacheKey(keys, previousContentPath);
    }
  }

  return Array.from(keys).sort();
}
