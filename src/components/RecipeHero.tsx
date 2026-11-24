import {
  RECIPE_HERO_HEIGHT, RECIPE_HERO_SIZES, RECIPE_HERO_WIDTH, recipeHeroSrc, type RecipePhotos,
} from '../seo/recipeImage';

/**
 * Visible hero for a recipe or baking note. Renders nothing when `images`
 * is omitted, empty, or has no accepted https://coco36.com URL, so those
 * pages stay as they are. This project has no next/image; the <img> uses
 * the same width, height and sizes as the server snapshot.
 */
export function RecipeHero({ images, alt }: { images?: RecipePhotos; alt: string }) {
  const src = recipeHeroSrc(images);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      width={RECIPE_HERO_WIDTH}
      height={RECIPE_HERO_HEIGHT}
      sizes={RECIPE_HERO_SIZES}
      decoding="async"
      className="mt-6 w-full h-auto"
    />
  );
}
