import { WHOLESALE_GUIDE_PATH } from './wholesaleGuide.js';

/**
 * "Buying in bulk?" appears only when a catalogue product is one of the
 * wholesale ingredients that have a page. Editorial pages for these
 * ingredients do not exist yet; coming-soon rows are not pages.
 */
const KINDS: { id: string; test: (name: string) => boolean }[] = [
  { id: 'cocoa-butter', test: (name) => /\bcocoa butter\b/i.test(name) },
  { id: 'dutch-cocoa', test: (name) => /dutch/i.test(name) && /\bcocoa\b/i.test(name) },
  { id: 'couverture', test: (name) => /\bcouverture\b/i.test(name) },
  { id: 'coconut-sugar', test: (name) => /\bcoconut sugar\b/i.test(name) },
  { id: 'palm-jaggery', test: (name) => /palm (?:sugar )?jaggery/i.test(name) },
];

export function wholesaleProductKind(name: string): string | null {
  return KINDS.find((kind) => kind.test(name))?.id ?? null;
}

export function bulkGuideHref(name: string): string | null {
  return wholesaleProductKind(name) ? WHOLESALE_GUIDE_PATH : null;
}
