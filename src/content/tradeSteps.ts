import { WHOLESALE_GUIDE_PATH, WHOLESALE_PAYMENT } from './wholesaleGuide.js';

/** Four-step strip on /trade. The full explainer stays on the wholesale guide. */
export const TRADE_STEPS = [
  { n: '01', title: 'Enquire', body: 'Tell us the products, pack sizes and roughly how much you use. We come back with availability, a quote and lead times.' },
  { n: '02', title: 'Trial pack', body: 'Trial packs available once launch stock lands (from early December). Sizes: 1 kg, or 500 g for cocoa butter. Paid packs, not free samples.' },
  { n: '03', title: 'First order', body: `After you have tried a pack, place a first wholesale order at the product minimum. ${WHOLESALE_PAYMENT} Minimums are in the guide.` },
  { n: '04', title: 'Scale up', body: 'Move to larger, repeat or standing orders as your kitchen needs grow.' },
] as const;

export const TRADE_GUIDE_HREF = WHOLESALE_GUIDE_PATH;
export const TRADE_GUIDE_LABEL = 'Read the full wholesale guide';
