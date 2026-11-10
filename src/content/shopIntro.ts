import { contactLine, dispatchLine, returnsLine, shippingPriceLine } from './orderFacts.js';
import type { StorePolicy } from '../seo/site.js';

/**
 * Unique body copy for /shop. The homepage introduces COCO36 and lists the
 * same small catalogue, which is why Search Console can fold the two URLs
 * together. This intro is the catalogue page's own text: what the shop is,
 * how to browse it, and the same shipping facts the homepage already states.
 * Word count is held to 120–200 (see tests/unit/seoCopy.test.ts).
 */
export function shopIntro(policy: StorePolicy): string[] {
  return [
    'COCO36 is the full catalogue of specialty baking and pastry ingredients we sell to bakers, pastry chefs and chocolatiers across India. The range is sourced direct from origin: whole vanilla, unrefined cane sugars, speciality flours, finishing salt and kits, from named makers and estates, never through anonymous brokers.',
    'This page lists every ingredient currently in the shop. The homepage is a shorter introduction to the same company, so start here when you want to browse, filter or buy. You can narrow the list by origin, certification and price, or open a category such as extracts and flavours, sugars, flours and grains, spices and pantry, or mixes and kits. Each product page names the ingredient and, where we have it, where it comes from. The ingredient guides explain how vanilla, cocoa, sugars, flours and salt are grown, made and stored.',
    `${dispatchLine()} We ship across India. ${shippingPriceLine(policy)} ${returnsLine(policy)} ${contactLine()}`,
  ];
}
