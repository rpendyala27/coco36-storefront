/** "usda-organic" → "USDA Organic". Pure so the server snapshot can label a claim. */
const ACRONYMS = new Set(['usda', 'brc', 'brcgs', 'fssai', 'npop', 'gmp', 'iso', 'haccp', 'fsc', 'eu']);

export function certLabel(type: string): string {
  return type.split('-').map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}
