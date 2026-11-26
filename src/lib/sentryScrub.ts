/**
 * Scrub shopper emails, phone numbers, postal addresses, PIN codes, and secrets out of Sentry events
 * and breadcrumbs before they leave the process. Used by the browser SDK
 * and the Node server function. No I/O.
 */

const REDACTED = '[Redacted]';

/**
 * Substring match for the long, specific names. Short names (`tel`, `token`,
 * `pin`, `zip`, `city`, `line1`) are bounded so `hotel`, `product_key`,
 * `spin`, `mapping`, `unzip` and `capacity` stay intact. camelCase is split
 * first, so `zipCode` and `pinCode` are bounded like `zip_code`.
 */
function isSensitiveKey(key: string): boolean {
  if (/email|e-mail|phone|mobile|whatsapp|telephone|authorization|api[-_]?key|cookie|password|secret|credential|service[-_]?role|sentry[-_]test/i.test(key)) {
    return true;
  }
  if (/address|street|pincode|pin[-_]code|postal|postcode|post[-_]code|zipcode/i.test(key)) {
    return true;
  }
  const split = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2');
  return /(^|[^a-z])(tel|token|pin|zip|city|line[-_]?[12])([^a-z0-9]|$)/i.test(split);
}

function redactString(value: string): string {
  return redactPhones(
    stripSentryTestQuery(value)
      .replace(/\b(?:sb_secret_|sntrys_|sntryu_|re_)[A-Za-z0-9_-]{8,}/g, REDACTED)
      .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, REDACTED)
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED),
  );
}

/** A phone number, not an order id or a commit SHA buried in a longer string. */
function redactPhones(value: string): string {
  return value.replace(/\+?\d[\d\s().-]{8,}\d/g, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return match;
    const formatted = /[+\s().-]/.test(match);
    const whole = value.trim() === match.trim();
    return formatted || whole ? REDACTED : match;
  });
}

function stripSentryTestQuery(value: string): string {
  return value
    .replace(/([?&#])sentry_test=[^&#]*/gi, '$1')
    .replace(/(^|[?&])sentry_test=[^&#]*/gi, '$1')
    .replace(/\?&/g, '?')
    .replace(/[?&](?=#|$)/g, '')
    .replace(/^&/, '');
}

function scrub(value: unknown, seen: WeakSet<object>): void {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value as object)) return;
  seen.add(value as object);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const item = value[i];
      if (typeof item === 'string') value[i] = redactString(item);
      else scrub(item, seen);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (isSensitiveKey(key)) {
      record[key] = REDACTED;
      continue;
    }
    const child = record[key];
    if (typeof child === 'string') record[key] = redactString(child);
    else scrub(child, seen);
  }
}

/** Mutates and returns the event or breadcrumb. Non-objects pass through. */
export function scrubSentryEvent<T>(event: T): T {
  if (!event || typeof event !== 'object') return event;
  scrub(event, new WeakSet());
  return event;
}
