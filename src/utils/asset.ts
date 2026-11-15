/**
 * URL for a file in public/, e.g. 'players/ddc/rahim.jpg'. Adds the site's base
 * path, so it works when the app is served from a sub-folder (GitHub Pages:
 * /Cricket_Score_Board/). Full URLs and data/blob URLs are returned as they are.
 */
export function assetUrl(path: string): string;
export function assetUrl(path: string | undefined): string | undefined;
export function assetUrl(path: string | undefined): string | undefined {
  if (!path || /^([a-z]+:|\/\/)/i.test(path)) return path;
  return import.meta.env.BASE_URL + path.replace(/^\/+/, '');
}
