import type { Category, CategoryTree } from '../lib/categoryTree.js';
import type { Product } from '../types';
import { faqJsonLd } from '../seo/jsonld.js';
import { categoryMeta, type PageMeta } from '../seo/meta.js';

/**
 * Editorial copy for the four thin, indexable category URLs. Same rules as
 * the ingredient guides: general, verifiable kitchen knowledge, no health
 * claims, no third-party brand names, and no origin story we cannot point at
 * on the homepage. The "sourced direct from origin" line is the homepage's
 * own description of COCO36, not a claim about one SKU.
 *
 * Intros are 150–250 words. FAQs are the same strings the FAQPage JSON-LD uses.
 */

export interface CategoryFaq { q: string; a: string }

export interface CategoryPageCopy {
  slug: string;
  /** 150–250 words across these paragraphs. */
  intro: string[];
  faqs: CategoryFaq[];
}

const PAGES: CategoryPageCopy[] = [
  {
    slug: 'extracts-flavors',
    intro: [
      'Extracts and flavours are concentrated aromas measured by the spoon, rather than a whole pod, bark or stick. Vanilla extract, the one most pastry kitchens mean, is cured vanilla beans steeped in alcohol and water until the liquid carries the flavour. Other flavourings are the same idea: a pourable form you dose into a batter, a cream or a dough.',
      'A whole bean and an extract made from it are related, and they are not interchangeable in a formula. The bean still has seeds and a pod to scrape or infuse. The extract is already liquid, so it blends in, and heat changes how it reads. The same bottle can taste louder in a custard than in a long-baked cookie. Strength also varies by maker and by how long it was steeped, so taste when you substitute and start with less than you expect.',
      'Keep bottles closed, upright, and away from the stove and direct sun. A cool cupboard is enough for most alcohol-based extracts. COCO36 files these flavouring ingredients here, in a range of specialty baking ingredients sourced direct from origin. The vanilla guide explains how beans are grown and cured, and how Tahitian and Bourbon vanilla differ. The product page carries the facts of a specific bottle or pod.',
    ],
    faqs: [
      {
        q: 'What is an extract?',
        a: 'An extract is a liquid that has taken on the aroma of an ingredient, so you can measure flavour by the spoon. Vanilla extract is the usual example: cured vanilla beans steeped in alcohol and water.',
      },
      {
        q: 'Is an extract the same as using a whole vanilla bean?',
        a: 'No. A bean still has seeds and a pod, and you scrape or infuse it. An extract is already liquid and blends into batters and creams. The flavours are related, not identical, and recipes written for one are not automatically right for the other.',
      },
      {
        q: 'How should extracts be stored?',
        a: 'Closed, upright, and away from the stove and direct sun. A cool cupboard is enough for most alcohol-based extracts. The refrigerator is not required.',
      },
      {
        q: 'Can I swap an extract into a recipe written for a whole bean?',
        a: 'Not one for one. If the formula was written for a bean, start with less extract than you expect and taste. Concentration differs by maker and by how long the beans were steeped.',
      },
    ],
  },
  {
    slug: 'flours-grains',
    intro: [
      'Flours and grains are the base of bread, pastry, cakes and batters. What changes from bag to bag is the plant, how much of it remains in the flour, and how fine it was ground. Wheat flours are talked about by protein. In wheat, protein is a rough guide to gluten: more of it can hold the gas a loaf needs, and less of it suits short crust and many cakes. That is about how dough behaves. It is not a health claim.',
      'Buckwheat is not wheat. It is a seed, it contains no gluten, and its taste is deeper and more bitter, which is why it turns up in galettes and pancakes. Rye bakes denser and more aromatic than a typical wheat loaf. Spelt is a wheat relative with a nutty flavour, and it still contains gluten, so it cannot stand in where a formula has to be free of gluten. That limit is about the bake, not a diet claim.',
      'Keep flour sealed, cool and dry, and off the stove. Wholegrain flours keep more of the germ and go stale sooner than white flours, so buy what you will use. If a bag smells oily, or harshly bitter in a way it did not when you opened it, it is past its best for baking. COCO36 groups these speciality flours and grains here, as specialty baking ingredients sourced direct from origin. The flours guide goes further into protein, milling and storage.',
    ],
    faqs: [
      {
        q: 'What does protein mean in a wheat flour?',
        a: 'In wheat, protein is a rough guide to gluten strength. Higher-protein flours make doughs that can hold gas, which is what bread usually wants. Lower-protein flours are the usual choice for cakes and short pastry. This describes how the dough behaves, not a health effect.',
      },
      {
        q: 'Is buckwheat a kind of wheat?',
        a: 'No. Buckwheat is a seed. It contains no gluten, and its flavour is deeper and more bitter than wheat flour. The shared word in the name is a language accident, not a family relationship.',
      },
      {
        q: 'Can spelt stand in where a recipe must be free of gluten?',
        a: 'No. Spelt is a relative of wheat and it contains gluten. It will not work in a formula that has to leave gluten out.',
      },
      {
        q: 'How should flour be stored?',
        a: 'Sealed, cool and dry, and away from the stove. Wholegrain flours stale faster than white flours because more of the germ is still in the bag, so buy an amount you will use.',
      },
    ],
  },
  {
    slug: 'mixes-kits',
    intro: [
      'A mix or a kit is ingredients already portioned for one kind of bake, so the method is shorter than starting from a bare pantry. A mix is usually a dry blend you finish with water, milk, butter or eggs from your own kitchen. A kit can also include something awkward to buy in a small amount, sometimes a starter, a particular flour, or a tool. Not every kit contains a starter. Read the pack in your hand.',
      'The bake is still yours. The oven, the liquid and the timing decide more than the words on the box. Follow the included method the first time, then adjust if your oven runs hot or the kitchen is very humid, as many Indian kitchens are for part of the year. A living culture needs the care written on that kit. A dried mix does not.',
      'Allergens, including gluten and dairy when they are present, belong on the label of that product, not on a category page. Keep dry mixes sealed and cool, like flour, and use them by the date on the pack. These blends are part of the COCO36 range of specialty baking ingredients sourced direct from origin. When a kit is built around a flour, the flours guide covers protein, milling and storage. The product page and the label remain the facts for that kit.',
    ],
    faqs: [
      {
        q: 'What is the difference between a mix and a kit?',
        a: 'A mix is usually a dry blend you finish with ingredients from your own kitchen, such as water, milk, butter or eggs. A kit includes more of what the method needs, sometimes a starter, a particular flour, or a tool. Check the pack: not every kit contains a starter.',
      },
      {
        q: 'Does a mix do the baking for me?',
        a: 'No. You still control the oven, the liquid and the timing, and those decide most of the result. Follow the method in the pack the first time, then adjust the next bake if your oven or your kitchen humidity needs it.',
      },
      {
        q: 'How should a dry mix be stored?',
        a: 'Sealed and cool, the same way you store flour, and used by the date printed on the pack.',
      },
      {
        q: 'Where do I see allergens and what I still need to add?',
        a: 'On that product’s page and on its label. A category page cannot list allergens for every blend, because they differ from kit to kit.',
      },
    ],
  },
  {
    slug: 'spices-pantry',
    intro: [
      'Spices and pantry staples are the small amounts that finish a bake: salt on a caramel, pepper in a shortbread, a pod or a piece of bark infused into cream. Salt sharpens sweetness, keeps bread from tasting flat, and makes chocolate taste more like itself. Flaky sea salt is a finishing salt. The crystals stay visible and crunchy if you add them after baking. Stirred into a batter, they dissolve.',
      'Whole spices keep their aroma longer than ground ones, because less surface meets the air. Buy them whole when the recipe allows, and grind what you need. True cinnamon and cassia are both sold as cinnamon. They come from related trees and do not taste the same. Nothing here is offered as a health effect. These ingredients are for flavour and, with flaky salt, for texture.',
      'Keep jars closed, dry and out of the sun, and off the stove, where heat and steam fade them. When a ground spice has lost its smell, replace it. This is the COCO36 pantry category: specialty baking ingredients sourced direct from origin, including finishing salt and whole spices. The spices and salt guide explains how finishing salt is made and how to tell cinnamon from cassia.',
    ],
    faqs: [
      {
        q: 'When should flaky salt be added?',
        a: 'After baking or cooking, when you want the crystals to stay visible and crunchy. Salt stirred into a dough or batter dissolves, so it seasons the crumb instead of finishing the top.',
      },
      {
        q: 'Why buy spices whole?',
        a: 'Less of the spice is exposed to air, so the aroma lasts longer than in a powder that was ground before it was packed. Grind what you need. Toast only when the recipe asks.',
      },
      {
        q: 'Are cinnamon and cassia the same thing?',
        a: 'Both are sold as cinnamon, and they are not the same taste. They come from related trees. The spices and salt guide explains how to tell them apart.',
      },
      {
        q: 'Where should spices be stored?',
        a: 'In closed jars, dry, and out of direct sun. Keep them off the stove. Heat and steam above a hob fade the aroma faster than a cool cupboard does.',
      },
    ],
  },
];

const BY_SLUG = new Map(PAGES.map((p) => [p.slug, p]));

export function categoryPage(slug: string): CategoryPageCopy | undefined {
  return BY_SLUG.get(slug);
}

export const CATEGORY_PAGE_SLUGS = PAGES.map((p) => p.slug);

/** Category head plus FAQPage JSON-LD when this slug has editorial FAQs. */
export function categoryListingMeta(c: Category, tree: CategoryTree, products: readonly Product[]): PageMeta {
  const base = categoryMeta(c, tree, products);
  const page = categoryPage(c.slug);
  if (!page) return base;
  return {
    ...base,
    jsonLd: [...base.jsonLd, { id: 'faq', data: faqJsonLd(page.faqs) }],
  };
}
