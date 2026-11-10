/**
 * /guides, the December Ingredient Notes cluster, and the couverture buying guide.
 * The wording is the drafted copy. Bracketed [CONFIRM] lines on untested
 * kitchen steps are omitted and are not in the FAQ or JSON-LD either.
 * Image suggestions and the draft's JSON-LD blocks are metadata, not body copy.
 *
 * Existing family guides stay at /ingredients/<slug>. This module does not
 * replace them. The hub links each one.
 */

/**
 * PLACEHOLDER publish date for /guides/best-couverture-chocolate-india.
 * Rohan replaces this single value at preview. It is both the visible date
 * and Article datePublished. Format: YYYY-MM-DD.
 */
export const COUVERTURE_BUYING_GUIDE_PUBLISH_DATE = '2026-11-10';

const PUBLISH_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

/** Visible date for a YYYY-MM-DD publish constant. No timezone shift. */
export function formatPublishDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const month = match ? PUBLISH_MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || !month || Number(match[3]) < 1) throw new Error(`publish date must be YYYY-MM-DD: ${iso}`);
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export type NoteBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'h3'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface NoteSection {
  heading?: string;
  blocks: NoteBlock[];
}

export interface NoteLink { href: string; label: string }
export interface NoteFaq { q: string; a: string }

export interface NoteRecipe {
  name: string;
  description: string;
  recipeCuisine: string;
  recipeCategory: string;
  recipeYield: string;
  ingredients: string[];
  steps: string[];
}

export interface BakingNote {
  path: string;
  /** <title> from the draft seo_title. */
  title: string;
  /** Meta description from the draft. */
  description: string;
  /** Article JSON-LD description. Matches the draft JSON-LD, which can differ from the meta description. */
  schemaDescription: string;
  h1: string;
  /** Short breadcrumb label. The hub is "Guides". */
  crumb: string;
  updated: string;
  /**
   * ISO YYYY-MM-DD. When set, this is the visible publish date and Article
   * datePublished. Leave unset on notes that do not show a publish date.
   */
  published?: string;
  sections: NoteSection[];
  faqs: NoteFaq[];
  related: NoteLink[];
  recipe?: NoteRecipe;
}

// Recipe JSON-LD uses this list. The visible ingredient list also shows a
// cooking-fat line, but the draft marked that amount [CONFIRM] and gave no
// weight, so it stays out of structured data.
const pistachioIngredients = [
  '120 g kataifi (kunafa) pastry, thawed if frozen',
  '100 g **100% unsweetened pistachio paste** (verified label)',
  '32 g white chocolate, melted (optional but matches the pure-paste reference style)',
  '10 g tahini (optional)',
  'Extra icing sugar only if your trial needs it after tasting the white-chocolate version',
  'Pinch of salt',
  '300–350 g dark or milk **couverture** for the shell (temper per manufacturer; compound is a different product)',
];

const pistachioSteps = [
  '**Toast kataifi** in fat until deep golden and crisp; **cool fully**. Soft pastry is the usual failure.',
  '**Build filling:** stir paste with melted white chocolate (if using), tahini and salt; fold in cooled kataifi. Film honesty: if white chocolate is in the mix, show it — pure paste alone did not create a sweetened filling.',
  '**Shell:** temper couverture; line a bar mould; chill briefly until just set.',
  '**Fill and cap;** tap out bubbles; set; unmould.',
  'Serve cool room temperature. No borrowed shelf-life claims.',
];

export const BAKING_NOTES: BakingNote[] = [
  {
    path: '/guides',
    title: 'Baking Ingredient Guides for India | COCO36',
    description: 'COCO36 ingredient guides for Indian bakers — couverture vs compound, natural vs Dutch cocoa, and pistachio paste for baking, gelato and mithai.',
    schemaDescription: 'COCO36 ingredient guides for Indian bakers — couverture vs compound, natural vs Dutch cocoa, and pistachio paste for baking, gelato and mithai.',
    h1: 'Ingredient guides',
    crumb: 'Guides',
    updated: '2026-11-10',
    sections: [
      {
        blocks: [
          { type: 'p', text: 'These guides help Indian bakers choose couverture versus compound chocolate, natural (non-alkalised) versus Dutch-process cocoa, and unsweetened pistachio paste versus cream for baking, gelato, viennoiserie, entremets and mithai. Short, practical notes from COCO36 for bakers and pastry cooks across India — how ingredients behave, how to read a label, and how to choose for the recipe. The writing stays crop-to-craft.' },
          { type: 'p', text: 'These three guides are the December **Ingredient Notes** cluster (Instagram link-in-bio destination once published and approved):' },
          { type: 'ol', items: [
            '**[Couverture vs compound chocolate: what Indian bakers should use](/guides/couverture-vs-compound)**\nCocoa-butter-rich couverture versus compound’s other fat matrix — comparison, not a universal winner.',
            '**[Natural (non-alkalised) vs Dutch-process cocoa powder: which one for your bake](/guides/natural-vs-dutch-cocoa)**\nAcidity, colour and leavening — darker is not automatically better.',
            '**[Pistachio paste for baking, gelato, viennoiserie and mithai](/guides/pistachio-paste-dubai-chocolate-at-home)**\nUnsweetened paste versus sweetened cream — for gelato, frangipane, entremets and mithai, with a Dubai-style bar as one method.',
          ] },
          { type: 'p', text: '**[Best couverture chocolate brands in India (2027 buying guide)](/guides/best-couverture-chocolate-india)**\nImported professional lines and Indian makers — cocoa percentage, format and the job, and how to tell couverture from compound. COCO36 couverture is coming soon to the COCO36 shop.' },
          { type: 'p', text: 'Also browse our longer [ingredient library](/ingredients) (vanilla, cocoa & chocolate, sugars & jaggery, flours, spices & salt) and the [shop](/shop).' },
          { type: 'p', text: 'New guides publish here first. Product pages for December heroes go live only when stock and copy are approved — guides never invent availability.' },
        ],
      },
    ],
    faqs: [],
    related: [
      { href: '/guides/couverture-vs-compound', label: 'Couverture vs compound' },
      { href: '/guides/natural-vs-dutch-cocoa', label: 'Natural (non-alkalised) vs Dutch' },
      { href: '/guides/pistachio-paste-dubai-chocolate-at-home', label: 'Pistachio paste' },
      { href: '/guides/best-couverture-chocolate-india', label: 'Couverture brands' },
      { href: '/ingredients', label: 'Ingredient library' },
      { href: '/shop', label: 'Shop' },
    ],
  },
  {
    path: '/guides/couverture-vs-compound',
    title: 'Couverture vs Compound Chocolate in India | COCO36',
    description: 'Couverture vs compound chocolate for Indian bakers: cocoa butter vs other fats, tempering, when to use each, and how to read a 1 kg pack.',
    schemaDescription: 'Couverture vs compound chocolate for Indian bakers: cocoa butter vs other fats, tempering, when to use each, and how to read a 1 kg pack.',
    h1: 'Couverture vs compound chocolate: what Indian bakers should use',
    crumb: 'Couverture vs compound',
    updated: '2026-11-10',
    sections: [
      {
        blocks: [
          { type: 'p', text: 'Couverture is cocoa-butter-rich chocolate; compound uses a different principal fat (usually other vegetable fats), which is why the two handle and taste differently even when the blocks look similar. Walk into any bakery supplier in India and you will meet two kinds of “chocolate for baking”: **couverture** and **compound**. They look similar in a block. They behave differently in a tempering bowl, on a moulded egg, or on a warm Indian kitchen counter in May.' },
          { type: 'p', text: 'This guide helps home bakers, pastry students and small kitchens choose a **fat system for the job**. It is not a blanket “compound is bad” verdict. At COCO36 we talk crop-to-craft: Rohan’s family farms in West Godavari, Andhra Pradesh, so heat, humidity and monsoon storage are part of the brief.' },
          { type: 'p', text: 'For pod-to-bar basics see [Cocoa & chocolate](/ingredients/cocoa-chocolate). Hub for this cluster: [Guides](/guides). Dark couverture is coming soon to the COCO36 shop. Until then, [browse the shop](/shop).' },
        ],
      },
      {
        heading: 'Couverture and compound, in one sentence each',
        blocks: [
          { type: 'p', text: '**Couverture** is real chocolate **rich in cocoa butter** (with cocoa mass, sugar, and sometimes milk or emulsifiers). Extra cocoa butter makes melted chocolate more fluid for thin coatings; when correctly tempered it sets with gloss and snap. Couverture is a **formulated** product — not a single ingredient, and not “100% cacao” unless the label literally says so.' },
          { type: 'p', text: '**Compound chocolate** (often “cooking chocolate”, “coating chocolate” or compound slabs) uses a **different principal fat matrix** — typically other vegetable fats in place of most cocoa butter. It generally does not require classical tempering. It can be the right choice for volume work. It is not the same material as couverture.' },
          { type: 'p', text: 'Important nuance (from maker technical pages such as Valrhona on couverture and Barry Callebaut on compound coatings): **cocoa butter itself is a vegetable fat**. When we say compound uses “other vegetable fats,” we mean fats other than cocoa butter as the principal working fat — not a plant-versus-non-plant distinction. Compound **need not contain absolutely zero cocoa butter**; read the actual pack. Do not claim “zero cocoa butter” unless the label says so.' },
        ],
      },
      {
        heading: 'Why the difference matters in India',
        blocks: [
          { type: 'p', text: 'Compound is common in high-volume baking because it sets without tempering. Premium pastry, bean-to-bar makers and many café dessert counters use cocoa-butter chocolate and, where budgets allow, couverture for enrobing and moulded work.' },
          { type: 'ul', items: [
            'Compound: quick drips, school fudge, high-volume coated biscuits.',
            'Couverture: bonbons, thin shells, shiny glaze, ganache where cacao flavour matters.',
          ] },
          { type: 'p', text: 'Neither suits every job. On a menu or a reel, name the fat system you actually used.' },
        ],
      },
      {
        heading: 'How to read a 1 kg pack',
        blocks: [
          { type: 'p', text: 'When you compare **couverture chocolate price for 1 kg** listings, ignore the lifestyle photo and read:' },
          { type: 'ol', items: [
            '**Ingredients.** Couverture: cocoa mass / liquor, sugar, cocoa butter, maybe milk, lecithin, vanilla. Compound: sugar, named vegetable fats, cocoa solids or powder, emulsifiers.',
            '**Cocoa percentage (dark).** Usually cocoa mass + cocoa butter share. Higher % means less sugar and more intensity — not automatically better, and not a purity claim.',
            '**Fluidity / cocoa butter level** on maker sheets when available.',
            '**Origin story, if any.** Named Indian cacao vs blended vs unnamed fat.',
          ] },
          { type: 'p', text: 'Price for a baker’s 1 kg block varies with cocoa butter content, origin, brand and retail vs trade. Treat web “from ₹X/kg” quotes as supplier-specific, not a national average. Commodity cocoa futures are not the same as retail couverture.' },
          { type: 'p', text: 'Sources for definitions (not Coco36 specs): [Valrhona — Couverture chocolate](https://www.valrhona.com/en/l-ecole-valrhona/discover-l-ecole-valrhona/chocolate-terminology/couverture-chocolate); [Barry Callebaut — Compound coatings](https://www.barry-callebaut.com/en/trends-insights/compound-coatings-confectionery-bakery-pastry-biscuits-and-cereals); [Callebaut — Tempering](https://www.callebaut.com/en-US/callebaut-chocolate-academy/tutorials/tempering/how-to).' },
        ],
      },
      {
        heading: 'When to reach for couverture',
        blocks: [
          { type: 'p', text: 'Use couverture when you need tempered shells and moulds, thin even enrobing, clean cacao-forward ganache, or gloss and snap as part of the dessert’s identity. You will need correct tempering (see maker sheets), a cooler room than a summer terrace, and storage away from spice smells and monsoon damp.' },
        ],
      },
      {
        heading: 'When compound fits the job',
        blocks: [
          { type: 'p', text: 'Use compound when you coat hundreds of pieces without tempering, the kitchen sits hot, guest expectation is “chocolate flavour and a set coating,” or cost per kilogram must stay in a volume-bakery band. Compound can snap too when handled per its supplier — **snap is not proof of which fat is inside**.' },
        ],
      },
      {
        heading: 'Practical guidance: a side-by-side bake-bench comparison',
        blocks: [
          { type: 'p', text: 'Phrase this as **kitchen guidance you can log yourself**, not as a scored lab result. A single brownie **cannot isolate fat effect** from sugar, cocoa solids and full formulation differences.' },
          { type: 'p', text: '**Protocol (aligns with our Ingredient Notes reel demo):**' },
          { type: 'ol', items: [
            'Choose a tested chocolate brownie formula. Swap **only equal mass** of dark couverture vs dark compound; keep every other mass, pan, depth and bake programme constant. Match sugar and cocoa content as closely as practical, and **disclose remaining differences**.',
            'Read both ingredient panels; underline cocoa butter vs the named other fat.',
            'Optional separate tests: small ganaches from a **trial starting ratio** (for example 2:1 chocolate:cream by mass — adjust if a compound separates); equal-thickness snap tiles using each supplier’s correct process; equal melt samples under a shared safe warming programme. Log temperatures. No universal “melts faster” claim without your measured log.',
            'Taste cooled brownies side by side. **Do not pre-script a winner.** If they look similar, say so.',
          ] },
          { type: 'p', text: 'Write the batch log. That notebook line beats any influencer verdict.' },
        ],
      },
      {
        heading: 'Ganache caveat',
        blocks: [
          { type: 'p', text: 'Ganache is its own application test. A trial starting ratio such as 2:1 chocolate to cream by mass may work cleanly with one couverture and seize or separate with a compound that carries a different fat and emulsifier package. Report what happens; do not publish a single ratio as interchangeable across fat systems. Brownie batter does not need tempering; moulded shells do.' },
        ],
      },
      {
        heading: 'Tempering and Indian weather',
        blocks: [
          { type: 'p', text: 'Properly tempered chocolate has gloss, snap and clean mould release (Callebaut tempering guidance). Thickness and process also affect snap. Temper for tiles and moulding — not as an unnecessary step for brownie batter.' },
          { type: 'p', text: 'In summer heat: work early or in AC; keep moulds dry; prefer a cool pantry over the fridge (condensation → sugar bloom). Summer couverture shipments need care in the heat. Compound coatings are often chosen when a set coating has to travel.' },
        ],
      },
      {
        heading: 'Indian cacao and couverture',
        blocks: [
          { type: 'p', text: 'India grows cacao mainly in Andhra Pradesh, Kerala, Karnataka and Tamil Nadu, often as shade intercrop. When you buy **couverture chocolate in India**, ask whether the cacao is Indian, blended or imported, and what the principal fat is. Those answers beat the pouch photo.' },
        ],
      },
      {
        heading: 'Coming soon',
        blocks: [
          { type: 'p', text: 'Dark couverture is coming soon to the COCO36 shop. Until then:' },
          { type: 'ul', items: [
            '[Cocoa & chocolate](/ingredients/cocoa-chocolate)',
            '[Guides hub](/guides)',
            '[Browse the shop](/shop)',
          ] },
          { type: 'p', text: 'Couverture is a recipe of cocoa ingredients and sugar, not a single-ingredient cacao. This page does not give a fat percentage, a cocoa percentage, or an origin for COCO36 couverture.' },
        ],
      },
    ],
    faqs: [
      { q: 'Is compound chocolate the same as couverture?', a: 'No. Couverture is cocoa-butter-rich real chocolate. Compound’s principal fat matrix differs (typically other vegetable fats). Always read the label — some compounds may still list a little cocoa butter.' },
      { q: 'Can I temper compound like couverture?', a: 'Classical cocoa-butter tempering generally does not apply the same way. Manufacturers note compounds generally do not require tempering. Follow the supplier sheet.' },
      { q: 'Why does a 1 kg couverture block often cost more?', a: 'Cocoa butter is costly relative to many bakery coating fats, and higher-fluidity couverture uses more of it. Origin and brand also move price. Compare ingredients, not only the sticker.' },
      { q: 'Does a clean snap prove I bought couverture?', a: 'No. Thickness, process and compound formulations can also snap. Snap is a handling result, not a purity test.' },
      { q: 'Does couverture need a fridge in Indian summers?', a: 'Usually a cool, dry, airtight pantry is kinder. Fridge humidity causes condensation and sugar bloom.' },
      { q: 'Will COCO36 sell couverture?', a: 'It is coming soon to the COCO36 shop.' },
    ],
    related: [
      { href: '/guides', label: 'Guides hub' },
      { href: '/ingredients/cocoa-chocolate', label: 'Cocoa & chocolate' },
      { href: '/guides/natural-vs-dutch-cocoa', label: 'Natural (non-alkalised) vs Dutch' },
      { href: '/shop', label: 'Browse the shop' },
    ],
  },
  {
    path: '/guides/natural-vs-dutch-cocoa',
    title: 'Natural (Non-Alkalised) vs Dutch Cocoa | COCO36',
    description: 'Natural (non-alkalised) vs Dutch-process cocoa for cakes and hot chocolate in India — acidity, colour, soda vs powder, and how to choose.',
    schemaDescription: 'Natural (non-alkalised) vs Dutch-process cocoa for cakes and hot chocolate in India — acidity, colour, soda vs powder, and how to choose.',
    h1: 'Natural (non-alkalised) vs Dutch-process cocoa powder: which one for your bake',
    crumb: 'Cocoa powder',
    updated: '2026-11-10',
    sections: [
      {
        blocks: [
          { type: 'p', text: 'Natural (non-alkalised) cocoa is more acidic; Dutch-process (alkalised) cocoa has reduced acidity, which changes colour, flavour, and how the powder interacts with baking soda or baking powder. Cocoa powder looks simple: a brown pouch next to the maida. In the bowl it is not. **Natural (non-alkalised)** and **Dutch-process** (alkalised) cocoa taste different, colour differently, and change how a batter’s **acid / leavener balance** behaves.' },
          { type: 'p', text: '**Dark colour doesn’t tell you everything.** A darker spoon is not a universal flavour or quality ranking.' },
          { type: 'p', text: 'COCO36 comes at cocoa from farm and pastry: Rohan’s roots are in a West Godavari farming family. Wider cacao story: [Cocoa & chocolate](/ingredients/cocoa-chocolate). Cluster hub: [Guides](/guides). Dutch-process cocoa is coming soon to the COCO36 shop.' },
        ],
      },
      {
        heading: 'What cocoa powder is',
        blocks: [
          { type: 'p', text: 'After fermentation, drying, roasting and grinding into cocoa mass, pressing removes cocoa butter; the cake is milled into powder. “Unsweetened cocoa powder” means this ingredient — not a sweetened drinking mist.' },
        ],
      },
      {
        heading: 'Natural (non-alkalised) cocoa powder',
        blocks: [
          { type: 'p', text: 'Natural (non-alkalised) cocoa is not treated with an alkali. It is often lighter to medium brown, sharper and more acidic, and can contribute acid that **baking soda** needs in some formulas.' },
        ],
      },
      {
        heading: 'Dutch-process (alkalised) cocoa',
        blocks: [
          { type: 'p', text: 'Dutch-process cocoa is treated with an alkaline solution that **reduces acidity**, generally darkens colour and alters flavour (practical bakery references such as [King Arthur — Dutch-process vs natural (non-alkalised) cocoa](https://www.kingarthurbaking.com/blog/2020/07/15/dutch-process-vs-natural-cocoa)). It is often milder and disperses well in drinks. Many bakery sponges pair it with **baking powder**.' },
          { type: 'p', text: 'We do not publish fictitious pH meter readouts. Process direction is qualitative unless a supplier sheet gives a measured value for that batch.' },
        ],
      },
      {
        heading: 'Natural (non-alkalised) vs Dutch: useful pairs (not absolute laws)',
        blocks: [
          { type: 'table', headers: ['Situation', 'Often works', 'Caution'], rows: [
            ['Baking-powder-led chocolate cake', 'Either cocoa; Dutch common for darker crumb', 'Follow the whole tested formula'],
            ['Baking-soda-led cake that relies on cocoa’s acidity', 'Natural (non-alkalised) is the classic partner', 'Dutch can still work if **other acids** in the formula supply balance'],
            ['Hot chocolate / sauces', 'Dutch often mellower and easier to dissolve', 'Natural (non-alkalised) is fine if you whisk and accept a brighter taste'],
            ['“Darker = better chocolate” shopping', '—', 'Reject the shortcut'],
          ] },
          { type: 'p', text: '**Avoid the absolute rule** “natural (non-alkalised) cocoa always with soda / Dutch-process always with powder.” [King Arthur’s soda vs powder](https://www.kingarthurbaking.com/blog/2021/09/10/baking-soda-vs-baking-powder-substitutions) and [A-B-Cs of cocoa](https://www.kingarthurbaking.com/blog/2014/01/10/the-a-b-cs-of-cocoa) guidance: soda needs an acidic partner; powder brings its own acid/base system; cocoa is not the only possible acid. Do not import one blog’s substitution ratios as universal conversions.' },
        ],
      },
      {
        heading: 'Cocoa powder for cake and brownies',
        blocks: [
          { type: 'p', text: 'For **cocoa powder for cake** in Indian home kitchens:' },
          { type: 'ol', items: [
            'Read the leavener line before you buy the cocoa.',
            'Match colour expectation honestly — many “dark chocolate cake” photos use Dutch.',
            'Sift cocoa with flour; monsoon humidity clumps both types.',
            'In eggless cakes using vinegar + soda, natural (non-alkalised) cocoa adds to that acid system; swapping Dutch without adjusting acids can change rise — test a half batch.',
          ] },
          { type: 'p', text: 'Brownies are more forgiving on lift; taste and colour still shift with the swap.' },
        ],
      },
      {
        heading: 'Cocoa powder for hot chocolate',
        blocks: [
          { type: 'p', text: 'Dutch-process usually dissolves cooperatively and tastes less sharp in milk. Natural (non-alkalised) cocoa can taste brighter. Add sugar (or jaggery — see [sugars & jaggery](/ingredients/sugars-jaggery)) separately. Neither powder is a sweetened premix. Café hot chocolate sometimes starts from melted chocolate or ganache instead.' },
        ],
      },
      {
        heading: 'Fat percentage',
        blocks: [
          { type: 'p', text: 'Residual fat varies by press. Prefer similar fat contents when comparing two cocoas in a side-by-side bake and document differences. Read the fat percentage on the pack you buy.' },
        ],
      },
      {
        heading: 'Practical guidance: one powder-led recipe, two cocoas',
        blocks: [
          { type: 'p', text: 'Aligns with Ingredient Notes · 02: illustrate substitution in a **pre-tested baking-powder-led** mini-cake. This does **not** prove that Dutch cocoa “fails” with soda, and it does not isolate alkalisation from fat/roast/origin.' },
          { type: 'ol', items: [
            'Confirm both pouches are labelled natural (non-alkalised) vs Dutch-process by the supplier.',
            'Keep cocoa mass and every other ingredient fixed; bake matched tins together; cool equally.',
            'Compare colour, height, crumb and flavour. **No pre-written winner.**',
            'Teaching props: show soda and powder in separate dishes — not a fake chemical strip “lab value.”',
          ] },
          { type: 'p', text: 'If you later test a soda-led formula, change only one variable at a time and log it.' },
        ],
      },
      {
        heading: 'Eggless cakes and Indian pantry acids',
        blocks: [
          { type: 'p', text: 'Many Indian home bakers rely on eggless chocolate cakes that use vinegar, lemon juice, yoghurt or buttermilk with baking soda. Those liquids are **other acids** in the system. If your eggless formula already carries a clear acid, Dutch-process cocoa is not automatically disqualified — but you still need a tested balance. Change one variable at a time: swap only the cocoa first, bake, then decide whether soda or vinegar needs a nudge.' },
          { type: 'p', text: 'Curd-based cakes brown and tenderise differently from oil–vinegar cakes. Keep notes on which cocoa you used with which acid. That habit matters more than memorising a slogan.' },
        ],
      },
      {
        heading: 'Reading an Indian cocoa pouch',
        blocks: [
          { type: 'p', text: 'Packs sold as “cocoa powder,” “dutch cocoa,” “alkalised cocoa” or “natural (non-alkalised) cocoa” are not always explicit. Look for:' },
          { type: 'ul', items: [
            'The words **natural (non-alkalised)** or **Dutch-process / alkalised**',
            '“Unsweetened” vs sugar in the ingredients',
            'Any fat percentage on bakery-facing SKUs',
            'A lot or batch code if you buy trade sizes',
          ] },
          { type: 'p', text: 'If the pouch only says “cocoa powder,” treat the process as unknown until the brand confirms. Colour alone will not tell you the process — some natural (non-alkalised) cocoas run fairly dark; some Dutch cocoas are reddish rather than black.' },
        ],
      },
      {
        heading: 'Christmas and New Year orders',
        blocks: [
          { type: 'p', text: 'December chocolate cupcakes and New Year layer cakes are exactly when a wrong cocoa swap shows up in a client photo. Check the **exact cocoa** your tested recipe was developed with before you scale a holiday batch. This is recipe hygiene, not a claim about every plum cake or fruit cake formula.' },
        ],
      },
      {
        heading: 'Storage in Indian homes',
        blocks: [
          { type: 'p', text: 'Airtight, cool, dark; away from the gas stove and open masala. Smaller monsoon packs finish faster. Once open, your kitchen climate wins.' },
        ],
      },
      {
        heading: 'How this fits COCO36’s shop',
        blocks: [
          { type: 'p', text: 'Dutch-process cocoa is coming soon to the COCO36 shop. Until then, read this guide, the [Guides hub](/guides), or [browse the shop](/shop).' },
        ],
      },
    ],
    faqs: [
      { q: 'Can I swap Dutch-process for natural (non-alkalised) cocoa in any recipe?', a: 'No blanket yes. Flavour-only uses are often flexible. Where soda depends on natural (non-alkalised) cocoa’s acidity, Dutch can flatten rise unless other acids balance the formula. Follow a tested recipe.' },
      { q: 'Which cocoa is better for hot chocolate?', a: 'Dutch-process is usually mellower and easier to dissolve. Natural (non-alkalised) cocoa works if you whisk well. Sweetness is separate.' },
      { q: 'Does darker cocoa mean better cocoa?', a: 'No. Darkness is not a universal quality scale.' },
      { q: 'What does unsweetened mean?', a: 'No added sugar in the powder. Your drink still needs sweetening if you want it sweet.' },
      { q: 'Will COCO36 sell cocoa powder?', a: 'Dutch-process cocoa is coming soon to the COCO36 shop.' },
    ],
    related: [
      { href: '/guides', label: 'Guides hub' },
      { href: '/ingredients/cocoa-chocolate', label: 'Cocoa & chocolate' },
      { href: '/guides/couverture-vs-compound', label: 'Couverture vs compound' },
      { href: '/ingredients/sugars-jaggery', label: 'Sugars & jaggery' },
      { href: '/shop', label: 'Browse the shop' },
    ],
  },
  {
    path: '/guides/pistachio-paste-dubai-chocolate-at-home',
    title: 'Pistachio Paste for Baking, Gelato & Mithai | COCO36',
    description: 'Pistachio paste vs cream for Indian bakers: unsweetened paste for gelato, frangipane, entremets and mithai — and how to read the label.',
    schemaDescription: 'Pistachio paste vs cream for Indian bakers: unsweetened paste for gelato, frangipane, entremets and mithai, and how to read the label.',
    h1: 'Pistachio paste for baking, gelato, viennoiserie and mithai',
    crumb: 'Pistachio paste',
    updated: '2026-11-10',
    sections: [
      {
        blocks: [
          { type: 'p', text: 'Pistachio paste should be unsweetened ground pistachios; pistachio cream usually adds sugar and often other fats or milk — read the label first, then use paste when you want to control sweetness in gelato, frangipane, entremets, mithai or a Dubai-style bar.' },
          { type: 'p', text: 'This guide is for home bakers, pastry cooks, gelato makers and mithai kitchens who want **unsweetened pistachio paste** they can dose themselves. It separates **paste from cream**, shows how to read the jar, and then covers the jobs paste does well: gelato, croissant and frangipane fillings, entremets and mithai. A **Dubai-style / kunafa chocolate** bar appears later as one method, not as the only reason to keep paste on the bench.' },
          { type: 'p', text: 'COCO36 sources origin ingredients for Indian bakers. Hub: [Guides](/guides). Chocolate technique: [Cocoa & chocolate](/ingredients/cocoa-chocolate), [Couverture vs compound](/guides/couverture-vs-compound).' },
          { type: 'p', text: 'Pistachio paste is coming soon to the COCO36 shop, and it will not be sold as cream. Until then, this guide and [Shop](/shop) only — no product CTA inventing stock.' },
        ],
      },
      {
        heading: 'Why pistachio paste belongs on an Indian pastry bench',
        blocks: [
          { type: 'p', text: 'The Dubai-style bar made pistachio paste more visible on Indian specialty shelves, but pastry use goes further. A February 2026 Puratos [Taste Tomorrow](https://www.tastetomorrow.com/inspiration/after-72-percent-growth-the-past-year-where-does-pistachio-go-now) report put India among the strongest pistachio markets, with online popularity up 72% over the prior year, and said growth was beginning to stabilise into bakery and chocolate applications. A July 2026 Terrain analysis, reported by [Agri-Pulse](https://www.agri-pulse.com/articles/24950-dubai-chocolate-craze-helps-pistachios-defy-tree-nut-downturn), said global Google searches for “Dubai chocolate” peaked in March 2025, while pistachio demand as an ingredient has lasted. For bakers, that points to paste as a working ingredient for gelato, viennoiserie, entremets and mithai — not only for a viral bar.' },
        ],
      },
      {
        heading: 'What unsweetened pistachio paste means',
        blocks: [
          { type: 'p', text: 'A verified **100% pistachio paste** is pistachios ground to a paste **without added sugar** (reference example: [Callebaut Pure Pistachio Paste](https://www.callebaut.com/en/products/callebaut/nuts-pure-pistachio-paste/NPO-PI1-2B-18A) — explicitly 100% pistachio and unsweetened). Evidence is for that labelled product; always confirm the jar in your hand.' },
          { type: 'p', text: 'On a COCO36 page we will say **pure 100% pistachio paste, unsweetened** only when that is true of the labelled product.' },
          { type: 'p', text: 'Unsweetened paste lets the maker **choose the sweetness** in a gelato base, a frangipane, a mithai filling or a chocolate centre. It is **not** a ready-made sweetened filling and **not** an automatic 1:1 swap for cream.' },
        ],
      },
      {
        heading: 'What pistachio cream usually is',
        blocks: [
          { type: 'p', text: 'Sweetened pistachio cream / spread typically adds sugar and often oils, milk powders or cocoa butter. One transparent manufacturer example is Pistì’s cream declaration (pistachio plus sugar, milk powders, oils and other listed ingredients — see [Pistì premium pack ingredients](https://shop.pisti.it/en/products/pistachio-spreadable-cream-in-premium-pack)). That is **one example**, not every cream on earth.' },
          { type: 'p', text: 'Sweetened creams can be valid for other jobs — a ready spread, a quick croissant filling when you accept the sugar and fat already in the jar. We do **not** call all green creams fake, dyed or low quality. **Colour is not the ingredient list.**' },
          { type: 'table', headers: ['Jar claim', 'Composition idea', 'When it helps'], rows: [
            ['100% / unsweetened paste', 'Pistachios', 'Best control — you add sugar, dairy or chocolate per recipe'],
            ['Sweetened cream / spread', 'Pistachios + sugar + other fats/milk', 'Convenient; different sugar/fat balance, not a 1:1 paste swap'],
            ['“Dubai filling” mix', 'Variable', 'Only if ingredients are clear'],
          ] },
        ],
      },
      {
        heading: 'How to read a pistachio jar in India',
        blocks: [
          { type: 'ol', items: [
            'Ingredients should read pistachios (or roasted pistachios) for true paste.',
            'Neon green ≠ an unsweetened-paste label. Believe the list.',
            'Natural paste separates; stir.',
            'Ask for aflatoxin CoA on wholesale lots before retail packing.',
            '“Made in India” often means domestic milling of imported kernels — fine if disclosed.',
          ] },
        ],
      },
      {
        heading: 'Practical guidance: paste vs cream on a spoon',
        blocks: [
          { type: 'p', text: 'Taste a gram of each neat, then whisk small equal amounts into warm milk. Compare sweetness and whether pistachio flavour survives. Keep paste for recipe control; use cream when you want a ready sweet spread.' },
        ],
      },
      {
        heading: 'Unsweetened paste in gelato',
        blocks: [
          { type: 'p', text: 'In a gelato or ice-cream base, unsweetened paste lets you keep the sugar and fat of the mix under your own formula. A sweetened cream already brings sugar and often other fats or milk powders, so a straight swap will change both sweetness and texture. Add paste to the flavoured base, taste, and adjust sugar only after you know what the paste contributed. A quieter, naturally grey-green colour can still be correct; do not chase a neon hue with colouring if the label is honest.' },
          { type: 'p', text: 'This is kitchen guidance, not a published overrun, serving temperature or yield specification.' },
        ],
      },
      {
        heading: 'Viennoiserie: croissant fillings and pistachio frangipane',
        blocks: [
          { type: 'p', text: 'Pistachio paste is the usual starting point for a pistachio frangipane or a croissant filling you want to sweeten yourself. A typical path is paste with butter, sugar and eggs — sometimes with a share of ground almonds if you are adapting an almond frangipane — then baked in a twice-baked croissant, a tart shell or a bun. If you start from sweetened cream instead, cut back the other sugars in the recipe and expect a looser or richer result; it is a different formula, not a gram-for-gram stand-in.' },
          { type: 'p', text: 'Keep fillings cool enough to pipe or spread, and do not overbake a pistachio frangipane past a set, slightly springy centre. Confirm your own baker’s percentages in a small trial.' },
        ],
      },
      {
        heading: 'Entremets and pastry creams',
        blocks: [
          { type: 'p', text: 'For entremets — mousses, crémeux, biscuit, inserts — unsweetened paste gives pistachio flavour without a hidden load of sugar. Whisk or blend it into a base you already know (a crème anglaise, a ganache, a buttercream) and only then decide whether the dessert needs more sugar or a sharper contrast, such as raspberry, citrus, coffee or dark chocolate. Sweetened cream can still work in a simple filling, but you will be accepting its existing sugar and fat balance.' },
        ],
      },
      {
        heading: 'Mithai and familiar Indian sweets',
        blocks: [
          { type: 'p', text: 'Pistachio is already familiar in Indian sweets as a garnish and as a flavour in kulfi, barfi, halwa and laddoo. Unsweetened paste is useful when you want a smooth, even pistachio taste in a filling or a burfi, rather than only chopped nuts on top. You still add the sugar, ghee, milk or khoya the recipe already uses; paste does not make the sweet “sugar-free.” Chopped or slivered pistachios remain useful for texture. Do not treat paste as a traditional-recipe replacement without testing the set and the sweetness in your own kadai.' },
        ],
      },
      {
        heading: 'Dubai-style kataifi chocolate bar (one method)',
        blocks: [
          { type: 'p', text: '**Cite, don’t invent origin stories.** This is one use of unsweetened paste, not the only one. Workflow inspiration: Callebaut / Frank Carrieri’s [Dubai Bar](https://www.callebaut.com/en/recipes/dubai-bar/4898) (toast kataifi; fill pre-cast tempered shells). Pure-paste filling reference: Callebaut / Yeşim Erol’s [Dubai chocolate bar](https://www.callebaut.com/en/recipes/yesims-dubai-chocolate-bar/4942) — published reference uses white chocolate + pure paste + tahini + kataifi (example scale: 160 g white chocolate, 500 g pure paste, 50 g tahini, 150 g kataifi; one-fifth test ~32 / 100 / 10 / 30 g). That Carrieri recipe’s sweetness balance uses sweetened praline — **do not gram-for-gram replace praline with pure paste**.' },
          { type: 'p', text: 'Below is a **practice framework** for home kitchens. Confirm weights, mould, temper curve and set time in your own trial before treating numbers as fixed. Not a Coco36 shelf-life or sale specification. Contains pistachio (tree nut) and wheat; sesame/milk/soy if tahini or white chocolate / milk couverture are used.' },
          { type: 'h3', text: 'Ingredients (starting point for one medium bar — adjust after trial)' },
          { type: 'ul', items: [
            pistachioIngredients[0],
            'Small weighed amount of cooking fat for toasting (start modest; confirm the amount after your trial)',
            ...pistachioIngredients.slice(1),
          ] },
          { type: 'h3', text: 'Method' },
          { type: 'ol', items: pistachioSteps },
          { type: 'h3', text: 'Guidance notes' },
          { type: 'ul', items: [
            'Oil weep → filling too loose or kataifi still warm.',
            'Bloom → temper/storage — see cocoa guides.',
            '“Choose the sweetness” means recipe control, not a sugar-free finished bar.',
            'Handmade Dubai-style bars can work as gifts when shells are properly tempered and fillings are cool and crisp. Keep allergen labelling honest on any gift tag (pistachio, wheat; sesame/milk/soy as used). Do not invent a shelf life from a foreign recipe PDF — validate for your kitchen and climate, especially in humid or summer storage.',
          ] },
        ],
      },
      {
        heading: 'Why “paste or cream?” belongs on the label — and in the reel',
        blocks: [
          { type: 'p', text: 'Our Ingredient Notes reel for this topic should open on two real ingredient panels, then show paste going into a familiar pastry job — a frangipane, a gelato base, or a bar break — rather than treating the viral bar as the whole story. The educational job is **label literacy**, not dunking sweetened cream as a category. Creams earn their place on toast and in some ready fillings. Paste earns its place when you are building a gelato, a croissant filling, an entremet, a mithai centre or a Dubai-style filling whose sugar and fat you want to specify yourself.' },
          { type: 'p', text: 'If a jar is neon green and the ingredient list is long, believe the list. If a 100% paste looks quieter in colour than social media fillings, that can still be correct.' },
        ],
      },
      {
        heading: 'Food safety and labelling',
        blocks: [
          { type: 'p', text: 'Allergen-label pistachio; also wheat, sesame, milk or soy when those ingredients are used in a filling or bar. No health-food positioning. “Dubai-style” describes format, not geographic certification.' },
        ],
      },
      {
        heading: 'How COCO36 will sell this',
        blocks: [
          { type: 'p', text: 'When a jar is live, wording will be **pure 100% pistachio paste, unsweetened** only if that is true of the labelled product — never marketed as cream. Placeholder `/shop/pistachio-paste`. Until live, this guide + [Shop](/shop) only — no product CTA inventing stock.' },
        ],
      },
    ],
    faqs: [
      { q: 'Paste vs cream?', a: 'Paste should be pistachios without added sugar. Cream usually adds sugar and often oils or milk. Different jobs; not a 1:1 swap.' },
      { q: 'What can I use unsweetened pistachio paste for?', a: 'Gelato and ice-cream bases, croissant and frangipane fillings, entremets, mithai fillings, and chocolate centres — including a Dubai-style or kunafa bar. In each case you add the sweetness yourself.' },
      { q: 'Can I use cream in those recipes instead?', a: 'Yes with adjusted sugar — expect a different balance. Paste gives cleaner control.' },
      { q: 'What is kunafa chocolate?', a: 'Common name for Dubai-style bars with toasted kataifi and pistachio inside chocolate. It is one use of paste, not the only one.' },
      { q: 'Is paste available in India?', a: 'Yes via specialty shops and millers. Read ingredients every time.' },
      { q: 'Do I need tempered couverture for a Dubai-style bar?', a: 'Best for glossy snappy moulds. Follow the shell chocolate’s tempering instructions — they vary.' },
      { q: 'Will COCO36 sell pistachio paste?', a: 'Pistachio paste is coming soon to the COCO36 shop, and it will not be sold as cream. The page will say pure 100% pistachio paste, unsweetened only when that is true of the labelled product.' },
    ],
    related: [
      { href: '/guides', label: 'Guides hub' },
      { href: '/guides/couverture-vs-compound', label: 'Couverture vs compound' },
      { href: '/guides/natural-vs-dutch-cocoa', label: 'Natural (non-alkalised) vs Dutch' },
      { href: '/ingredients/cocoa-chocolate', label: 'Cocoa & chocolate' },
      { href: '/shop', label: 'Browse the shop' },
    ],
    recipe: {
      name: 'Dubai-style kataifi pistachio chocolate bar (home adaptation)',
      description: 'Adapted home method: toasted kataifi folded into an unsweetened pistachio-paste filling, sealed in tempered chocolate. One use of unsweetened paste, not the only one.',
      recipeCuisine: 'Indian home baking',
      recipeCategory: 'Dessert',
      recipeYield: '1 medium bar',
      ingredients: pistachioIngredients,
      steps: pistachioSteps,
    },
  },
  {
    path: '/guides/best-couverture-chocolate-india',
    title: 'Best Couverture Chocolate in India (2027) | COCO36',
    description: 'Couverture brands Indian bakers can buy in 2027: cocoa %, format and best use, and how to tell couverture from compound. Check current prices.',
    schemaDescription: 'Couverture brands Indian bakers can buy in 2027: cocoa %, format and best use, and how to tell couverture from compound. Check current prices.',
    h1: 'Best couverture chocolate brands in India (2027 buying guide)',
    crumb: 'Couverture brands',
    updated: '2026-11-10',
    published: COUVERTURE_BUYING_GUIDE_PUBLISH_DATE,
    sections: [
      {
        blocks: [
          { type: 'p', text: 'The couverture brands Indian bakers can actually buy are a mix of imported professional lines — Callebaut, Van Houten Professional, Cacao Barry, Valrhona and Belcolade — and Indian makers such as Morde, Mason & Co and Kocoatrait. Amul also sells an institutional dark chocolate slab, DCH-47, alongside a separate dark compound, so the pack has to be read carefully. Choose by cocoa percentage, format (callets, blocks or bars) and the job — ganache, moulding, enrobing or baking — and check the current price with the seller. COCO36 couverture is coming soon to the COCO36 shop; this guide does not rank our future pack against the brands below.' },
          { type: 'p', text: 'If you only need the difference between couverture and compound, start with [Couverture vs compound chocolate](/guides/couverture-vs-compound). For how cocoa becomes chocolate, see [Cocoa and chocolate](/ingredients/cocoa-chocolate).' },
        ],
      },
      {
        heading: 'What “couverture” means on an Indian pack',
        blocks: [
          { type: 'p', text: 'Couverture is chocolate made with cocoa butter as the working fat, usually with enough extra cocoa butter to melt fluidly for thin coatings, moulded shells and ganache. Compound uses a different principal fat, typically other vegetable fats, and generally does not need classical tempering. The two can look similar in a block. They are not the same material.' },
          { type: 'p', text: 'In Indian food law the word is also a standard. The Food Safety and Standards regulations say couverture chocolate shall contain, on a dry matter basis, not less than 35 per cent total cocoa solids, of which not less than 31 per cent shall be cocoa butter and not less than 2.5 per cent fat-free cocoa solids. That is a legal minimum, not a taste score.' },
          { type: 'p', text: 'The percentage on a dark pack is the share of cocoa mass plus any added cocoa butter, not a quality medal. Higher usually means less sugar and more intensity. Fluidity — some Callebaut and Cacao Barry sheets use a drop rating — tells you how thinly melted, tempered chocolate will flow. Read the ingredient list: couverture typically lists cocoa mass or liquor, sugar, cocoa butter, and sometimes milk, lecithin and vanilla. If the principal fat is a named vegetable fat other than cocoa butter, you are probably looking at compound.' },
        ],
      },
      {
        heading: 'How to choose',
        blocks: [
          { type: 'p', text: 'Pick the job first. Everyday ganache, cookies and brownies are forgiving, and a consistent mid-cocoa dark (around the mid-50s) is the usual workhorse. Moulded shells and thin enrobing need a chocolate designed to flow, and they need proper tempering.' },
          { type: 'p', text: 'Then pick a format you will actually use. Professional callets or pistols melt evenly and are easy to weigh. One-kilo or 2.5 kg blocks are common in Indian bakery supply. 200 g baking bars from Indian makers are a sensible way to try a chocolate before buying a sack. Eating bars can be melted in a pinch, but they are not bakery couverture.' },
          { type: 'p', text: 'Check the current price: import costs, pack size and retail versus trade change the number, so this guide does not list rupee prices. Store couverture in a cool, dry, dark cupboard, away from spice smells and monsoon damp. In a hot summer, a reasonably cool room is usually kinder than the fridge, because chocolate taken out of a fridge can collect condensation and show sugar bloom. The [cocoa and chocolate guide](/ingredients/cocoa-chocolate) covers tempering and bloom in more detail.' },
        ],
      },
      {
        heading: 'At a glance',
        blocks: [
          { type: 'table', headers: ['Brand', 'Typical example', 'Cocoa % (maker’s figure)', 'Usual format', 'Best for'], rows: [
            ['Callebaut', '811 dark; 823 milk', '54.5% dark; 33.6% milk', 'Callets or blocks', 'Everyday ganache, baking, moulding'],
            ['Van Houten Professional', 'Signature Dark 55%; also 46.5%', '55%; 46.5%', '1 kg blocks', 'Accessible bakery and pastry work'],
            ['Cacao Barry', 'Excellence 55% dark; Alunga 41% milk', '55% dark; 41% milk', 'Pistols / callets', 'Moulding and coatings with a stated fluidity'],
            ['Valrhona', 'Guanaja 70%', '70%', 'Professional bags (for example 3 kg)', 'Flavour-led desserts and ganache'],
            ['Belcolade', 'Selection Noir Cacao-Trace (CT C501)', '55%', 'Drops, various fluidities', 'Pastry and chocolate work'],
            ['Morde', 'Dark CHD 55, plus milk and white lines', '55% on the widely sold dark discs', 'Discs and bakery blocks', 'Everyday Indian bakery work'],
            ['Mason & Co', '75% Couverture Dark Baking Chocolate', '75%', '200 g baking bar', 'Home baking, ganache, small batches'],
            ['Kocoatrait', '55% and 70% baking couverture', '55%; 70%', '200 g packs', 'Home baking and small-batch work'],
            ['Paul and Mike', 'Farm-to-bar eating bars', 'Varies by bar (for example 40% milk, 72% or 85% dark)', 'Retail bars', 'Melting a named bar for that maker’s flavour'],
            ['Amul', 'Dark Chocolate DCH-47; compare with Dark Compound DCO-18', 'Confirm the pack; DCH-47 is a 47% dark slab', 'Institutional slabs', 'Volume work, only if the pack is couverture, not compound'],
          ] },
          { type: 'p', text: 'Check the current price with the seller; stock varies.' },
        ],
      },
      {
        heading: 'Imported professional brands',
        blocks: [
          { type: 'p', text: '**Callebaut** is the Belgian workhorse most serious bakers in India will be offered first. The maker describes **811** as a dark couverture with **54.5% cocoa** and 3-drop fluidity, an all-rounder for ganache, moulding, enrobing and baking. **823** is the matching milk couverture, at **33.6% cocoa**, also 3-drop. Both appear at Indian bakery suppliers in callets and larger packs. It is the usual place to start if you want predictable temper.' },
          { type: 'p', text: '**Van Houten Professional**, now in the Barry Callebaut group, sells couverture-style chocolate in India, not only cocoa powder. The India-facing page for **Signature Dark Chocolate 55%** (order code CHD-Q90561IN-V-67B) states 55% minimum dry cocoa solids and 35.8% fat, sold as a **1 kg block**. A 46.5% dark is also sold through bakery suppliers.' },
          { type: 'p', text: '**Cacao Barry**, a French brand in the same group, is the line to look at when moulding or coating depends on flow. **Excellence 55%** dark couverture is listed with 55% minimum dry cocoa solids, 25% fat and 2-drop (low) fluidity, in pistols, including 1 kg and 5 kg bags. **Alunga 41%** is a milk couverture in the same family. Read the fluidity on the SKU you are offered; it will not necessarily behave like Callebaut 811.' },
          { type: 'p', text: '**Valrhona** is the French flavour-led option, and it usually costs more. **Guanaja 70%** is 70% cocoa, with cocoa beans, sugar, cocoa butter, sunflower lecithin and natural vanilla extract on the official composition. Recommended applications include coating, moulding, bars and ganache, in professional packs such as a 3 kg bean bag. In India it is sold through specialist importers and bakery suppliers. Choose it when the chocolate is meant to be tasted as itself, not because a higher percentage is automatically better.' },
          { type: 'p', text: '**Belcolade** is Puratos’s Belgian chocolate brand, made in Erembodegem and offered in India by Puratos Food Ingredients India. **Selection Noir Cacao-Trace** (CT C501) is described as a balanced dark chocolate made from **55% cocoa**, in more than one fluidity and format. You may need a Puratos contact or a bakery dealer rather than a consumer checkout.' },
        ],
      },
      {
        heading: 'Indian makers',
        blocks: [
          { type: 'p', text: '**Morde** is an Indian B2B chocolate maker and the domestic name you will see most often next to the imported sacks. Retail and trade listings commonly offer **dark chocolate discs at 55% cocoa** (often coded CHD 55), with milk and white lines alongside. Confirm the cocoa percentage, and the word “couverture” if it appears, on the bag in front of you. It is the usual choice when you want a chocolate made for Indian bakery volume and easier to replenish than an imported callet.' },
          { type: 'p', text: '**Mason & Co**, a bean-to-bar maker in Auroville, Tamil Nadu, sells a **75% Couverture Dark Baking Chocolate** in a **200 g** bar, described as having a higher cacao butter content so it is easier to melt, measure and use for cakes, brownies, cookies and ganache. That is a genuine baker-format SKU, not only an eating bar.' },
          { type: 'p', text: '**Kocoatrait**, based in Chennai, sells a dedicated baking couverture range, including a **55% bean-to-bar couverture** and a **70% dark couverture**, both in **200 g** packs from Indian-origin beans. The 70% pack is described as suitable for baking and chocolate-making. These are home-kitchen and small-batch sizes.' },
          { type: 'p', text: '**Paul and Mike**, in Kerala, is a farm-to-bar maker: they describe controlling the cocoa from farming through fermentation, drying, roasting and the finished bar. Their FAQ says they use fine-flavour cocoa beans and cocoa butter, and no hydrogenated vegetable oil. The shop, at the time this guide was researched, is built around **named eating bars** (for example 40% fine milk, and dark bars at 72% or 85%), not a baker’s callet or 1 kg block line that we could find. You can melt a bar for a small ganache, but it is not a substitute for a bakery sack. Read the pack.' },
          { type: 'p', text: '**Amul** is easy to mix up. The co-operative publishes an institutional **Dark Chocolate DCH-47** page and a separate **Dark Compound DCO-18**. “Amul dark” in a wholesale list is not automatically couverture. On 10 November 2026 the DCH-47 page did not return a stable ingredient panel to our fetch. The reliable facts are the codes: DCH-47 is Amul’s 47% dark chocolate slab; DCO-18 is a dark compound. If you need cocoa butter for covering or ganache, confirm the slab in the carton is DCH-47 (or another SKU that meets the FSSAI couverture standard) and not the compound.' },
        ],
      },
      {
        heading: 'Where COCO36 fits',
        blocks: [
          { type: 'p', text: 'COCO36 couverture is **coming soon to the COCO36 shop**. This page will link to the product when it is live. Until then, this guide is here to help you choose among chocolates you can already buy, and to read a pack with a clearer eye. We are not claiming that our forthcoming chocolate is better than the brands above.' },
          { type: 'p', text: 'When you compare a 1 kg offer, the checklist on [Couverture vs compound](/guides/couverture-vs-compound) still holds: ingredients first, then cocoa percentage, then fluidity if the maker publishes it, then origin if it matters to the recipe.' },
        ],
      },
      {
        heading: 'Sources',
        blocks: [
          { type: 'p', text: 'Research for this draft was checked on 10 November 2026. Product availability and wording on third-party shops can change.' },
          { type: 'ol', items: [
            'Food Safety and Standards (Food Products Standards and Food Additives) regulations, couverture definition: not less than 35% total cocoa solids, of which not less than 31% cocoa butter and not less than 2.5% fat-free cocoa solids — [Gazette notification, 1 June 2017](https://www.fssai.gov.in/upload/uploadfiles/files/Gazette_Notification_Chocolate_Standards_01_06_2017.pdf) and [FSSAI clarification, 19 February 2020](https://www.fssai.gov.in/upload/uploadfiles/files/Clarification_Chocolate_19_02_2020.pdf).',
            '[Callebaut 811 dark couverture (54.5% cocoa, 3-drop)](https://www.callebaut.com/en-IN/products/selection-range-chocolates/callebaut-811-belgian-dark-couverture-chocolate).',
            '[Callebaut 823 milk couverture (33.6% cocoa, 3-drop)](https://www.callebaut.com/en/products/selection-range-chocolates/callebaut-823-belgian-milk-couverture-chocolate).',
            '[Van Houten Professional Signature Dark Chocolate 55% (1 kg block, India page)](https://www.vanhoutenprofessional.com/en-IN/products/van-houten-professional/Van%20Houten%20Professional%2055%25%20Dark%20Chocolate/CHD-Q90561IN-V-67B).',
            '[Cacao Barry Excellence 55% dark couverture, pistols](https://www.callebaut.com/en/products/cacao-barry/dark-couverture-excellence-55-pistols/CHD-R55EXEL-2B-U77).',
            '[Cacao Barry Alunga 41% milk couverture (India listing)](https://www.callebaut.com/en-IN/products/cacao-barry/milk-couverture--alunga-41--pistols--5kg-bag/CHM-Q41ALUN-E4-U72).',
            '[Valrhona Guanaja 70%](https://www.valrhona.com/en/our-products/for-professionals/chocolate-co/couverture-chocolates/exceptional-blends/guanaja-70).',
            'India availability of imported professional chocolates, as a supplier catalogue rather than a maker sheet: [Bakerykart couverture category](https://www.bakerykart.com/products/chocolates/couverture) and [Bakerykart Valrhona brand page](https://www.bakerykart.com/brands/valrhona).',
            '[Belcolade Selection Noir Cacao-Trace, 55% cocoa](https://www.belcolade.com/en-gb/products/chocolate/selection/belcolade-selection-noir-cacao-trace).',
            '[Puratos India — Belcolade / real Belgian chocolate](https://www.puratos.in/en/chocolate/categories/real-belgian-chocolate) and [Puratos India — Belcolade Selection Cacao-Trace dark](https://www.puratos.in/en/products/belcolade-couverture_dark_1).',
            '[Morde — official site](https://www.morde.com/).',
            '[Mason & Co 75% Couverture Dark Baking Chocolate, 200 g](https://www.masonchocolate.com/product-page/75-couverture-dark-baking-chocolate).',
            '[Kocoatrait baking couverture category](https://cocoatrait.com/product-category/shop/baking-couverture-chocolate/) and [Kocoatrait 70% dark couverture, 200 g](https://cocoatrait.com/product/kocoatrait-70-organic-bean-to-bar-single-origin-couverture-200gms/).',
            '[Paul and Mike — FAQ (farm-to-bar, cocoa butter, no hydrogenated vegetable oil)](https://www.paulandmike.co/pages/faqs) and [Paul and Mike shop](https://www.paulandmike.co/collections/all-products).',
            '[Amul Dark Chocolate DCH-47 product page](https://amul.com/index.php?q=products/amul-dark-chocolate-dch-47-info.php). The companion compound SKU is listed by Amul as [Dark Compound DCO-18](https://www.amul.com/index.php?q=products%2Famul-dark-compound-dco-18-info.php).',
            'Made-in-India context for Mason & Co and Kocoatrait: [Condé Nast Traveller India, “22 made in India chocolates that you should know”](https://www.cntraveller.in/story/indian-chocolate-brands-to-know/).',
          ] },
        ],
      },
    ],
    faqs: [
      { q: 'Which couverture is best for beginners in India?', a: 'Start with a widely available mid-cocoa dark — Callebaut 811 (54.5%) and Morde’s 55% dark discs are the two you are most likely to be offered. Learn to weigh, melt and temper on one of those before you spend more on a 70% tasting chocolate.' },
      { q: 'Is a higher cocoa percentage better?', a: 'No. The percentage is the share of cocoa mass and cocoa butter, which usually means less sugar and a more intense flavour. It is not a grade. A 54.5% or 55% dark is often easier in cookies, brownies and a standard ganache than a very high-percentage dark.' },
      { q: 'Can I use compound instead of couverture?', a: 'Yes, when the job is volume coating, a hot kitchen, or a recipe that only needs a chocolate flavour and a set coating, and you do not want to temper. Compound is not couverture. If the dessert’s identity is gloss, snap and cocoa-butter flavour, use couverture. The longer answer is in [Couverture vs compound.](/guides/couverture-vs-compound)' },
      { q: 'Where can I buy these brands in India?', a: 'Imported lines are sold by bakery suppliers and specialist importers; Belcolade is offered through Puratos India. Morde is widely sold in bakery trade packs. Mason & Co and Kocoatrait sell baking couverture from their own shops. Paul and Mike sell bars from their shop and grocery retailers. Amul institutional slabs go through dairy and food-service distributors. Check the current price and pack size with the seller you use.' },
      { q: 'Does COCO36 sell couverture now?', a: 'Not yet. COCO36 couverture is coming soon to the COCO36 shop. This guide will point to the product page when it is live.' },
      { q: 'How should I store couverture in a warm climate?', a: 'Cool, dry and dark, sealed away from strong smells. Avoid moving it in and out of the fridge in humid weather, which can cause sugar bloom. If you must refrigerate it, wrap it well and let it warm inside the wrapping before opening.' },
    ],
    related: [
      { href: '/guides', label: 'Guides hub' },
      { href: '/guides/couverture-vs-compound', label: 'Couverture vs compound' },
      { href: '/ingredients/cocoa-chocolate', label: 'Cocoa and chocolate' },
      { href: '/guides/natural-vs-dutch-cocoa', label: 'Natural (non-alkalised) vs Dutch' },
      { href: '/shop', label: 'Browse the shop' },
    ],
  },
];

export const bakingNoteByPath = (pathname: string) => BAKING_NOTES.find((n) => n.path === pathname);
