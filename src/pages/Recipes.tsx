import { Fragment, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import {
  RECIPES_HUB, RECIPES_PUBLISH_DATE, RECIPES_PUBLISH_LABEL, RECIPE_INDEX_LINKS,
  recipeBySlug, type RecipeDoc, type RecipeLink,
} from '../content/recipes';
import { parseRich, type RichNode } from '../content/richText';
import { useSeo } from '../lib/seo';
import { notFoundMeta } from '../seo/meta';
import { recipeCrumbs, recipeMeta, recipesHubCrumbs, recipesHubMeta } from '../seo/recipeMeta';

/**
 * /recipes and /recipes/:slug. Head metadata is recipeMeta, the same module
 * the server snapshot uses.
 */
export function Recipes() {
  const { slug } = useParams<{ slug?: string }>();
  const recipe = slug ? recipeBySlug(slug) : undefined;
  const meta = useMemo(() => {
    if (!slug) return recipesHubMeta();
    return recipe ? recipeMeta(recipe) : notFoundMeta();
  }, [slug, recipe]);
  useSeo(meta);

  if (slug && !recipe) {
    return (
      <div className="min-h-[70vh] pt-28 px-6 flex flex-col items-center justify-center text-center">
        <p className="eyebrow text-brand-leaf mb-3">Error 404</p>
        <h1 className="text-4xl md:text-5xl mb-5">Recipe not found.</h1>
        <Link to={RECIPES_HUB.path} className="btn-primary !px-8 !py-4">All recipes</Link>
      </div>
    );
  }

  if (!recipe) return <RecipesIndex />;
  return <RecipeArticle recipe={recipe} />;
}

function RecipesIndex() {
  return (
    <div className="bg-brand-paper pt-20 min-h-screen">
      <article className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        <Breadcrumbs crumbs={recipesHubCrumbs()} />
        <p className="eyebrow text-brand-leaf mt-8 mb-3">Recipes</p>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05] text-brand-forest">{RECIPES_HUB.h1}</h1>
        <p className="mt-4 text-sm text-brand-muted">Published <time dateTime={RECIPES_PUBLISH_DATE}>{RECIPES_PUBLISH_LABEL}</time></p>
        {RECIPES_HUB.intro.map((paragraph) => (
          <p key={paragraph} className="mt-5 text-lg leading-relaxed text-brand-ink/80"><Rich text={paragraph} /></p>
        ))}
        <ul className="mt-8 list-disc pl-6 space-y-2 text-[16px] leading-relaxed text-brand-ink/80">
          {RECIPE_INDEX_LINKS.map((link) => (
            <li key={link.href}><RecipeAnchor link={link} /></li>
          ))}
        </ul>
      </article>
    </div>
  );
}

function RecipeArticle({ recipe }: { recipe: RecipeDoc }) {
  return (
    <div className="bg-brand-paper pt-20 min-h-screen">
      <article className="max-w-3xl mx-auto px-6 pt-8 pb-16">
        <Breadcrumbs crumbs={recipeCrumbs(recipe)} />
        <p className="eyebrow text-brand-leaf mt-8 mb-3">Recipes</p>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05] text-brand-forest">{recipe.h1}</h1>
        <p className="mt-4 text-sm text-brand-muted">Published <time dateTime={RECIPES_PUBLISH_DATE}>{RECIPES_PUBLISH_LABEL}</time></p>
        <p className="mt-5 text-lg leading-relaxed text-brand-ink/80">{recipe.opening}</p>

        <ul className="mt-6 space-y-1 text-[16px] leading-relaxed text-brand-ink/80">
          {recipe.facts.map((fact) => (
            <li key={fact.label}><span className="font-semibold text-brand-ink">{fact.label}:</span> {fact.value}</li>
          ))}
        </ul>

        {recipe.groups.map((group) => (
          <section key={group.heading} className="mt-10">
            <h2 className="font-display text-2xl md:text-3xl text-brand-forest mb-3">{group.heading}</h2>
            <ul className="mt-3 list-disc pl-6 space-y-2 text-[16px] leading-relaxed text-brand-ink/80">
              {group.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}

        {recipe.afterIngredients.map((paragraph) => (
          <p key={paragraph} className="mt-5 text-[16px] leading-relaxed text-brand-ink/80"><Rich text={paragraph} /></p>
        ))}

        <section className="mt-10">
          <h2 className="font-display text-2xl md:text-3xl text-brand-forest mb-3">Method</h2>
          <ol className="mt-3 list-decimal pl-6 space-y-3 text-[16px] leading-relaxed text-brand-ink/80">
            {recipe.steps.map((step) => <li key={step}><Rich text={step} /></li>)}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl md:text-3xl text-brand-forest mb-3">Warm-kitchen tips</h2>
          <ul className="mt-3 list-disc pl-6 space-y-2 text-[16px] leading-relaxed text-brand-ink/80">
            {recipe.tips.map((tip) => <li key={tip}><Rich text={tip} /></li>)}
          </ul>
        </section>

        <nav aria-label="Related pages" className="mt-12">
          <h2 className="font-display text-2xl md:text-3xl text-brand-forest mb-3">On this site</h2>
          <ul className="mt-3 list-disc pl-6 space-y-2 text-[16px] leading-relaxed text-brand-ink/80">
            {recipe.related.map((link) => (
              <li key={link.href}><RecipeAnchor link={link} /></li>
            ))}
          </ul>
        </nav>
      </article>
    </div>
  );
}

function RecipeAnchor({ link }: { link: RecipeLink }) {
  return (
    <>
      <Link to={link.href} className="text-brand-leaf hover:underline">{link.label}</Link>
      {link.suffix ?? ''}
    </>
  );
}

function Rich({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((node, i) => (
        <Fragment key={i}><RichView node={node} /></Fragment>
      ))}
    </>
  );
}

function RichView({ node }: { node: RichNode }) {
  if (node.type === 'text') return <>{node.text}</>;
  if (node.type === 'bold') {
    return (
      <strong className="font-semibold text-brand-ink">
        {node.children.map((child, i) => (
          <Fragment key={i}><RichView node={child} /></Fragment>
        ))}
      </strong>
    );
  }
  if (/^https?:/i.test(node.href)) {
    return <a href={node.href} className="text-brand-leaf hover:underline" target="_blank" rel="noopener noreferrer">{node.text}</a>;
  }
  return <Link to={node.href} className="text-brand-leaf hover:underline">{node.text}</Link>;
}
