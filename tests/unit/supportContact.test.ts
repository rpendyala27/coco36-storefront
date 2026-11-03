import { describe, expect, it } from 'vitest';
import { isFssaiClaim } from '../../src/lib/fssai';
import { publicSupportEmail, publicSupportPhone, SUPPORT_EMAIL } from '../../src/lib/supportContact';

describe('publicSupportPhone', () => {
  it('hides empty values and the seeded placeholder', () => {
    expect(publicSupportPhone(null)).toBeNull();
    expect(publicSupportPhone(undefined)).toBeNull();
    expect(publicSupportPhone('')).toBeNull();
    expect(publicSupportPhone('   ')).toBeNull();
    expect(publicSupportPhone('+91-00000-00000')).toBeNull();
    expect(publicSupportPhone('+91 00000 00000')).toBeNull();
    expect(publicSupportPhone('0000000000')).toBeNull();
    expect(publicSupportPhone('+910000000000')).toBeNull();
  });

  it('hides other placeholder-looking values and WhatsApp links', () => {
    expect(publicSupportPhone('1111111111')).toBeNull();
    expect(publicSupportPhone('1234567890')).toBeNull();
    expect(publicSupportPhone('n/a')).toBeNull();
    expect(publicSupportPhone('placeholder')).toBeNull();
    expect(publicSupportPhone('https://wa.me/910000000000')).toBeNull();
    expect(publicSupportPhone('WhatsApp +91 00000 00000')).toBeNull();
  });

  it('keeps a real number so it can be shown once settings has one', () => {
    expect(publicSupportPhone('+91 98765 43210')).toBe('+91 98765 43210');
    expect(publicSupportPhone('9876543210')).toBe('9876543210');
  });
});

describe('publicSupportEmail', () => {
  it('falls back to the public inbox', () => {
    expect(publicSupportEmail(null)).toBe(SUPPORT_EMAIL);
    expect(publicSupportEmail('')).toBe(SUPPORT_EMAIL);
    expect(publicSupportEmail('not-an-email')).toBe(SUPPORT_EMAIL);
    expect(publicSupportEmail(' support@coco36.com ')).toBe('support@coco36.com');
  });
});

describe('isFssaiClaim', () => {
  it('matches a licence or badge mention and ignores unrelated copy', () => {
    expect(isFssaiClaim('fssai')).toBe(true);
    expect(isFssaiClaim('FSSAI-licensed')).toBe(true);
    expect(isFssaiClaim('organic', 'FSSAI')).toBe(true);
    expect(isFssaiClaim('organic', 'Organic')).toBe(false);
    expect(isFssaiClaim(null, undefined)).toBe(false);
  });
});
