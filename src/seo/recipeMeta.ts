import type { HowToStep, Recipe } from 'schema-dts';
import {
  RECIPES_HUB, RECIPES_PUBLISH_DATE, schemaIngredients, type RecipeDoc,
} from '../content/recipes.js';
import { stripMarkdown } from './text.js';
import { BRAND, SITE_ORIGIN } from './site.js';
import { crumbsLd, type PageMeta } from './meta.js';
import type { Crumb } from './jsonld.js';

/**
 * Head for /recipes and each recipe. Recipe JSON-LD uses the visible
 * ingredient lines and method steps. No image (there is no original photo),
 * and no nutrition, rating, review or cuisine.
 */

const HOME: Crumb = { name: 'Home', path: '/' };
const HUB: Crumb = { name: RECIPES_HUB.crumb, path: RECIPES_HUB.path };

export function recipesHubCrumbs(): Crumb[] {
  return [HOME, HUB];
}

export function recipeCrumbs(recipe: RecipeDoc): Crumb[] {
  return [HOME, HUB, { name: recipe.h1, path: recipe.path }];
}

function recipeJsonLd(recipe: RecipeDoc): Recipe & { '@context': 'https://schema.org' } {
  const url = `${SITE_ORIGIN}${recipe.path}`;
  const steps: HowToStep[] = recipe.steps.map((step) => ({
    '@type': 'HowToStep',
    text: stripMarkdown(step),
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.h1,
    description: recipe.description,
    author: { '@type': 'Organization', name: BRAND, url: `${SITE_ORIGIN}/` },
    datePublished: RECIPES_PUBLISH_DATE,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    totalTime: recipe.totalTime,
    recipeYield: recipe.recipeYield.length === 1 ? recipe.recipeYield[0] : [...recipe.recipeYield],
    recipeCategory: 'Dessert',
    recipeIngredient: schemaIngredients(recipe).map((item) => stripMarkdown(item)),
    recipeInstructions: steps,
    url,
    mainEntityOfPage: url,
  };
}

export function recipesHubMeta(): PageMeta {
  return {
    title: RECIPES_HUB.title,
    description: RECIPES_HUB.description,
    path: RECIPES_HUB.path,
    jsonLd: [crumbsLd(recipesHubCrumbs())],
  };
}

export function recipeMeta(recipe: RecipeDoc): PageMeta {
  return {
    title: recipe.title,
    description: recipe.description,
    path: recipe.path,
    jsonLd: [
      { id: 'recipe', data: recipeJsonLd(recipe) },
      crumbsLd(recipeCrumbs(recipe)),
    ],
  };
}
