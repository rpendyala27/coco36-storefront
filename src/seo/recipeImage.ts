import { SITE_HOST } from './site.js';

/**
 * Optional dish photos for Recipe JSON-LD and the visible hero.
 *
 * Each entry is meant to be an absolute https://coco36.com URL for one crop
 * of the same photo (1:1, 4:3 and 16:9, each at least 1200px wide). The
 * first accepted URL is the hero on the page. Recipe JSON-LD receives every
 * accepted URL, in the same order, and only when that list is non-empty.
 *
 * Relative paths, non-https URLs, and any host other than coco36.com
 * (including www) are ignored. Nothing is substituted: /og.png, the floral
 * logo and the homepage hero posters are not read here.
 */
export type RecipePhotos = readonly string[];

export const RECIPE_HERO_WIDTH = 1200;
export const RECIPE_HERO_HEIGHT = 900;
/** Content column is max-w-3xl with px-6, so the hero paints at about 720px. */
export const RECIPE_HERO_SIZES = '(min-width: 768px) 720px, 100vw';

export function acceptedRecipeImages(urls: RecipePhotos | undefined): string[] {
  if (!urls?.length) return [];
  const accepted: string[] = [];
  for (const value of urls) {
    if (typeof value !== 'string') continue;
    const raw = value.trim();
    if (!raw) continue;
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:') continue;
    if (url.username || url.password) continue;
    if (url.hostname !== SITE_HOST) continue;
    if (url.pathname === '/' || url.pathname === '') continue;
    accepted.push(raw);
  }
  return accepted;
}

/** First accepted photo, or undefined when the page should stay without one. */
export function recipeHeroSrc(urls: RecipePhotos | undefined): string | undefined {
  return acceptedRecipeImages(urls)[0];
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escAttr = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

/**
 * Crawlable hero <img>, or '' when there is no accepted photo.
 * Width/height reserve a 4:3 box (the middle of the three crops). The
 * no-JS snapshot CSS and the React page both scale it to the column.
 */
export function recipeHeroHtml(urls: RecipePhotos | undefined, alt: string): string {
  const src = recipeHeroSrc(urls);
  if (!src) return '';
  return `<img src="${escAttr(src)}" alt="${escAttr(alt)}" width="${RECIPE_HERO_WIDTH}" height="${RECIPE_HERO_HEIGHT}" sizes="${RECIPE_HERO_SIZES}" decoding="async" />`;
}
