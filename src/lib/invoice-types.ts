/**
 * Invoice types — SHARED CONTRACT.
 *
 * ⚠️  MIRROR FILE. The canonical types live in coco36-next/lib/invoices/generate.ts
 *     as `InvoiceBreakup` + `GstLine`. This file mirrors just the shape the
 *     storefront needs to render an invoice. Keep field names + structure
 *     identical to the JSONB persisted in `invoices.gst_breakup`.
 */

export interface GstLine {
  variantId:        string;
  productName:      string;
  sku:              string;
  hsnCode:          string | null;
  sizeLabel:        string;
  qty:              number;
  gstRatePct:       number;
  unitInclPaise:    number;
  netPerUnitPaise:  number;
  gstPerUnitPaise:  number;
  lineNetPaise:     number;
  lineCgstPaise:    number;
  lineSgstPaise:    number;
  lineIgstPaise:    number;
  lineTotalPaise:   number;
}

/** GST on the delivery charges (incl. COD fee). Invoices since Phase 1. */
export interface ShippingTax {
  ratePct:   number;
  netPaise:  number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
}

export interface InvoiceBreakup {
  isIntraState:        boolean;
  sellerState:         string;
  buyerState:          string;
  /** GST state codes (place of supply = buyer). Invoices since Phase 1. */
  sellerStateCode?:    string;
  buyerStateCode?:     string;
  lines:               GstLine[];
  subtotalNetPaise:    number;     // goods only
  /** Totals include the tax on delivery charges when shippingTax is present. */
  totalCgstPaise:      number;
  totalSgstPaise:      number;
  totalIgstPaise:      number;
  totalShippingPaise:  number;     // delivery charges, GST-inclusive
  /** Absent on invoices issued before Phase 1 (shipping was not taxed then). */
  shippingTax?:        ShippingTax;
  totalAmountPaise:    number;
}

/** Settings the invoice template reads — mirror of getSettings() return shape (seller + invoice keys only). */
export interface InvoiceSettings {
  seller: {
    legalName:    string;
    gstin:        string;
    pan:          string;
    addressLine1: string;
    addressLine2: string;
    city:         string;
    state:        string;
    pincode:      string;
    fssaiLicNo:   string;
  };
  invoice: {
    terms:        string;
    bankName:     string;
    bankAccount:  string;
    bankIfsc:     string;
    signatureUrl: string;
    logoUrl:      string;
  };
  storeName: string;
}
