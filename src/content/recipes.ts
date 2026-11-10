/**
 * /recipes and the first three baking recipes.
 * Wording is the batch-1 draft. Shop-opening dates, prices and the draft's
 * image notes are not page copy. There is no original photo yet, so Recipe
 * JSON-LD omits image.
 *
 * RECIPES_PUBLISH_DATE is the batch date (10 November 2026). It is the
 * visible publish line and Recipe datePublished. Replace it if the live
 * date is different.
 */

export const RECIPES_PUBLISH_DATE = '2026-11-10';
/** Visible form of RECIPES_PUBLISH_DATE. Kept here so the page does not import the guides module. */
export const RECIPES_PUBLISH_LABEL = '10 November 2026';

export const RECIPES_HUB_PATH = '/recipes';

export interface RecipeLink {
  href: string;
  label: string;
  /** Trailing clause from the draft, after the link. */
  suffix?: string;
}

export interface IngredientGroup {
  heading: string;
  items: string[];
  /** The 1:1 ganache list is visible, and is not a second Recipe ingredient list. */
  inSchema: boolean;
}

export interface RecipeFact {
  label: string;
  value: string;
}

export interface RecipeDoc {
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  opening: string;
  facts: RecipeFact[];
  groups: IngredientGroup[];
  /** Paragraphs under the ingredient lists. The brownie tin line is also a schema ingredient. */
  afterIngredients: string[];
  schemaExtras: string[];
  steps: string[];
  tips: string[];
  related: RecipeLink[];
  prepTime: string;
  cookTime: string;
  totalTime: string;
  recipeYield: string[];
}

export interface RecipesHub {
  path: string;
  title: string;
  description: string;
  h1: string;
  crumb: string;
  intro: string[];
}

export const RECIPES_HUB: RecipesHub = {
  path: RECIPES_HUB_PATH,
  title: 'Baking Recipes for Indian Kitchens | COCO36',
  description: 'Metric baking recipes for Indian kitchens: Dutch-process cocoa brownies, dark couverture ganache and pistachio frangipane, with warm-kitchen notes.',
  h1: 'Baking recipes for Indian kitchens',
  crumb: 'Recipes',
  intro: [
    'These recipes are written in metric weights for home bakers in India, with notes for a warm kitchen. This first batch covers a fudgy Dutch-process cocoa brownie, a dark couverture ganache for truffles or a tart filling, and a pistachio frangipane made with unsweetened pistachio paste — for tarts or twice-baked croissants.',
    'They are standard methods, not a claim that COCO36 has tested every batch. Weigh the ingredients, read the pack in your hand, and treat oven times as a starting point: home ovens vary, and a warm room will change how chocolate sets. For the ingredient choices behind the recipes, see the [guides](/guides), especially [natural (non-alkalised) vs Dutch-process cocoa](/guides/natural-vs-dutch-cocoa), [couverture vs compound](/guides/couverture-vs-compound) and [pistachio paste](/guides/pistachio-paste-dubai-chocolate-at-home). Dutch-process cocoa, couverture and pistachio paste are coming soon to the COCO36 shop.',
  ],
};

const TIN_LINE = 'Plus a little extra butter or a drop of oil, and baking paper, for the tin.';

export const RECIPES: RecipeDoc[] = [
  {
    slug: 'fudgy-dutch-cocoa-brownies',
    path: '/recipes/fudgy-dutch-cocoa-brownies',
    title: 'Fudgy Dutch-Process Cocoa Brownies | COCO36',
    description: 'A fudgy brownie with Dutch-process cocoa, written in metric weights, with tips for a warm Indian kitchen.',
    h1: 'Fudgy Dutch-process cocoa brownies',
    opening: 'These fudgy brownies are made with Dutch-process cocoa, butter, sugar and a modest amount of maida, so the crumb stays dense and chocolate-forward rather than like a cocoa cake.',
    facts: [
      { label: 'Yield', value: '16 squares (one 20 cm / 8 inch square tin)' },
      { label: 'Prep time', value: '15 minutes' },
      { label: 'Cook time', value: '25 minutes' },
      { label: 'Cooling', value: 'at least 30 minutes before cutting' },
      { label: 'Total time', value: 'about 1 hour 10 minutes, including cooling' },
    ],
    groups: [
      {
        heading: 'Ingredients (weigh everything)',
        inSchema: true,
        items: [
          '140 g unsalted butter',
          '200 g caster sugar',
          '65 g unsweetened Dutch-process cocoa powder, sifted',
          '2 large eggs (about 100 g without the shell), at room temperature',
          '5 g vanilla extract',
          '70 g maida (all-purpose flour)',
          '3 g fine salt',
          '2 g instant coffee or espresso powder (optional, to deepen the cocoa flavour)',
          '80 g chopped dark chocolate or walnut halves (optional)',
        ],
      },
    ],
    afterIngredients: [
      TIN_LINE,
      'Dutch-process cocoa is coming soon to the COCO36 shop. Until then, use an unsweetened Dutch-process cocoa you can already buy, and read the pack. Do not swap in natural (non-alkalised) cocoa and expect the same colour or flavour; the difference is explained in [natural (non-alkalised) vs Dutch-process cocoa](/guides/natural-vs-dutch-cocoa). For how cocoa is made, see [cocoa and chocolate](/ingredients/cocoa-chocolate).',
    ],
    schemaExtras: [TIN_LINE],
    steps: [
      'Heat the oven to 175°C (or 160°C if your oven is fan-assisted). Line a 20 cm square tin with baking paper, leaving an overhang so you can lift the slab out later, and lightly grease the paper.',
      'Melt the butter in a saucepan over low heat, or in short bursts in a microwave, until just liquid. Take it off the heat.',
      'Whisk in the caster sugar, sifted cocoa, salt and optional coffee powder until the mixture is smooth and looks slightly glossy. Let it stand for 2 or 3 minutes so it is warm, not hot.',
      'Whisk in the eggs one at a time, then the vanilla, until the batter is thick and even. Do not beat in a lot of air; this is a brownie, not a sponge.',
      'Fold in the flour until no dry patches remain. Fold in the chopped chocolate or walnuts, if using.',
      'Scrape the batter into the tin and smooth the top. Bake for 22–28 minutes, until the edges are set and a skewer in the centre comes out with a few moist crumbs, not wet batter. If the centre is still shiny and liquid, give it a few more minutes and check again.',
      'Cool in the tin for at least 30 minutes, then lift out and cut into 16 squares. The texture settles as it cools; cutting too early will smear the crumb.',
    ],
    tips: [
      'If the butter-and-cocoa mixture is still hot when the eggs go in, it can scramble. Wait until it is only warm to the touch.',
      'In a humid room the batter can look looser than you expect. Trust the weights, not a memory of a stiffer batter from a cooler kitchen.',
      'Cool the brownies completely before boxing them as a gift, so steam does not soften the crust.',
      'Store airtight, at cool room temperature, for two to three days, or refrigerate in warm weather and bring back to room temperature to eat.',
    ],
    related: [
      { href: '/guides/natural-vs-dutch-cocoa', label: 'Natural (non-alkalised) vs Dutch-process cocoa' },
      { href: '/ingredients/cocoa-chocolate', label: 'Cocoa and chocolate' },
      { href: '/guides/christmas-chocolate-baking', label: 'Chocolate and cocoa for Christmas baking' },
      { href: '/recipes/dark-couverture-ganache', label: 'Dark couverture ganache', suffix: ', if you want a thin glaze on top' },
    ],
    prepTime: 'PT15M',
    cookTime: 'PT25M',
    totalTime: 'PT1H10M',
    recipeYield: ['16 squares'],
  },
  {
    slug: 'dark-couverture-ganache',
    path: '/recipes/dark-couverture-ganache',
    title: 'Dark Couverture Ganache for Truffles or Tarts | COCO36',
    description: 'A dark couverture ganache in two ratios: firm for truffles or a tart filling, softer for a glaze, with tips for a warm kitchen.',
    h1: 'Dark couverture ganache for truffles or a tart filling',
    opening: 'This dark couverture ganache is a simple emulsion of chocolate and cream: use two parts chocolate to one part cream, by weight, for truffles or a firm tart filling, and equal weights for a softer glaze.',
    facts: [
      { label: 'Yield', value: 'about 300 g ganache — enough for 20–24 small truffles, or to fill one 18–20 cm tart with a modest layer' },
      { label: 'Prep time', value: '15 minutes' },
      { label: 'Cook time', value: '5 minutes' },
      { label: 'Chilling', value: '2 hours for truffles or a sliceable tart filling' },
      { label: 'Total time', value: 'about 2 hours 20 minutes, including chilling' },
    ],
    groups: [
      {
        heading: 'Ingredients (firm, 2:1 — truffles or tart filling)',
        inSchema: true,
        items: [
          '200 g dark couverture chocolate, 55–70% cocoa, in callets or finely chopped',
          '100 g fresh cream',
          '15 g unsalted butter, at room temperature (optional, for a slightly softer set)',
          '1 g fine salt (optional)',
        ],
      },
      {
        heading: 'Ingredients (softer, 1:1 — glaze or a looser filling)',
        inSchema: false,
        items: [
          '200 g dark couverture chocolate, 55–70% cocoa, in callets or finely chopped',
          '200 g fresh cream',
          '15 g unsalted butter, optional',
          '1 g fine salt, optional',
        ],
      },
    ],
    afterIngredients: [
      'Use couverture, not compound. Couverture is cocoa-butter chocolate and emulsifies more reliably in a ganache; compound uses a different principal fat. See [couverture vs compound](/guides/couverture-vs-compound) and the [2027 couverture buying guide](/guides/best-couverture-chocolate-india) for how to read a pack. COCO36 couverture is coming soon to the COCO36 shop.',
      'Fresh cream sold in India is often lower in fat than the “heavy cream” or “double cream” in many imported recipes, so a 2:1 ganache may set a little softer than those recipes describe. If it will not hold for rolling, use slightly less cream next time, or chill it longer. There is no need to invent a fat percentage for the carton in your fridge — read the pack.',
    ],
    schemaExtras: [],
    steps: [
      'Put the chocolate in a dry, heatproof bowl. If you are using a bar or a block, chop it into small, even pieces so it melts at the same rate as the cream cools.',
      'Heat the cream in a small saucepan over medium-low heat until it is just at a simmer — small bubbles at the edge, not a rolling boil. If you have a thermometer, take it off the heat around 80–85°C; hotter cream can split the cocoa butter.',
      'Pour the hot cream over the chocolate and leave it undisturbed for 2 minutes, so the heat can reach the centre.',
      'Stir from the middle of the bowl, in small circles, until the mixture becomes a smooth, glossy ganache. If a few pieces remain, stand the bowl over a pan of barely simmering water and stir gently until they melt. Do not let the bowl sit in a fierce heat.',
      'Stir in the butter and salt, if using, until they disappear. If the ganache looks split or oily, let it cool for a minute, then stir in a spoon of cold cream, or blend briefly with a stick blender kept under the surface so you do not beat in air.',
      'For a tart filling or a glaze, pour the ganache while it is still fluid. For truffles, press a piece of baking paper or a lid onto the surface and refrigerate until firm enough to scoop, about 2 hours.',
      'To finish truffles, scoop small even portions (about 10–12 g), roll them quickly between cool hands, and coat in Dutch-process cocoa, finely chopped nuts or desiccated coconut. Work in small batches and return the bowl to the fridge if the ganache softens. For a chocolate shell, dip the chilled truffles in tempered couverture (see the couverture guides); compound can be used for a coating that sets without tempering, but it is not the same material.',
    ],
    tips: [
      'Make ganache in the coolest room you have, preferably in the morning.',
      'A warm bowl and warm hands will keep a 2:1 ganache from holding its shape. Chill the bowl, and rinse your hands in cold water and dry them before rolling.',
      'Store finished truffles in an airtight box in the fridge, and bring them out shortly before serving or packing. For gifting, use a firm box and a cool bag; do not leave them in a hot car.',
      'If you refrigerate leftover ganache, let it come back towards cool room temperature before you try to re-whip or spread it, so it does not break.',
    ],
    related: [
      { href: '/guides/couverture-vs-compound', label: 'Couverture vs compound' },
      { href: '/guides/best-couverture-chocolate-india', label: 'Best couverture chocolate brands in India' },
      { href: '/ingredients/cocoa-chocolate', label: 'Cocoa and chocolate' },
      { href: '/guides/christmas-chocolate-baking', label: 'Chocolate and cocoa for Christmas baking' },
      { href: '/recipes/fudgy-dutch-cocoa-brownies', label: 'Fudgy Dutch-process cocoa brownies' },
    ],
    prepTime: 'PT15M',
    cookTime: 'PT5M',
    totalTime: 'PT2H20M',
    recipeYield: ['300 grams', '20 to 24 small truffles'],
  },
  {
    slug: 'pistachio-frangipane',
    path: '/recipes/pistachio-frangipane',
    title: 'Pistachio Frangipane with Unsweetened Paste | COCO36',
    description: 'A pistachio frangipane made with unsweetened pistachio paste, for tarts or twice-baked croissants, written in metric weights.',
    h1: 'Pistachio frangipane with unsweetened pistachio paste',
    opening: 'This pistachio frangipane is a classic butter, sugar and egg filling made with unsweetened pistachio paste, so you control the sweetness, and it can be baked in a tart shell or inside a twice-baked croissant.',
    facts: [
      { label: 'Yield', value: 'about 450 g filling — enough for one 22 cm tart, or 10–12 croissant fillings (about 35–40 g each)' },
      { label: 'Prep time', value: '20 minutes' },
      { label: 'Cook time', value: '30 minutes for a tart; 15 minutes for filled croissants' },
      { label: 'Total time', value: 'about 50 minutes for a tart, plus the time to bake or rest a pastry shell; about 35 minutes for croissants made with baked pastry' },
    ],
    groups: [
      {
        heading: 'Ingredients (weigh everything)',
        inSchema: true,
        items: [
          '100 g unsalted butter, soft but not melted',
          '100 g caster sugar',
          '100 g unsweetened pistachio paste',
          '2 large eggs (about 100 g without the shell), at room temperature',
          '40 g maida (all-purpose flour)',
          '1 g fine salt',
          '5 g vanilla extract, or the finely grated zest of a small piece of orange (optional)',
          '30 g slivered or roughly chopped pistachios, for topping (optional)',
        ],
      },
    ],
    afterIngredients: [
      'To bake it, you will also need either one 22 cm tart shell (blind-baked until just set and pale gold) or 10–12 baked croissants, ideally a day old, and a little sugar syrup if you are refreshing the croissants.',
      'Pistachio paste should be unsweetened ground pistachios. Pistachio cream usually adds sugar and often other fats or milk, and it is not a gram-for-gram stand-in. Read the label. The difference, and how to use paste in viennoiserie, is in [pistachio paste for baking](/guides/pistachio-paste-dubai-chocolate-at-home). Pistachio paste is coming soon to the COCO36 shop, and it will not be sold as cream.',
      'If the only jar you have is a sweetened cream, this formula will be too sweet and probably looser. Do not use this recipe as a 1:1 swap; cut the caster sugar and expect a different set, or wait for an unsweetened paste.',
    ],
    schemaExtras: [],
    steps: [
      'Beat the soft butter and caster sugar together until the mixture is pale and creamy. All of the ingredients should be at room temperature; cold eggs or cold paste will make the filling split and look greasy.',
      'Beat in the unsweetened pistachio paste until the bowl is smooth and even.',
      'Add the eggs one at a time, beating well after each one. If the mixture looks slightly curdled, it is usually because something was still cold; keep beating, and it will often come back together when the flour goes in.',
      'Mix in the salt and the optional vanilla or orange zest. Fold in the flour until it disappears. Do not overmix.',
      'For a neater pipe, cover the surface and refrigerate the frangipane for 30–60 minutes, until it is scoopable but still soft enough to spread.',
      '**For a tart:** spread the filling in an even layer in the blind-baked 22 cm shell. Scatter the chopped pistachios on top, if using. Bake at 175°C (160°C fan) for 25–30 minutes, until the filling is puffed, lightly golden at the edges, and just set in the centre — it should feel softly springy, not wet. Cool before slicing.',
      '**For twice-baked croissants:** heat the oven to 170°C (160°C fan). Split each croissant horizontally, leaving a hinge if you can. Brush the cut sides with a little sugar syrup if the pastries are dry. Pipe or spread about 25 g of frangipane inside, close the croissant, then pipe or spread another 10–15 g on top and add a few slivered pistachios. Bake for 12–16 minutes, until the topping is set and lightly golden and the pastry has crisped. Cool slightly before serving.',
    ],
    tips: [
      'In a warm kitchen the butter can slump and the filling can look oily. If that happens, chill the bowl for 10 minutes and beat again, rather than adding more flour.',
      'Chill the frangipane before piping on a hot afternoon, or it will run out of the croissant in the oven.',
      'A pistachio frangipane should be baked until set; it is not eaten raw. Do not underbake the centre to keep it “moist.”',
      'Refrigerate leftover filling, well covered, for up to two days, or freeze it for later. Bring it back towards a spreadable temperature before using.',
    ],
    related: [
      { href: '/guides/pistachio-paste-dubai-chocolate-at-home', label: 'Pistachio paste for baking, gelato, viennoiserie and mithai' },
      { href: '/ingredients/vanilla', label: 'Vanilla', suffix: ', if you use the extract' },
      { href: '/guides/couverture-vs-compound', label: 'Couverture vs compound', suffix: ', if you later pair the tart with a chocolate glaze' },
      { href: '/recipes/dark-couverture-ganache', label: 'Dark couverture ganache' },
      { href: '/guides', label: 'Guides hub' },
    ],
    prepTime: 'PT20M',
    cookTime: 'PT30M',
    totalTime: 'PT50M',
    recipeYield: ['450 grams', '1 tart (22 cm) or 10 to 12 filled croissants'],
  },
];

/** Weighed ingredients that belong in Recipe.recipeIngredient, in page order. */
export function schemaIngredients(recipe: RecipeDoc): string[] {
  return [
    ...recipe.groups.filter((group) => group.inSchema).flatMap((group) => group.items),
    ...recipe.schemaExtras,
  ];
}

export function recipeBySlug(slug: string): RecipeDoc | undefined {
  return RECIPES.find((recipe) => recipe.slug === slug);
}

export function recipeByPath(pathname: string): RecipeDoc | undefined {
  return RECIPES.find((recipe) => recipe.path === pathname);
}

/** Index list, in the draft's order. Labels are the index link text, not every H1. */
export const RECIPE_INDEX_LINKS: RecipeLink[] = [
  { href: '/recipes/fudgy-dutch-cocoa-brownies', label: 'Fudgy Dutch-process cocoa brownies' },
  { href: '/recipes/dark-couverture-ganache', label: 'Dark couverture ganache' },
  { href: '/recipes/pistachio-frangipane', label: 'Pistachio frangipane' },
];
