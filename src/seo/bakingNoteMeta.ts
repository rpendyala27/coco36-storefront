import type { Recipe, Article, HowToStep } from 'schema-dts';
import type { BakingNote, NoteRecipe } from '../content/bakingNotes.js';
import { stripMarkdown } from './text.js';
import { faqJsonLd } from './jsonld.js';
import { LEGAL_NAME, SITE_ORIGIN } from './site.js';
import { crumbsLd, type PageMeta } from './meta.js';
import type { Crumb } from './jsonld.js';

/**
 * Head for /guides and the three Ingredient Notes. Article + FAQPage (when the
 * page has a visible FAQ) + BreadcrumbList, from the same copy the page shows.
 * Recipe JSON-LD is only the pistachio method, with untested [CONFIRM] lines
 * already removed from the source copy.
 */

const HOME: Crumb = { name: 'Home', path: '/' };
const HUB: Crumb = { name: 'Guides', path: '/guides' };

export function bakingNoteCrumbs(note: BakingNote): Crumb[] {
  if (note.path === '/guides') return [HOME, HUB];
  return [HOME, HUB, { name: note.crumb, path: note.path }];
}

function articleJsonLd(note: BakingNote): Article & { '@context': 'https://schema.org' } {
  const url = `${SITE_ORIGIN}${note.path}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: note.h1,
    description: note.schemaDescription,
    author: { '@type': 'Organization', name: LEGAL_NAME, url: `${SITE_ORIGIN}/` },
    publisher: { '@id': `${SITE_ORIGIN}/#org` },
    mainEntityOfPage: url,
    inLanguage: 'en-IN',
  };
}

function recipeJsonLd(recipe: NoteRecipe): Recipe & { '@context': 'https://schema.org' } {
  const steps: HowToStep[] = recipe.steps.map((step) => ({
    '@type': 'HowToStep',
    text: stripMarkdown(step),
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description: recipe.description,
    recipeCuisine: recipe.recipeCuisine,
    recipeCategory: recipe.recipeCategory,
    recipeYield: recipe.recipeYield,
    recipeIngredient: recipe.ingredients.map((item) => stripMarkdown(item)),
    recipeInstructions: steps,
  };
}

export function bakingNoteMeta(note: BakingNote): PageMeta {
  const faqs = note.faqs.map((f) => ({ q: f.q, a: stripMarkdown(f.a) }));
  return {
    title: note.title,
    description: note.description,
    path: note.path,
    ogType: 'article',
    jsonLd: [
      { id: 'article', data: articleJsonLd(note) },
      ...(faqs.length ? [{ id: 'faq', data: faqJsonLd(faqs) }] : []),
      ...(note.recipe ? [{ id: 'recipe', data: recipeJsonLd(note.recipe) }] : []),
      crumbsLd(bakingNoteCrumbs(note)),
    ],
  };
}
