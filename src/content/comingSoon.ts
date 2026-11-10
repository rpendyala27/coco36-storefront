/**
 * Unlisted ingredients shown as a coming-soon row on /shop.
 * No product pages. Dutch-process cocoa only — natural cocoa is not offered.
 */

export const COMING_SOON_NOTE = 'coming soon to the COCO36 shop';

export const COMING_SOON = [
  { key: 'japanese-matcha', name: 'Japanese matcha' },
  { key: 'whole-vanilla-beans', name: 'Whole vanilla beans' },
  { key: 'pistachio-paste', name: 'Pistachio paste' },
  { key: 'dutch-process-cocoa-powder', name: 'Dutch-process cocoa powder' },
  { key: 'cocoa-butter', name: 'Cocoa butter' },
  { key: 'palm-jaggery', name: 'Palm jaggery' },
  { key: 'couverture', name: 'Couverture' },
  { key: 'coconut-sugar', name: 'Coconut sugar' },
] as const;

export type ComingSoonKey = (typeof COMING_SOON)[number]['key'];

const KEYS = new Set<string>(COMING_SOON.map((item) => item.key));

export function comingSoonByKey(key: string): (typeof COMING_SOON)[number] | undefined {
  return COMING_SOON.find((item) => item.key === key);
}

export function isComingSoonKey(key: string): key is ComingSoonKey {
  return KEYS.has(key);
}
