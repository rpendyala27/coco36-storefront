/**
 * CDN-aware image sizing. Product/category images live on Cloudinary (admin
 * uploads) or Unsplash (interim seeds); both can resize + recompress on the
 * fly via URL params. Serving width-appropriate variants (with srcset) is
 * what keeps a 4:3 card thumbnail at ~30 KB instead of shipping the original.
 * Unknown hosts pass through untouched.
 */

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
const UNSPLASH = /^https:\/\/images\.unsplash\.com\//;

/** URL resized to `width` CSS px (bump handled by srcset, not here). */
export function imageUrl(url: string, width: number): string {
  const cl = url.match(CLOUDINARY_UPLOAD);
  if (cl) {
    // Skip if the URL already carries a transformation (starts with params, not a version/folder)
    if (/^[a-z]+_[^/]+\//.test(cl[2])) return url;
    return `${cl[1]}f_auto,q_auto,w_${width}/${cl[2]}`;
  }
  if (UNSPLASH.test(url)) {
    const u = new URL(url);
    u.searchParams.set('w', String(width));
    u.searchParams.set('auto', 'format');
    if (!u.searchParams.has('q')) u.searchParams.set('q', '75');
    return u.toString();
  }
  return url;
}

/** srcset over standard widths, or undefined when the host can't resize. */
export function imageSrcSet(url: string, widths: number[] = [400, 600, 800]): string | undefined {
  if (!CLOUDINARY_UPLOAD.test(url) && !UNSPLASH.test(url)) return undefined;
  return widths.map((w) => `${imageUrl(url, w)} ${w}w`).join(', ');
}
