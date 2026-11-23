import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { InvoiceBreakup, InvoiceSettings } from '../../src/lib/invoice-types';

/**
 * Customer invoice seller block. public.customer_invoice_header() supplies
 * legal name, address, GSTIN and FSSAI. PAN and bank details are never printed.
 * A failed or empty call leaves the block off; the invoice still renders.
 */

const rpc = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/supabase', () => ({
  supabase: { rpc, from },
  isSupabaseConfigured: true,
  API_URL: '',
  initialAuthLink: { recovery: false, error: null },
}));

const { loadInvoiceSettings } = await import('../../src/lib/invoiceHeader');
const { InvoiceTemplate } = await import('../../src/components/InvoiceTemplate');

const HEADER = {
  legal_name: 'COCO36 Foods Pvt Ltd',
  address_line1: '12 Harbour Road',
  address_line2: 'Industrial Estate',
  city: 'Test City',
  state: 'Test State',
  pincode: '500001',
  gstin: '37AAAAA0000A1Z5',
  fssai_lic_no: '10000000000000',
  pan: 'BBBBB9999B',
  bank_name: 'Test Bank',
  bank_account: '000111222333',
  bank_ifsc: 'TEST0000001',
};

const BREAKUP: InvoiceBreakup = {
  isIntraState: true,
  sellerState: 'Test State',
  buyerState: 'Test State',
  sellerStateCode: '37',
  buyerStateCode: '37',
  lines: [{
    variantId: 'v1',
    productName: 'Vanilla beans',
    sku: 'VAN-100',
    hsnCode: '0905',
    sizeLabel: '100 g',
    qty: 1,
    gstRatePct: 5,
    unitInclPaise: 10500,
    netPerUnitPaise: 10000,
    gstPerUnitPaise: 500,
    lineNetPaise: 10000,
    lineCgstPaise: 250,
    lineSgstPaise: 250,
    lineIgstPaise: 0,
    lineTotalPaise: 10500,
  }],
  subtotalNetPaise: 10000,
  totalCgstPaise: 250,
  totalSgstPaise: 250,
  totalIgstPaise: 0,
  totalShippingPaise: 0,
  totalAmountPaise: 10500,
};

const settingKeys: string[] = [];

function mockStoreName(value: string | null = 'COCO36 Store') {
  from.mockImplementation((table: string) => {
    if (table !== 'settings') throw new Error(`unexpected table ${table}`);
    const builder = {
      select() { return builder; },
      eq(_column: string, key: string) {
        settingKeys.push(key);
        return builder;
      },
      maybeSingle: async () => ({
        data: value == null ? null : { key: 'store.name', value },
        error: null,
      }),
    };
    return builder;
  });
}

function htmlFor(settings: InvoiceSettings): string {
  return renderToStaticMarkup(createElement(InvoiceTemplate, {
    invoiceNumber: 'INV-1001',
    invoiceDate: new Date('2026-11-01T00:00:00+05:30'),
    orderNumber: 'C36-1001',
    orderDate: new Date('2026-11-01T00:00:00+05:30'),
    paymentMethod: 'prepaid',
    customer: { name: 'Asha Rao', email: 'asha@example.com', phone: '9000000000', gstin: null },
    ship: { name: 'Asha Rao', line1: '1 Test Lane', line2: '', city: 'Test City', state: 'Test State', pincode: '500001' },
    breakup: BREAKUP,
    settings,
  }));
}

beforeEach(() => {
  settingKeys.length = 0;
  rpc.mockReset();
  from.mockReset();
  mockStoreName();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('customer invoice header', () => {
  it('renders the seller block from customer_invoice_header', async () => {
    rpc.mockResolvedValue({ data: HEADER, error: null });
    const settings = await loadInvoiceSettings();
    const html = htmlFor(settings);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('customer_invoice_header');
    expect(settingKeys).toEqual(['store.name']);
    expect(settings.seller).toMatchObject({
      legalName: 'COCO36 Foods Pvt Ltd',
      addressLine1: '12 Harbour Road',
      addressLine2: 'Industrial Estate',
      city: 'Test City',
      state: 'Test State',
      pincode: '500001',
      gstin: '37AAAAA0000A1Z5',
      fssaiLicNo: '10000000000000',
    });
    expect(settings.seller).not.toHaveProperty('pan');
    expect(html).toContain('COCO36 Foods Pvt Ltd');
    expect(html).toContain('12 Harbour Road');
    expect(html).toContain('Test City, Test State — 500001');
    expect(html).toContain('GSTIN:');
    expect(html).toContain('37AAAAA0000A1Z5');
    expect(html).toContain('FSSAI:');
    expect(html).toContain('10000000000000');
    expect(html).toContain('INV-1001');
    expect(html).toContain('Generated via COCO36 Store');
  });

  it('hides the FSSAI line when the licence number is absent', async () => {
    for (const fssai of [null, '', '   ']) {
      rpc.mockResolvedValueOnce({ data: { ...HEADER, fssai_lic_no: fssai }, error: null });
      const settings = await loadInvoiceSettings();
      const html = htmlFor(settings);
      expect(settings.seller?.fssaiLicNo).toBeNull();
      expect(html).toContain('GSTIN:');
      expect(html).toContain('COCO36 Foods Pvt Ltd');
      expect(html).not.toContain('FSSAI');
      expect(html).not.toContain('10000000000000');
    }
  });

  it('never renders PAN or bank details', async () => {
    rpc.mockResolvedValue({ data: HEADER, error: null });
    const html = htmlFor(await loadInvoiceSettings());
    expect(html).not.toContain('PAN:');
    expect(html).not.toContain('BBBBB9999B');
    expect(html).not.toContain('Bank Details');
    expect(html).not.toContain('Test Bank');
    expect(html).not.toContain('A/c:');
    expect(html).not.toContain('000111222333');
    expect(html).not.toContain('IFSC:');
    expect(html).not.toContain('TEST0000001');
  });

  it('renders the invoice without the seller block when the RPC errors or is empty', async () => {
    const leaked = 'header-call-failed-detail';
    rpc.mockResolvedValueOnce({ data: null, error: { message: leaked, code: 'PGRST202' } });
    const onError = await loadInvoiceSettings();
    const errorHtml = htmlFor(onError);

    expect(onError.seller).toBeNull();
    expect(errorHtml).toContain('Tax Invoice');
    expect(errorHtml).toContain('INV-1001');
    expect(errorHtml).toContain('Vanilla beans');
    expect(errorHtml).not.toContain('COCO36 Foods Pvt Ltd');
    expect(errorHtml).not.toContain('GSTIN:');
    expect(errorHtml).not.toContain('FSSAI');
    expect(errorHtml).not.toContain(leaked);
    expect(console.error).toHaveBeenCalledWith('[invoice] customer_invoice_header unavailable');
    for (const call of vi.mocked(console.error).mock.calls) {
      expect(JSON.stringify(call)).not.toContain(leaked);
    }

    vi.mocked(console.error).mockClear();
    rpc.mockResolvedValueOnce({
      data: {
        legal_name: null,
        address_line1: '   ',
        address_line2: null,
        city: null,
        state: null,
        pincode: null,
        gstin: null,
        fssai_lic_no: '',
      },
      error: null,
    });
    const empty = await loadInvoiceSettings();
    const emptyHtml = htmlFor(empty);
    expect(empty.seller).toBeNull();
    expect(emptyHtml).toContain('INV-1001');
    expect(emptyHtml).not.toContain('GSTIN:');
    expect(emptyHtml).not.toContain('FSSAI');
    expect(console.error).not.toHaveBeenCalled();

    rpc.mockRejectedValueOnce(new Error(leaked));
    const thrown = await loadInvoiceSettings();
    expect(thrown.seller).toBeNull();
    expect(htmlFor(thrown)).toContain('INV-1001');
    for (const call of vi.mocked(console.error).mock.calls) {
      expect(JSON.stringify(call)).not.toContain(leaked);
    }
  });
});
