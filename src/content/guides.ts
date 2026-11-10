import {
  DEFAULT_POLICY, businessDayPhrase, dispatchWindow, type StorePolicy, rupees,
} from '../seo/site.js';
import { COURIER_PARTNERS } from './orderFacts.js';
import { GUIDE_LINKS, type GuideLink } from './guideIndex.js';

export { GUIDE_LINKS, GUIDES_HUB, guidePath, productsForGuide, type GuideLink } from './guideIndex.js';

/**
 * Ingredient-family landing pages (/ingredients/<slug>): the full guide
 * bodies. Links/cards/matching live in ./guideIndex (kept out of the main
 * bundle's way); this module is loaded by the Guide page chunk and the server.
 * One source of truth
 * for the React page (src/pages/Guide.tsx) AND the server-rendered snapshot +
 * FAQPage JSON-LD (api/render.ts), so crawlers and visitors read the same copy.
 *
 * Editorial rule: general, verifiable ingredient knowledge only. No claims
 * about COCO36's own sourcing, certifications or health effects, and no
 * third-party brand names. Product facts (origin, brand) come from the database.
 */

export interface GuideSection { heading: string; paragraphs: string[] }
export interface Faq { q: string; a: string }

export interface Guide extends GuideLink {
  /** <title> — under 60 chars including " | COCO36". */
  title: string;
  /** Meta description — under 155 chars. */
  description: string;
  eyebrow: string;
  h1: string;
  intro: string[];
  sections: GuideSection[];
  faqs: Faq[];
}

const link = (slug: string): GuideLink => {
  const l = GUIDE_LINKS.find((g) => g.slug === slug);
  if (!l) throw new Error(`guide link missing: ${slug}`);
  return l;
};

export const GUIDES: Guide[] = [
  {
    ...link('vanilla'),
    title: 'Vanilla Beans in India: Tahitian vs Bourbon | COCO36',
    description: 'How vanilla is grown and cured, how Tahitian and Bourbon vanilla differ, and how to use and store whole beans. Vanilla beans online in India.',
    eyebrow: 'Ingredient guide · Vanilla',
    h1: 'Vanilla beans: a buyer’s guide',
    intro: [
      'Vanilla is the cured seed pod of a climbing orchid, and one of the most labour-intensive crops in the spice trade. That is why a good bean is priced the way it is. This guide covers where vanilla comes from, how it is cured, how the two main species taste, and how to get the most out of every pod you buy.',
    ],
    sections: [
      {
        heading: 'Where vanilla comes from',
        paragraphs: [
          'Vanilla orchids are native to Mexico and Central America, where the Totonac people of the Gulf coast grew and used the pods long before Europeans arrived. Away from that region the plant’s natural pollinators are missing, so for centuries it flowered but rarely set fruit. In 1841 Edmond Albius, a twelve-year-old enslaved boy on the island of Réunion, worked out a quick way to pollinate the flowers by hand. His technique is still how almost all of the world’s vanilla is pollinated, one flower at a time.',
          'Today most vanilla comes from Madagascar and its neighbouring Indian Ocean islands, with smaller crops in Indonesia, Mexico, Uganda, Papua New Guinea, French Polynesia and India, where vanilla is grown in parts of Kerala and Karnataka.',
        ],
      },
      {
        heading: 'From green pod to cured bean',
        paragraphs: [
          'A freshly picked vanilla pod is green and has almost no aroma. The flavour develops during curing, which usually takes several months. The pods are first “killed” with heat, often a brief dip in hot water, to stop them ripening. They are then sweated in insulated boxes, dried slowly, and finally conditioned in closed containers while the flavour rounds out. During curing, compounds in the pod break down to release vanillin along with hundreds of other aroma compounds, which is why real vanilla tastes more complex than synthetic vanillin.',
        ],
      },
      {
        heading: 'Tahitian vs Bourbon vanilla',
        paragraphs: [
          'Two species account for nearly all the vanilla sold. Vanilla planifolia is grown in Madagascar, Réunion and the Comoros, and beans from those islands are sold as Bourbon vanilla, after Réunion’s old name, Île Bourbon. It is high in vanillin and has the rich, creamy flavour most people picture when they think of vanilla, and it holds up well in baking.',
          'Vanilla × tahitensis, grown mainly in French Polynesia, gives plumper, more pliable beans with less vanillin but more floral and fruity aroma compounds; pastry chefs often describe it as cherry-like or anise-like. Those delicate notes fade with long, high heat, so Tahitian vanilla is at its best in custards, creams, ice cream, panna cotta and fruit desserts, where vanilla is the main flavour.',
        ],
      },
      {
        heading: 'How to use a whole bean',
        paragraphs: [
          'Lay the bean flat, split it lengthwise with the tip of a small knife and scrape out the seeds with the back of the blade. Add the seeds and the scraped pod to milk or cream as it warms, then let it infuse off the heat before straining out the pod. Don’t throw the pod away: rinsed and dried, it can flavour a jar of sugar, or be steeped in a neutral spirit to start a homemade extract.',
        ],
      },
      {
        heading: 'Storing vanilla beans',
        paragraphs: [
          'Keep beans in an airtight glass jar or tube in a cool, dark cupboard. Avoid the refrigerator: the cold dries beans out and its humidity can encourage mould. Fine, glittering white crystals on a well-cured bean are usually vanillin coming out of the pod, not mould. Mould is fuzzy, grey or green, and smells musty.',
        ],
      },
    ],
    faqs: [
      { q: 'What is the difference between Tahitian and Bourbon vanilla?', a: 'They come from different species. Bourbon vanilla (Vanilla planifolia, mainly from Madagascar) is high in vanillin and tastes rich and creamy. Tahitian vanilla (Vanilla × tahitensis, mainly from French Polynesia) has less vanillin and more floral, fruity notes, so it is usually chosen for desserts where vanilla is the star.' },
      { q: 'How should I store vanilla beans?', a: 'In an airtight container in a cool, dark place, away from heat and sunlight. Don’t refrigerate them: the cold dries them out and the humidity can cause mould.' },
      { q: 'Are the white crystals on my vanilla bean mould?', a: 'Usually not. Fine, glittering white crystals are vanillin that has crystallised on the surface of a well-cured bean. Mould looks fuzzy, is grey or green, and smells musty; discard any bean that shows it.' },
      { q: 'Can I reuse a vanilla pod after scraping it?', a: 'Yes. Rinse and dry the scraped pod, then bury it in a jar of sugar to make vanilla sugar, or add it to a bottle of neutral spirit to begin a homemade extract.' },
    ],
  },
  {
    ...link('cocoa-chocolate'),
    title: 'Cocoa Powder & Couverture Chocolate in India | COCO36',
    description: 'From cacao pod to couverture: how cocoa is grown and made, natural vs Dutch-process cocoa, tempering and storage, for bakers and chocolatiers in India.',
    eyebrow: 'Ingredient guide · Cocoa & chocolate',
    h1: 'Cocoa and chocolate: from pod to couverture',
    intro: [
      'Every chocolate bar, cocoa powder and couverture starts as the seed of one tropical tree, Theobroma cacao. What happens between the farm and your mixing bowl decides how that chocolate tastes, how it melts and how it behaves in a recipe. This guide explains the journey, and the terms you will meet when you buy cocoa ingredients.',
    ],
    sections: [
      {
        heading: 'Where cacao grows',
        paragraphs: [
          'Cacao is native to the upper Amazon basin of South America. People there used it for thousands of years before it travelled north to Mesoamerica, where the Maya and the Aztecs prized it as a drink. The tree only thrives in a hot, humid band within roughly 20 degrees of the equator. Today West Africa, led by Côte d’Ivoire and Ghana, grows most of the world’s cocoa, with significant crops in Latin America and Southeast Asia.',
          'India is a small but growing producer. Cacao is grown mainly in Andhra Pradesh, Kerala, Karnataka and Tamil Nadu, usually as a shade-loving intercrop under coconut and areca palms.',
        ],
      },
      {
        heading: 'From bean to chocolate',
        paragraphs: [
          'Ripe pods are cut open and the beans, still wrapped in sweet white pulp, are fermented for several days; fermentation is where much of chocolate’s flavour begins. The beans are then dried, roasted and cracked into nibs, which are ground into a thick paste called cocoa mass or cocoa liquor. Pressing cocoa mass separates it into cocoa butter and a dry cake that is milled into cocoa powder. Chocolate is made by mixing cocoa mass with sugar, often with extra cocoa butter and milk, then refining and conching it until smooth.',
        ],
      },
      {
        heading: 'Natural vs Dutch-process cocoa',
        paragraphs: [
          'Natural cocoa powder is simply ground cocoa solids. It is lighter in colour, acidic and sharply fruity, and it reacts with baking soda, which is why many cake recipes pair the two. Dutch-process, or alkalised, cocoa has been treated to neutralise that acidity. It is darker, smoother and milder, mixes more easily into liquids, and is usually paired with baking powder. The two are not always interchangeable in a recipe that relies on them for lift.',
        ],
      },
      {
        heading: 'What “couverture” means',
        paragraphs: [
          'Couverture is chocolate made with a higher proportion of cocoa butter than everyday baking chocolate. The extra cocoa butter makes it more fluid when melted, so it coats thinly and evenly, and when properly tempered it sets with a glossy shine and a clean snap. Chocolatiers use it for bonbons, enrobing and moulded work; bakers use it for ganache and glazes. The percentage on a pack is the total cocoa content, cocoa mass plus added cocoa butter, and is not a measure of quality on its own.',
        ],
      },
      {
        heading: 'Tempering and storage',
        paragraphs: [
          'Tempering means melting, cooling and gently re-warming chocolate so its cocoa butter sets in its most stable crystal form; untempered chocolate sets soft, dull and streaky. Store chocolate and cocoa in a cool, dry, dark place, ideally around 15–20 °C, sealed away from strong smells. In a hot Indian summer an air-conditioned room is kinder than the fridge: chocolate taken out of the fridge collects condensation, which dissolves surface sugar and leaves a grey, dusty “sugar bloom”.',
        ],
      },
    ],
    faqs: [
      { q: 'Can I swap Dutch-process cocoa for natural cocoa?', a: 'Sometimes. Where cocoa is only there for flavour, either works. In cakes leavened mainly with baking soda, natural cocoa’s acidity helps the rise, so Dutch-process cocoa can give a flatter, denser result unless you adjust the leavening.' },
      { q: 'What is the white coating on old chocolate?', a: 'It is bloom, and it is safe to eat. Fat bloom appears when cocoa butter melts and re-sets on the surface after warm storage; sugar bloom appears when moisture, often fridge condensation, dissolves surface sugar. Melting and re-tempering restores the chocolate’s look.' },
      { q: 'What does the percentage on dark chocolate mean?', a: 'It is the share of the chocolate’s weight that comes from the cacao bean: cocoa mass plus any added cocoa butter. Most of the rest is sugar. A higher number means less sugar and more intensity, not necessarily better chocolate.' },
      { q: 'Is cocoa grown in India?', a: 'Yes. India grows cacao mainly in Andhra Pradesh, Kerala, Karnataka and Tamil Nadu, typically as an intercrop under coconut and areca palms.' },
    ],
  },
  {
    ...link('sugars-jaggery'),
    title: 'Jaggery, Muscovado & Unrefined Sugar in India | COCO36',
    description: 'How jaggery, muscovado and other unrefined cane sugars are made, how they taste and how to bake with them. Speciality sugars online in India from COCO36.',
    eyebrow: 'Ingredient guide · Sugars & jaggery',
    h1: 'Jaggery, muscovado and unrefined sugars',
    intro: [
      'White sugar is all sweetness and no character. Less refined sugars keep some of the cane’s molasses, and with it colour, moisture and flavour, from caramel and toffee to liquorice and smoke. This guide explains how the main unrefined sugars are made and where each one works best.',
    ],
    sections: [
      {
        heading: 'A sweet history that starts in India',
        paragraphs: [
          'Sugarcane was first domesticated in New Guinea, but the technique of boiling cane juice down and crystallising it into solid sugar was developed in ancient India. The English word “sugar” traces back to the Sanskrit śarkarā, and “candy” to khaṇḍa. Jaggery, known as gur in Hindi and bellam in Telugu, is still made in much the same way, and India remains the world’s largest producer of it.',
        ],
      },
      {
        heading: 'How jaggery is made',
        paragraphs: [
          'Fresh cane juice is filtered and boiled in wide, open pans, with impurities skimmed off as it thickens. Once it is concentrated enough, it is poured into moulds or worked into blocks, cones or granules and left to set. Nothing is spun out, so all of the molasses stays in. Palm jaggery is made the same way from the sap of palms such as the palmyra, date or coconut palm; date-palm jaggery, nolen gur, is a winter speciality of Bengal.',
        ],
      },
      {
        heading: 'Muscovado, demerara and brown sugar',
        paragraphs: [
          'Muscovado is a moist, fine-grained, minimally refined cane sugar that keeps much of its natural molasses. Light muscovado tastes of toffee and butterscotch; dark muscovado is stickier, with a deeper, almost bitter liquorice edge. Demerara, named after a region of Guyana, has large, crunchy golden crystals and a gentler flavour, which makes it ideal for sprinkling over bakes. Many commercial brown sugars, by contrast, are refined white sugar with some molasses added back.',
        ],
      },
      {
        heading: 'Baking with unrefined sugars',
        paragraphs: [
          'Muscovado can usually replace soft brown sugar one for one. It brings more moisture and a stronger flavour, so it shines in gingerbread, sticky toffee pudding, brownies, barbecue sauces and coffee. Jaggery melts into syrups for sweets such as payasam, chikki and ladoos, and it can stand in for sugar in many recipes: grate or melt it first, and expect a softer, more caramel-coloured result. Because these sugars carry molasses they attract moisture, which keeps cakes tender but can make crisp biscuits chewier. Nutritionally they are all still sugar, so choose them for flavour, colour and texture.',
        ],
      },
      {
        heading: 'Storing unrefined sugars',
        paragraphs: [
          'Keep them in a well-sealed container at room temperature. Exposed to air they lose moisture and set hard; if a block of muscovado hardens, seal it in a jar with a slice of fresh bread or a wedge of apple for a day. Jaggery keeps best wrapped and dry, because in humid weather it turns sticky.',
        ],
      },
    ],
    faqs: [
      { q: 'Is jaggery the same as brown sugar?', a: 'No. Jaggery is made by boiling cane juice or palm sap until it sets, with none of the molasses removed. Brown sugar is crystallised sugar, often refined white sugar with some molasses added back. Jaggery has a looser texture and a more complex, earthy flavour.' },
      { q: 'What is the difference between light and dark muscovado?', a: 'The amount of molasses. Light muscovado has a toffee, butterscotch flavour; dark muscovado has more molasses, a stickier texture and a deeper, slightly bitter taste.' },
      { q: 'Can I use muscovado instead of white sugar?', a: 'Often one for one by weight, but it will make bakes darker, moister and more strongly flavoured. It works best where those qualities help, as in gingerbread, brownies and fruit cakes.' },
      { q: 'How do I soften hardened muscovado or jaggery?', a: 'Seal it in a jar with a slice of bread or a piece of apple for a day, or warm it very briefly, then store it airtight.' },
    ],
  },
  {
    ...link('flours'),
    title: 'Buckwheat & Speciality Flours in India: A Guide | COCO36',
    description: 'Buckwheat, rye, spelt and other speciality flours explained: protein, gluten, milling and storage, plus how to bake with them in Indian kitchens.',
    eyebrow: 'Ingredient guide · Flours',
    h1: 'Speciality flours: a baker’s guide',
    intro: [
      'Flour decides the structure, texture and flavour of almost everything a baker makes. Beyond everyday maida and atta there is a wide world of grains and seeds, each milled for a purpose. This guide covers what to look for and how to bake with the less familiar ones.',
    ],
    sections: [
      {
        heading: 'Protein, gluten and why they matter',
        paragraphs: [
          'When wheat flour meets water, two of its proteins form gluten, the stretchy network that traps gas and lets bread rise. Flours with more protein make stronger dough for bread and pizza; low-protein flours give tender cakes and pastry. In India, maida is refined white wheat flour and atta is whole-wheat flour, traditionally stone-ground for rotis. Many speciality flours behave very differently because they have less gluten, or none at all.',
        ],
      },
      {
        heading: 'Buckwheat: not wheat at all',
        paragraphs: [
          'Despite its name, buckwheat is not a grain or a relative of wheat. It is the seed of Fagopyrum esculentum, a plant in the same family as rhubarb and sorrel, so it contains no gluten. Dark buckwheat flour, milled with some of the hull, has an earthy, nutty flavour. In Brittany it is the flour for galettes, the region’s thin savoury crêpes; in Eastern Europe it makes blini; in Japan it is the base of soba noodles. In North India it is familiar as kuttu ka atta, used for puris and pakoras during Navratri fasts.',
        ],
      },
      {
        heading: 'Rye, spelt and Italian “00”',
        paragraphs: [
          'Rye flour builds only a weak gluten network, so rye breads rely on starches and natural gums for structure and come out dense, moist and tangy, especially when made with sourdough. Spelt is an ancient relative of common wheat with a sweet, nutty flavour and more fragile gluten, so it needs gentler mixing. The Italian “00” grade describes how finely the flour is milled and refined, not its protein, which is why there are “00” flours for both pizza and pastry.',
        ],
      },
      {
        heading: 'Baking with buckwheat and gluten-free flours',
        paragraphs: [
          'Because buckwheat cannot form gluten, it will not make a light, open loaf on its own. For pancakes, galettes, crêpes and blini that does not matter; resting the batter for a few hours lets the flour hydrate fully. For breads and cakes, bakers usually blend buckwheat with wheat flour, or rely on eggs, psyllium or other binders. If you are baking for someone with coeliac disease, check that the flour is certified gluten-free: naturally gluten-free seeds can be contaminated with wheat during milling and packing.',
        ],
      },
      {
        heading: 'Sourdough and storing flour',
        paragraphs: [
          'A sourdough starter is a culture of wild yeasts and lactic acid bacteria kept alive with regular feeds of flour and water. It raises bread more slowly than commercial yeast and gives it a tangy flavour. Store flour airtight in a cool, dry place. Whole-grain and buckwheat flours contain natural oils that can turn rancid, so buy amounts you will use within a few months, or keep them in the fridge in hot weather.',
        ],
      },
    ],
    faqs: [
      { q: 'Is buckwheat flour gluten-free?', a: 'Buckwheat itself contains no gluten; it is a seed, not a type of wheat. Flour can still be cross-contaminated if it is milled or packed alongside wheat, so anyone with coeliac disease should choose flour that is certified gluten-free.' },
      { q: 'What is kuttu ka atta?', a: 'It is the Hindi name for buckwheat flour. It is widely used in North India during Navratri and other fasts, for puris, pakoras and parathas, because buckwheat is not a cereal grain.' },
      { q: 'Can I replace wheat flour with buckwheat flour?', a: 'Not one for one in yeasted breads and cakes, because buckwheat cannot form gluten. Try swapping a fifth to a third of the wheat flour, or use buckwheat on its own in pancakes, galettes and blini.' },
      { q: 'How should I store speciality flours?', a: 'Airtight, in a cool, dry, dark place. Whole-grain and buckwheat flours keep for less time than refined flour because of their natural oils, so refrigerate them in hot weather and use them within a few months.' },
    ],
  },
  {
    ...link('spices-salt'),
    title: 'Flaky Sea Salt & Whole Spices in India: A Guide | COCO36',
    description: 'Finishing salt, flaky sea salt and whole spices: how they are made, how to use them and how to keep them fresh. A practical guide for Indian kitchens.',
    eyebrow: 'Ingredient guide · Spices & salt',
    h1: 'Spices and salt: the finishing touches',
    intro: [
      'Salt and spices are the smallest quantities in most recipes, and often the ones you notice most. How a salt was made changes its texture and how it dissolves; how a spice was stored decides whether it still has any aroma. This guide covers both.',
    ],
    sections: [
      {
        heading: 'How salt is made',
        paragraphs: [
          'All culinary salt is mostly sodium chloride, but it reaches the kitchen in very different forms. Sea salt is made by evaporating seawater, either in shallow pans warmed by sun and wind or by heating brine. Rock salt is mined from ancient underground deposits. Most of India’s salt comes from the coastal salt pans of Gujarat and the Rann of Kutch. Indian kitchens also use kala namak, a kiln-fired rock salt with a distinctive sulphurous aroma that is essential to chaat masala.',
        ],
      },
      {
        heading: 'Flaky sea salt',
        paragraphs: [
          'Flaky salt forms when brine is heated gently, so that crystals grow at the surface as thin, hollow pyramids. The flakes are light and crunchy and dissolve quickly on the tongue, which is why they are used as a finishing salt: scattered over food just before serving rather than stirred into the pot. Maldon, a town on England’s Essex coast, has made salt this way for well over a century, and its name has become shorthand for the style.',
        ],
      },
      {
        heading: 'Using finishing salt',
        paragraphs: [
          'A few flakes on salted caramel, a chocolate tart, cookies, a sourdough crust, sliced tomatoes or a grilled steak add small bursts of salinity and crunch. Flakes are bulky, so a teaspoon of flaky salt weighs much less than a teaspoon of fine salt. Weigh salt for doughs and brines rather than measuring it by volume, and save the flakes for the top.',
        ],
      },
      {
        heading: 'Whole spices, and true cinnamon',
        paragraphs: [
          'India is the world’s largest producer, consumer and exporter of spices, and many Indian kitchens already buy them whole. That is the best way to keep their flavour, because the aromatic oils that give spices their character fade quickly once they are ground. Some names also hide different plants. True, or Ceylon, cinnamon (Cinnamomum verum) is grown mainly in Sri Lanka and has thin, papery, layered quills and a delicate flavour. Much of the dalchini sold in India is cassia, a related species with thicker bark and a stronger, more pungent taste.',
        ],
      },
      {
        heading: 'Keeping spices fresh',
        paragraphs: [
          'Store spices in airtight jars away from the stove, sunlight and steam. Toast whole spices in a dry pan just until fragrant, then grind them as you need them. Ground spices are best used within a few months, while whole spices keep their aroma much longer. If a spice has lost its smell, it has lost its flavour too.',
        ],
      },
    ],
    faqs: [
      { q: 'What is the difference between flaky sea salt and table salt?', a: 'Table salt is fine and dense and dissolves evenly, which suits cooking and baking. Flaky sea salt has large, light, hollow crystals that stay crunchy on the surface of food, so it is used to finish dishes rather than to season them during cooking.' },
      { q: 'Can I bake with flaky sea salt?', a: 'Yes, but measure it by weight, because flakes are much less dense than fine salt. Many bakers use fine salt in the dough and keep flaky salt for sprinkling on top.' },
      { q: 'How long do whole spices keep?', a: 'Stored airtight and away from heat and light, whole spices keep their aroma far longer than ground ones. Smell them: if the aroma is faint, the flavour will be too.' },
      { q: 'Is Ceylon cinnamon the same as dalchini?', a: 'Not always. Ceylon cinnamon (Cinnamomum verum) has thin, papery, layered quills and a mild, sweet flavour. Much of what is sold as dalchini in India is cassia, a related species with thick, hard bark and a stronger flavour.' },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

/** Delivery + returns answer, built from live store policy so it never drifts. */
export function deliveryFaq(policy: StorePolicy = DEFAULT_POLICY): Faq {
  return {
    q: 'Do you deliver across India?',
    a: `Yes. We ship across India. Orders are usually dispatched within ${businessDayPhrase(dispatchWindow(policy))}, through ${COURIER_PARTNERS}, to serviceable pincodes. Shipping is free on orders of ${rupees(policy.freeShippingPaise)} or more and ${rupees(policy.flatShippingPaise)} below that. If an item arrives damaged, wrong, missing or expired, tell us within ${policy.returnWindowDays} days of delivery.`,
  };
}

/** The guide's FAQ list as rendered (guide-specific + delivery). */
export function guideFaqs(g: Guide, policy?: StorePolicy): Faq[] {
  return [...g.faqs, deliveryFaq(policy)];
}
