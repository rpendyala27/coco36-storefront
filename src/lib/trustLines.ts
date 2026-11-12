import { businessDayPhrase, rupees } from '../seo/site';

/**
 * The trust band's plain lines. The three numbers come from live config.
 * A missing number is left out. Nothing here is a guessed default.
 */
export function trustLines(input: {
  handlingDays?: number | null;
  freeShippingPaise?: number | null;
  returnWindowDays?: number | null;
} = {}): string[] {
  const lines = ['Traceable to origin', 'Sealed original packs'];
  const days = input.handlingDays;
  if (typeof days === 'number' && Number.isInteger(days) && days >= 1) {
    lines.push(`Ships in ${businessDayPhrase(String(days))}`);
  }
  const paise = input.freeShippingPaise;
  if (typeof paise === 'number' && Number.isFinite(paise) && paise > 0) {
    lines.push(`Free shipping over ${rupees(paise)}`);
  }
  const returns = input.returnWindowDays;
  if (typeof returns === 'number' && Number.isInteger(returns) && returns >= 1) {
    lines.push(`${returns}-day returns`);
  }
  lines.push('Secure checkout with Razorpay');
  return lines;
}

/** Only fields the live config actually returned. Defaults do not count. */
export function trustLinesFromConfig(cfg: {
  handlingDays?: number;
  freeShippingPaise?: number;
  returnWindowDays?: number;
  sourced?: {
    handlingDays?: boolean;
    freeShippingPaise?: boolean;
    returnWindowDays?: boolean;
  };
}): string[] {
  const sourced = cfg.sourced;
  return trustLines({
    handlingDays: sourced?.handlingDays ? cfg.handlingDays : undefined,
    freeShippingPaise: sourced?.freeShippingPaise ? cfg.freeShippingPaise : undefined,
    returnWindowDays: sourced?.returnWindowDays ? cfg.returnWindowDays : undefined,
  });
}
