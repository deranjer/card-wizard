/**
 * Resolve a stored image reference to a URL usable as an `<img src>`.
 *
 * - `data:` / `http(s):` values pass through untouched.
 * - Anything else is treated as a project-relative path (e.g.
 *   `images/card.png`) and routed through the Wails asset-server middleware
 *   (`/local-image`), which streams the file straight from disk.
 *
 * This replaces the previous approach of round-tripping every image through a
 * `LoadImageAsDataURL` IPC call and holding the base64 result in an
 * unbounded module-level `Map`. The browser's own HTTP cache now does the
 * caching, and identical `src` values are de-duplicated for free.
 */
export function assetUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `/local-image?path=${encodeURIComponent(path)}`;
}

/** Hook form — kept trivial so call sites read naturally. */
export function useAssetUrl(path: string | undefined | null): string {
  return assetUrl(path);
}
