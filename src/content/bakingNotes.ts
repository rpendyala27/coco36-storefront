/**
 * /guides and the December Ingredient Notes cluster.
 * The wording is the drafted copy. Bracketed [CONFIRM] lines on untested
 * kitchen steps are omitted and are not in the FAQ or JSON-LD either.
 * Image suggestions and the draft's JSON-LD blocks are metadata, not body copy.
 *
 * Existing family guides stay at /ingredients/<slug>. This module does not
 * replace them. The hub links each one.
 */

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
  sections: NoteSection[];
  faqs: NoteFaq[];
  related: NoteLink[];
  recipe?: NoteRecipe;
}

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
    description: 'COCO36 ingredient guides for Indian bakers — couverture vs compound, natural vs Dutch cocoa, pistachio paste and Dubai-style chocolate.',
    schemaDescription: 'COCO36 ingredient guides for Indian bakers — couverture vs compound, natural vs Dutch cocoa, pistachio paste and Dubai-style chocolate.',
    h1: 'Ingredient guides',
    crumb: 'Guides',
    updated: '2026-11-09',
    sections: [
      {
        blocks: [
          { type: 'p', text: 'Short, practical notes from COCO36 for bakers and pastry cooks across India — how ingredients behave, how to read a label, and how to choose for the recipe. The writing stays crop-to-craft.' },
          { type: 'p', text: 'These three guides are the December **Ingredient Notes** cluster (Instagram link-in-bio destination once published and approved):' },
          { type: 'ol', items: [
            '**[Couverture vs compound chocolate: what Indian bakers should use](/guides/couverture-vs-compound)**\nCocoa-butter-rich couverture versus compound’s other fat matrix — comparison, not a universal winner.',
            '**[Natural vs Dutch-process cocoa powder: which one for your bake](/guides/natural-vs-dutch-cocoa)**\nAcidity, colour and leavening — darker is not automatically better.',
            '**[Pistachio paste vs cream, and Dubai chocolate at home](/guides/pistachio-paste-dubai-chocolate-at-home)**\nRead the pistachio label, then build a Dubai-style kataifi bar with 100% unsweetened paste.',
          ] },
          { type: 'p', text: 'Also browse our longer [ingredient library](/ingredients) (vanilla, cocoa & chocolate, sugars & jaggery, flours, spices & salt) and the [shop](/shop).' },
          { type: 'p', text: 'New guides publish here first. Product pages for December heroes go live only when stock and copy are approved — guides never invent availability.' },
        ],
      },
    ],
    faqs: [],
    related: [
      { href: '/guides/couverture-vs-compound', label: 'Couverture vs compound' },
      { href: '/guides/natural-vs-dutch-cocoa', label: 'Natural vs Dutch cocoa' },
      { href: '/guides/pistachio-paste-dubai-chocolate-at-home', label: 'Pistachio paste' },
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
    updated: '2026-11-09',
    sections: [
      {
        blocks: [
          { type: 'p', text: 'Walk into any bakery supplier in India and you will meet two kinds of “chocolate for baking”: **couverture** and **compound**. They look similar in a block. They behave differently in a tempering bowl, on a moulded egg, or on a warm Indian kitchen counter in May.' },
          { type: 'p', text: 'This guide helps home bakers, pastry students and small kitchens choose a **fat system for the job**. It is not a blanket “compound is bad” verdict. At COCO36 we talk crop-to-craft: Rohan’s family farms in West Godavari, Andhra Pradesh, so heat, humidity and monsoon storage are part of the brief.' },
          { type: 'p', text: 'For pod-to-bar basics see [Cocoa & chocolate](/ingredients/cocoa-chocolate). Hub for this cluster: [Guides](/guides). When Indian-origin dark couverture lands, it will sit under [Shop](/shop) (product page placeholder until stock is live).' },
        ],
      },
      {
        heading: 'Couverture and compound, in one sentence each',
        blocks: [
          { type: 'p', text: '**Couverture** is real chocolate **rich in cocoa butter** (with cocoa mass, sugar, and sometimes milk or emulsifiers). Extra cocoa butter makes melted chocolate more fluid for thin coatings; when correctly tempered it sets with gloss and snap. Couverture is a **formulated** product — not a single ingredient, and not “100% cacao” unless the label literally says so.' },
          { type: 'p', text: '**Compound chocolate** (often “cooking chocolate”, “coating chocolate” or compound slabs) uses a **different principal fat matrix** — typically other vegetable fats in place of most cocoa butter. It generally does not require classical tempering. It can be the honest choice for volume work. It is not the same material as couverture.' },
          { type: 'p', text: 'Important nuance (from maker technical pages such as Valrhona on couverture and Barry Callebaut on compound coatings): **cocoa butter itself is a vegetable fat**. When we say compound uses “other vegetable fats,” we mean fats other than cocoa butter as the principal working fat — not a plant-versus-non-plant distinction. Compound **need not contain absolutely zero cocoa butter**; read the actual pack. Do not claim “zero cocoa butter” unless the label says so.' },
        ],
      },
      {
        heading: 'Why the difference matters in India',
        blocks: [
          { type: 'p', text: 'Volume bakery work in India often leans on compound because it is stable, affordable and easier without a tempering machine. Premium pastry, bean-to-bar makers and many café dessert counters move toward **real chocolate** and, where budgets allow, couverture for enrobing and moulded work.' },
          { type: 'ul', items: [
            'Compound: quick drips, school fudge, high-volume coated biscuits.',
            'Couverture: bonbons, thin shells, shiny glaze, ganache where cacao flavour matters.',
          ] },
          { type: 'p', text: 'Neither is universally “wrong.” Calling compound “couverture” on a menu or reel is the expensive kind of wrong.' },
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
          { type: 'p', text: 'Price for a baker’s 1 kg block varies with cocoa butter content, origin, brand and retail vs trade. We will publish our own 1 kg baker-pack price on the product page when stock is live. Until then, treat web “from ₹X/kg” quotes as supplier-specific, not a national average. Commodity cocoa futures are not the same as retail couverture.' },
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
        heading: 'When compound is the honest choice',
        blocks: [
          { type: 'p', text: 'Use compound when you coat hundreds of pieces without tempering, the kitchen sits hot, guest expectation is “chocolate flavour and a set coating,” or cost per kilogram must stay in a volume-bakery band. Compound can snap too when handled per its supplier — **snap is not proof of authenticity**.' },
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
          { type: 'p', text: 'In summer heat: work early or in AC; keep moulds dry; prefer a cool pantry over the fridge (condensation → sugar bloom). Summer couverture shipments need insulated thinking — another reason volume bakeries like compound for travel-stable coatings.' },
        ],
      },
      {
        heading: 'Indian cacao and couverture',
        blocks: [
          { type: 'p', text: 'India grows cacao mainly in Andhra Pradesh, Kerala, Karnataka and Tamil Nadu, often as shade intercrop. When you buy **couverture chocolate in India**, ask whether the cacao is Indian, blended or imported, and what the principal fat is. Those answers beat the pouch photo.' },
        ],
      },
      {
        heading: 'How COCO36 will stock this',
        blocks: [
          { type: 'p', text: 'December hero plan: **Indian-origin dark couverture** in a baker-friendly pack (including 1 kg). Until live:' },
          { type: 'ul', items: [
            '[Cocoa & chocolate](/ingredients/cocoa-chocolate)',
            '[Guides hub](/guides)',
            '[Shop](/shop)',
            'Placeholder PDP: [/shop/indian-dark-couverture](/shop/indian-dark-couverture)',
            'Category [/shop/category/couverture](/shop/category/couverture) stays noindex until stocked',
          ] },
          { type: 'p', text: 'We will not call couverture “pure” or “100%” unless the product is literally single-ingredient cacao. Couverture is a recipe. No Coco36 fat %, cocoa %, farm or stock claims until supplier docs are confirmed on the PDP.' },
        ],
      },
    ],
    faqs: [
      { q: 'Is compound chocolate the same as couverture?', a: 'No. Couverture is cocoa-butter-rich real chocolate. Compound’s principal fat matrix differs (typically other vegetable fats). Always read the label — some compounds may still list a little cocoa butter.' },
      { q: 'Can I temper compound like couverture?', a: 'Classical cocoa-butter tempering generally does not apply the same way. Manufacturers note compounds generally do not require tempering. Follow the supplier sheet.' },
      { q: 'Why does a 1 kg couverture block often cost more?', a: 'Cocoa butter is costly relative to many bakery coating fats, and higher-fluidity couverture uses more of it. Origin and brand also move price. Compare ingredients, not only the sticker.' },
      { q: 'Does a clean snap prove I bought couverture?', a: 'No. Thickness, process and compound formulations can also snap. Snap is a handling result, not a purity test.' },
      { q: 'Does couverture need a fridge in Indian summers?', a: 'Usually a cool, dry, airtight pantry is kinder. Fridge humidity causes condensation and sugar bloom.' },
      { q: 'Will COCO36 sell Indian-origin couverture?', a: 'Yes — planned December hero SKU. Pack sizes, ingredients and price publish when stock is confirmed. No availability claim until then.' },
    ],
    related: [
      { href: '/guides', label: 'Guides hub' },
      { href: '/ingredients/cocoa-chocolate', label: 'Cocoa & chocolate' },
      { href: '/guides/natural-vs-dutch-cocoa', label: 'Natural vs Dutch cocoa' },
      { href: '/shop', label: 'Shop' },
      { href: '/shop/indian-dark-couverture', label: 'Indian dark couverture (planned)' },
    ],
  },
  {
    path: '/guides/natural-vs-dutch-cocoa',
    title: 'Natural vs Dutch Cocoa Powder for Baking | COCO36',
    description: 'Natural vs Dutch-process cocoa for cakes and hot chocolate in India — acidity, colour, baking soda vs powder, and how to choose by recipe.',
    schemaDescription: 'Natural vs Dutch-process cocoa for cakes and hot chocolate in India — acidity, colour, baking soda vs powder, and how to choose by recipe.',
    h1: 'Natural vs Dutch-process cocoa powder: which one for your bake',
    crumb: 'Natural vs Dutch cocoa',
    updated: '2026-11-09',
    sections: [
      {
        blocks: [
          { type: 'p', text: 'Cocoa powder looks simple: a brown pouch next to the maida. In the bowl it is not. **Natural** and **Dutch-process** (alkalised) cocoa taste different, colour differently, and change how a batter’s **acid / leavener balance** behaves.' },
          { type: 'p', text: '**Dark colour doesn’t tell you everything.** A darker spoon is not a universal flavour or quality ranking.' },
          { type: 'p', text: 'COCO36 comes at cocoa from farm and pastry: Rohan’s roots are in a West Godavari farming family. Wider cacao story: [Cocoa & chocolate](/ingredients/cocoa-chocolate). Cluster hub: [Guides](/guides). Dutch-process cocoa is planned as a December reorder staple — PDP only when stock is live.' },
        ],
      },
      {
        heading: 'What cocoa powder is',
        blocks: [
          { type: 'p', text: 'After fermentation, drying, roasting and grinding into cocoa mass, pressing removes cocoa butter; the cake is milled into powder. “Unsweetened cocoa powder” means this ingredient — not a sweetened drinking mist.' },
        ],
      },
      {
        heading: 'Natural cocoa powder',
        blocks: [
          { type: 'p', text: 'Natural cocoa is not alkalised. It is often lighter to medium brown, sharper and more acidic, and can contribute acid that **baking soda** needs in some formulas.' },
        ],
      },
      {
        heading: 'Dutch-process (alkalised) cocoa',
        blocks: [
          { type: 'p', text: 'Dutch-process cocoa is treated with an alkaline solution that **reduces acidity**, generally darkens colour and alters flavour (practical bakery references such as [King Arthur — Dutch-process vs natural cocoa](https://www.kingarthurbaking.com/blog/2020/07/15/dutch-process-vs-natural-cocoa)). It is often milder and disperses well in drinks. Many bakery sponges pair it with **baking powder**.' },
          { type: 'p', text: 'We do not publish fictitious pH meter readouts. Process direction is qualitative unless a supplier sheet gives a measured value for that batch.' },
        ],
      },
      {
        heading: 'Natural vs Dutch: useful pairs (not absolute laws)',
        blocks: [
          { type: 'table', headers: ['Situation', 'Often works', 'Caution'], rows: [
            ['Baking-powder-led chocolate cake', 'Either cocoa; Dutch common for darker crumb', 'Follow the whole tested formula'],
            ['Baking-soda-led cake that relies on cocoa’s acidity', 'Natural is the classic partner', 'Dutch can still work if **other acids** in the formula supply balance'],
            ['Hot chocolate / sauces', 'Dutch often mellower and easier to dissolve', 'Natural is fine if you whisk and accept brighter taste'],
            ['“Darker = better chocolate” shopping', '—', 'Reject the shortcut'],
          ] },
          { type: 'p', text: '**Avoid the absolute rule** “natural always soda / Dutch always powder.” [King Arthur’s soda vs powder](https://www.kingarthurbaking.com/blog/2021/09/10/baking-soda-vs-baking-powder-substitutions) and [A-B-Cs of cocoa](https://www.kingarthurbaking.com/blog/2014/01/10/the-a-b-cs-of-cocoa) guidance: soda needs an acidic partner; powder brings its own acid/base system; cocoa is not the only possible acid. Do not import one blog’s substitution ratios as universal conversions.' },
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
            'In eggless cakes using vinegar + soda, natural cocoa adds to that acid system; swapping Dutch without adjusting acids can change rise — test a half batch.',
          ] },
          { type: 'p', text: 'Brownies are more forgiving on lift; taste and colour still shift with the swap.' },
        ],
      },
      {
        heading: 'Cocoa powder for hot chocolate',
        blocks: [
          { type: 'p', text: 'Dutch-process usually dissolves cooperatively and tastes less sharp in milk. Natural can taste brighter. Add sugar (or jaggery — see [sugars & jaggery](/ingredients/sugars-jaggery)) separately. Neither powder is a sweetened premix. Café hot chocolate sometimes starts from melted chocolate or ganache instead.' },
        ],
      },
      {
        heading: 'Fat percentage',
        blocks: [
          { type: 'p', text: 'Residual fat varies by press. When COCO36 lists a Dutch cocoa, fat % will come from **our supplier documentation** on the PDP — not invented competitor numbers. Prefer similar fat contents when comparing two cocoas in a side-by-side bake and document differences.' },
        ],
      },
      {
        heading: 'Practical guidance: one powder-led recipe, two cocoas',
        blocks: [
          { type: 'p', text: 'Aligns with Ingredient Notes · 02: illustrate substitution in a **pre-tested baking-powder-led** mini-cake. This does **not** prove that Dutch cocoa “fails” with soda, and it does not isolate alkalisation from fat/roast/origin.' },
          { type: 'ol', items: [
            'Confirm both pouches are labelled natural vs Dutch-process by the supplier.',
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
          { type: 'p', text: 'Packs sold as “cocoa powder,” “dutch cocoa,” “alkalised cocoa” or “natural cocoa” are not always explicit. Look for:' },
          { type: 'ul', items: [
            'The words **natural** or **Dutch-process / alkalised**',
            '“Unsweetened” vs sugar in the ingredients',
            'Any fat percentage on bakery-facing SKUs',
            'A lot or batch code if you buy trade sizes',
          ] },
          { type: 'p', text: 'If the pouch only says “cocoa powder,” treat process as unknown until the brand confirms. Colour alone will mislead you — some natural cocoas run fairly dark; some Dutch cocoas are reddish rather than black.' },
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
          { type: 'p', text: 'Dutch-process cocoa is a planned **steady reorder** hero. Until live: this guide, [Guides](/guides), [Shop](/shop), placeholder [/shop/dutch-process-cocoa-powder](/shop/dutch-process-cocoa-powder). No stock, origin or certification claim without docs.' },
        ],
      },
    ],
    faqs: [
      { q: 'Can I swap Dutch-process for natural in any recipe?', a: 'No blanket yes. Flavour-only uses are often flexible. Where soda depends on natural cocoa’s acidity, Dutch can flatten rise unless other acids balance the formula. Follow a tested recipe.' },
      { q: 'Which cocoa is better for hot chocolate?', a: 'Dutch-process is usually mellower and easier to dissolve. Natural works if you whisk well. Sweetness is separate.' },
      { q: 'Is Dutch-process “less healthy”?', a: 'We make **no health, antioxidant or diabetic claims** for either process. Choose by recipe performance.' },
      { q: 'Does darker cocoa mean better cocoa?', a: 'No. Darkness is not a universal quality scale.' },
      { q: 'What does unsweetened mean?', a: 'No added sugar in the powder. Your drink still needs sweetening if you want it sweet.' },
      { q: 'Will COCO36 sell cocoa powder?', a: 'Dutch-process is a planned December hero. Details on the PDP when stock is confirmed.' },
    ],
    related: [
      { href: '/guides', label: 'Guides hub' },
      { href: '/ingredients/cocoa-chocolate', label: 'Cocoa & chocolate' },
      { href: '/guides/couverture-vs-compound', label: 'Couverture vs compound' },
      { href: '/ingredients/sugars-jaggery', label: 'Sugars & jaggery' },
      { href: '/shop', label: 'Shop' },
      { href: '/shop/dutch-process-cocoa-powder', label: 'Dutch-process cocoa powder (planned)' },
    ],
  },
  {
    path: '/guides/pistachio-paste-dubai-chocolate-at-home',
    title: 'Pistachio Paste vs Cream & Dubai Chocolate | COCO36',
    description: 'Pistachio paste vs cream for Indian bakers, plus a Dubai-style kataifi chocolate bar method using 100% unsweetened paste — label first.',
    schemaDescription: 'Pistachio paste vs cream for Indian bakers, plus a Dubai-style kataifi chocolate bar method using 100% unsweetened paste.',
    h1: 'Pistachio paste vs pistachio cream, and how to make Dubai chocolate at home',
    crumb: 'Pistachio paste',
    updated: '2026-11-09',
    sections: [
      {
        blocks: [
          { type: 'p', text: '**Dubai chocolate? Start with the label.**' },
          { type: 'p', text: 'The viral bar — chocolate shell, crunchy kunafa (kataifi), pistachio, often tahini — made pistachio jars fly off Indian specialty shelves. It also blurred **pistachio paste** and **pistachio cream**. This guide separates them, then walks a **Dubai-style / kunafa chocolate** method you can test at home.' },
          { type: 'p', text: 'COCO36 sources origin ingredients for Indian bakers. Pistachio paste is a December hero candidate as **pure 100% pistachio paste, unsweetened** — never marketed as cream. Hub: [Guides](/guides). Chocolate technique: [Cocoa & chocolate](/ingredients/cocoa-chocolate), [Couverture vs compound](/guides/couverture-vs-compound).' },
        ],
      },
      {
        heading: 'What 100% pistachio paste means',
        blocks: [
          { type: 'p', text: 'A verified **100% pistachio paste** is pistachios ground to a paste **without added sugar** (reference example: [Callebaut Pure Pistachio Paste](https://www.callebaut.com/en/products/callebaut/nuts-pure-pistachio-paste/NPO-PI1-2B-18A) — explicitly 100% pistachio and unsweetened).' },
          { type: 'p', text: 'On a COCO36 page we will say **pure 100% pistachio paste, unsweetened** only when that is true.' },
          { type: 'p', text: 'Pure paste lets the maker **choose the sweetness** in a filling. It is **not** a ready-made sweetened filling and **not** an automatic 1:1 swap for cream.' },
        ],
      },
      {
        heading: 'What pistachio cream usually is',
        blocks: [
          { type: 'p', text: 'Sweetened pistachio cream / spread typically adds sugar and often oils, milk powders or cocoa butter. One transparent manufacturer example is Pistì’s cream declaration (pistachio plus sugar, milk powders, oils and other listed ingredients — see [Pistì premium pack ingredients](https://shop.pisti.it/en/products/pistachio-spreadable-cream-in-premium-pack)). That is **one example**, not every cream on earth.' },
          { type: 'p', text: 'Sweetened creams can be valid for other jobs. We do **not** call all green creams fake, dyed or low quality. **Colour is not the ingredient list.**' },
          { type: 'table', headers: ['Jar claim', 'Composition idea', 'Dubai-style filling'], rows: [
            ['100% / unsweetened paste', 'Pistachios', 'Best control — you add sugar / white chocolate / tahini per recipe'],
            ['Sweetened cream / spread', 'Pistachios + sugar + other fats/milk', 'Convenient; different sugar/fat balance'],
            ['“Dubai filling” mix', 'Variable', 'Only if ingredients are clear'],
          ] },
        ],
      },
      {
        heading: 'Buying pistachio paste in India',
        blocks: [
          { type: 'ol', items: [
            'Ingredients should read pistachios (or roasted pistachios) for true paste.',
            'Neon green ≠ purity.',
            'Natural paste separates; stir.',
            'Ask for aflatoxin CoA on wholesale lots before retail packing.',
            '“Made in India” often means domestic milling of imported kernels — fine if disclosed.',
          ] },
          { type: 'p', text: 'COCO36’s December path (pending Rohan’s OK to contact suppliers): **India-stock 100% paste** + FSSAI repack — not a last-minute import container.' },
        ],
      },
      {
        heading: 'Practical guidance: paste vs cream on a spoon',
        blocks: [
          { type: 'p', text: 'Taste a gram of each neat, then whisk small equal amounts into warm milk. Compare sweetness and whether pistachio flavour survives. Keep paste for recipe control; use cream when you want a ready sweet spread.' },
        ],
      },
      {
        heading: 'Dubai-style kataifi chocolate bar (adapted home method)',
        blocks: [
          { type: 'p', text: '**Cite, don’t invent origin stories.** Workflow inspiration: Callebaut / Frank Carrieri’s [Dubai Bar](https://www.callebaut.com/en/recipes/dubai-bar/4898) (toast kataifi; fill pre-cast tempered shells). Pure-paste filling reference: Callebaut / Yeşim Erol’s [Dubai chocolate bar](https://www.callebaut.com/en/recipes/yesims-dubai-chocolate-bar/4942) — published reference uses white chocolate + pure paste + tahini + kataifi (example scale: 160 g white chocolate, 500 g pure paste, 50 g tahini, 150 g kataifi; one-fifth test ~32 / 100 / 10 / 30 g). That Carrieri recipe’s sweetness balance uses sweetened praline — **do not gram-for-gram replace praline with pure paste**.' },
          { type: 'p', text: 'Below is a **practice framework** for home kitchens. Not a Coco36 shelf-life or sale specification. Contains pistachio (tree nut) and wheat; sesame/milk/soy if tahini or white chocolate / milk couverture are used.' },
          { type: 'h3', text: 'Ingredients (starting point for one medium bar — adjust after trial)' },
          { type: 'ul', items: pistachioIngredients },
          { type: 'h3', text: 'Method' },
          { type: 'ol', items: pistachioSteps },
          { type: 'h3', text: 'Guidance notes' },
          { type: 'ul', items: [
            'Oil weep → filling too loose or kataifi still warm.',
            'Bloom → temper/storage — see cocoa guides.',
            '“Choose the sweetness” means recipe control, not a sugar-free finished bar.',
          ] },
        ],
      },
      {
        heading: 'Why “paste or cream?” belongs in the reel',
        blocks: [
          { type: 'p', text: 'Our Ingredient Notes reel for this topic opens on a bar break, then on two real ingredient panels. The educational job is **label literacy**, not dunking sweetened cream as a category. Creams earn their place on toast and in some ready fillings. Paste earns its place when you are building a filling whose sugar and fat you want to specify yourself — including a Dubai-style centre that should taste of pistachio and toasted pastry, not only of sugar.' },
          { type: 'p', text: 'If a jar is neon green and the ingredient list is long, believe the list. If a 100% paste looks quieter in colour than social media fillings, that can still be correct.' },
        ],
      },
      {
        heading: 'Gift-bar notes for December',
        blocks: [
          { type: 'p', text: 'Handmade Dubai-style bars make sense as December gifts and New Year sharing boards when shells are properly tempered and fillings are cool and crisp. Keep allergen labelling honest on any gift tag (pistachio, wheat; sesame/milk/soy as used). Do not invent a shelf life from a foreign recipe PDF — validate for your kitchen and climate, especially monsoon-adjacent storage in coastal cities.' },
        ],
      },
      {
        heading: 'Food safety and labelling',
        blocks: [
          { type: 'p', text: 'Allergen-label pistachio and wheat; sesame/milk/soy as used. No health-food positioning. No unsourced “trend will keep growing” claim. “Dubai-style” describes format, not geographic certification.' },
        ],
      },
      {
        heading: 'How COCO36 will sell this',
        blocks: [
          { type: 'p', text: 'Planned hero wording: **pure 100% pistachio paste, unsweetened**. Placeholder [/shop/pistachio-paste](/shop/pistachio-paste). Until live, this guide + [Shop](/shop) only — no product CTA inventing stock.' },
        ],
      },
    ],
    faqs: [
      { q: 'Paste vs cream?', a: 'Paste should be pistachios without added sugar. Cream usually adds sugar and often oils or milk. Different jobs; not a 1:1 swap.' },
      { q: 'Can I use cream in Dubai-style bars?', a: 'Yes with adjusted sugar — expect a different balance. Paste gives cleaner control.' },
      { q: 'What is kunafa chocolate?', a: 'Common name for Dubai-style bars with toasted kataifi and pistachio inside chocolate.' },
      { q: 'Is paste available in India?', a: 'Yes via specialty shops and millers. Read ingredients every time.' },
      { q: 'Do I need tempered couverture?', a: 'Best for glossy snappy moulds. Follow the shell chocolate’s tempering instructions — they vary.' },
      { q: 'Will COCO36 sell pistachio paste?', a: 'Planned if supplier CoA/origin checks and Rohan’s approval clear. Page will say pure 100% pistachio paste, unsweetened — never cream — when true.' },
    ],
    related: [
      { href: '/guides', label: 'Guides hub' },
      { href: '/guides/couverture-vs-compound', label: 'Couverture vs compound' },
      { href: '/guides/natural-vs-dutch-cocoa', label: 'Natural vs Dutch cocoa' },
      { href: '/ingredients/cocoa-chocolate', label: 'Cocoa & chocolate' },
      { href: '/shop', label: 'Shop' },
      { href: '/shop/pistachio-paste', label: 'Pistachio paste (planned)' },
    ],
    recipe: {
      name: 'Dubai-style kataifi pistachio chocolate bar (home adaptation)',
      description: 'Adapted home method: toasted kataifi folded into a 100% pistachio-paste filling, sealed in tempered chocolate.',
      recipeCuisine: 'Indian home baking',
      recipeCategory: 'Dessert',
      recipeYield: '1 medium bar',
      ingredients: pistachioIngredients,
      steps: pistachioSteps,
    },
  },
];

export const bakingNoteByPath = (pathname: string) => BAKING_NOTES.find((n) => n.path === pathname);
