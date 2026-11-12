import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProductCard } from '../../src/components/ProductCard';
import { lockBodyScroll } from '../../src/components/NotifyMe';
import {
  hasOutOfStockDesignation,
  OUT_OF_STOCK_PILL,
  showOutOfStockPill,
} from '../../src/lib/outOfStockBadge';
import type { Product, ProductTag, TagKind } from '../../src/types';

vi.mock('../../src/context/CartContext', () => ({
  useCart: () => ({ addItem: () => {} }),
}));

const tag = (slug: string, label: string, kind: TagKind): ProductTag => ({ slug, label, kind });

function product(partial: Partial<Product> & Pick<Product, 'sizes'>): Product {
  return {
    id: 'cocoa',
    name: 'Black Dutch-process cocoa',
    brand: 'COCO36',
    origin: 'Ghana',
    tag: '',
    image: '',
    category: 'Cocoa & Chocolate',
    description: '',
    ...partial,
  };
}

const soldOut = [{ id: 'v1', label: '250 g', priceInPaise: 45000, inStock: false }];
const inStock = [{ id: 'v1', label: '250 g', priceInPaise: 45000, inStock: true }];
const mixed = [
  { id: 'v1', label: '250 g', priceInPaise: 45000, inStock: false },
  { id: 'v2', label: '1 kg', priceInPaise: 120000, inStock: true },
];

const oos = tag('out-of-stock', 'Out of Stock', 'designation');
const bestseller = tag('bestseller', 'Bestseller', 'designation');

function card(p: Product): string {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ProductCard, { product: p })));
}

describe('out of stock designation', () => {
  it('matches the designation by slug or label, not by other tag kinds', () => {
    expect(hasOutOfStockDesignation(product({ sizes: soldOut, tags: [oos] }))).toBe(true);
    expect(hasOutOfStockDesignation(product({
      sizes: soldOut,
      tags: [tag('out_of_stock', 'Temporarily unavailable', 'designation')],
    }))).toBe(true);
    expect(hasOutOfStockDesignation(product({
      sizes: soldOut,
      tags: [tag('oos-flag', 'Out of Stock', 'designation')],
    }))).toBe(true);
    expect(hasOutOfStockDesignation(product({
      sizes: soldOut,
      tags: [tag('out-of-stock', 'Out of Stock', 'attribute')],
    }))).toBe(false);
    expect(hasOutOfStockDesignation(product({
      sizes: soldOut,
      tags: [tag('out-of-stock', 'Out of Stock', 'certification')],
    }))).toBe(false);
    expect(hasOutOfStockDesignation(product({
      sizes: soldOut,
      badges: ['Out of Stock', 'Best Seller'],
    }))).toBe(true);
    expect(hasOutOfStockDesignation(product({
      sizes: soldOut,
      tags: [bestseller],
      badges: ['Out of Stock'],
    }))).toBe(false);
  });

  it('requires the designation and no in-stock variant', () => {
    expect(showOutOfStockPill(product({ sizes: soldOut, tags: [oos] }))).toBe(true);
    expect(showOutOfStockPill(product({ sizes: soldOut, tags: [bestseller] }))).toBe(false);
    expect(showOutOfStockPill(product({ sizes: inStock, tags: [oos, bestseller] }))).toBe(false);
    expect(showOutOfStockPill(product({ sizes: mixed, tags: [oos] }))).toBe(false);
    expect(showOutOfStockPill(product({ sizes: [], tags: [oos] }))).toBe(false);
  });
});

describe('product card pill', () => {
  it('shows the pill, the dim overlay, and Notify me only when designated and sold out', () => {
    const html = card(product({ sizes: soldOut, tags: [oos, bestseller] }));
    expect(html).toContain(OUT_OF_STOCK_PILL);
    expect(html).toContain('bg-white/55');
    expect(html).toContain('Notify me');
    expect(html).not.toContain('Bestseller');
    expect(html).not.toContain('btn-primary');
  });

  it('keeps Notify me and the overlay, without the pill, when the designation is off', () => {
    const html = card(product({ sizes: soldOut, tags: [bestseller] }));
    expect(html).not.toContain(OUT_OF_STOCK_PILL);
    expect(html).toContain('bg-white/55');
    expect(html).toContain('Notify me');
    expect(html).not.toContain('Bestseller');
  });

  it('never replaces Add to cart when a variant is in stock, even with the designation ticked', () => {
    const html = card(product({ sizes: inStock, tags: [oos, bestseller] }));
    expect(html).not.toContain(OUT_OF_STOCK_PILL);
    expect(html).not.toContain('Notify me');
    expect(html).toContain('Bestseller');
    expect(html).toContain('btn-primary');
    expect(html).toContain('Add<span');
    expect(html).not.toContain('bg-white/55');
  });

  it('hides the pill when another size is still in stock', () => {
    const html = card(product({ sizes: mixed, tags: [oos] }));
    expect(html).not.toContain(OUT_OF_STOCK_PILL);
    expect(html).toContain('btn-primary');
    expect(html).not.toContain('Notify me');
  });

  it('uses the warm-start badge list when the product has no tags', () => {
    const sold = card(product({ sizes: soldOut, badges: ['Out of Stock', 'Best Seller'] }));
    expect(sold).toContain(OUT_OF_STOCK_PILL);
    expect(sold).not.toContain('Best Seller');
    const live = card(product({ sizes: inStock, badges: ['Out of Stock', 'Best Seller'] }));
    expect(live).not.toContain(OUT_OF_STOCK_PILL);
    expect(live).toContain('Best Seller');
    expect(live).toContain('btn-primary');
  });
});

describe('product page wiring', () => {
  it('renders the same pill from the same gate, and does not change the add-to-bag branch', () => {
    const src = readFileSync(path.resolve(__dirname, '../../src/pages/ProductDetail.tsx'), 'utf8');
    expect(src).toContain('showOutOfStockPill(product)');
    expect(src).toContain('<OutOfStockPill />');
    expect(src).toContain('selectedSize && !selectedSize.inStock');
    expect(src).toContain('Add to bag');
  });
});

describe('notify dialog host', () => {
  it('locks body scroll with a refcount and restores the previous overflow', () => {
    const body = { style: { overflow: 'auto' } };
    const releaseA = lockBodyScroll(body);
    const releaseB = lockBodyScroll(body);
    expect(body.style.overflow).toBe('hidden');
    releaseA();
    expect(body.style.overflow).toBe('hidden');
    releaseB();
    expect(body.style.overflow).toBe('auto');
    releaseB();
    expect(body.style.overflow).toBe('auto');
  });

  it('portals the form to document.body and focuses without scrolling the page', () => {
    const src = readFileSync(path.resolve(__dirname, '../../src/components/NotifyMe.tsx'), 'utf8');
    expect(src).toContain('createPortal(form, document.body)');
    expect(src).toContain('focus({ preventScroll: true })');
    expect(src).toContain('lockBodyScroll()');
    const formAt = src.indexOf('export function NotifyForm');
    const portalAt = src.indexOf('createPortal(form, document.body)');
    expect(formAt).toBeGreaterThan(0);
    expect(portalAt).toBeGreaterThan(formAt);
  });
});
