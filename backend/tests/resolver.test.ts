import { describe, expect, it } from 'vitest';
import {
  adjustmentSpecificity,
  compareTuplesDesc,
  customerMatches,
  customerSpecificity,
  productMatches,
  productSpecificity,
  resolvePrice,
  specificityTuple,
} from '../src/resolver.js';
import type {
  Customer,
  PricingProfile,
  Product,
} from '../src/types.js';

const product: Product = {
  id: 'p1',
  title: 'Test Wine',
  sku: 'TST',
  brand: 'TestBrand',
  subCategory: 'Wine',
  segment: 'Sparkling',
  basePrice: 100,
};

const customer: Customer = {
  id: 'c1',
  name: 'Test Customer',
  groupIds: ['g1', 'g2'],
};

function makeProfile(overrides: Partial<PricingProfile>): PricingProfile {
  return {
    id: 'pf',
    name: 'pf',
    customerScope: { type: 'ALL_CUSTOMERS' },
    productScope: { type: 'ALL_PRODUCTS' },
    adjustment: { kind: 'FIXED', direction: 'DECREASE', amount: 5 },
    priority: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// --- Matching ---------------------------------------------------------------

describe('customerMatches', () => {
  it('ALL_CUSTOMERS always matches', () => {
    expect(customerMatches({ type: 'ALL_CUSTOMERS' }, customer)).toBe(true);
  });
  it('CUSTOMER matches exact id', () => {
    expect(
      customerMatches({ type: 'CUSTOMER', customerId: 'c1' }, customer),
    ).toBe(true);
    expect(
      customerMatches({ type: 'CUSTOMER', customerId: 'c2' }, customer),
    ).toBe(false);
  });
  it('GROUP matches when customer is in that group', () => {
    expect(customerMatches({ type: 'GROUP', groupId: 'g1' }, customer)).toBe(
      true,
    );
    expect(customerMatches({ type: 'GROUP', groupId: 'g9' }, customer)).toBe(
      false,
    );
  });
});

describe('productMatches', () => {
  it('ALL_PRODUCTS always matches', () => {
    expect(productMatches({ type: 'ALL_PRODUCTS' }, product)).toBe(true);
  });
  it('PRODUCT_IDS matches when id is in list', () => {
    expect(
      productMatches({ type: 'PRODUCT_IDS', productIds: ['p1'] }, product),
    ).toBe(true);
    expect(
      productMatches({ type: 'PRODUCT_IDS', productIds: ['p2'] }, product),
    ).toBe(false);
  });
  it('FILTER matches when all set fields match (subCategory)', () => {
    expect(
      productMatches(
        { type: 'FILTER', filter: { subCategory: 'Wine' } },
        product,
      ),
    ).toBe(true);
    expect(
      productMatches(
        { type: 'FILTER', filter: { subCategory: 'Spirits' } },
        product,
      ),
    ).toBe(false);
  });
  it('FILTER matches on segment + subCategory combined', () => {
    expect(
      productMatches(
        {
          type: 'FILTER',
          filter: { subCategory: 'Wine', segment: 'Sparkling' },
        },
        product,
      ),
    ).toBe(true);
    expect(
      productMatches(
        { type: 'FILTER', filter: { subCategory: 'Wine', segment: 'Red' } },
        product,
      ),
    ).toBe(false);
  });
  it('empty FILTER matches everything', () => {
    expect(productMatches({ type: 'FILTER', filter: {} }, product)).toBe(true);
  });
});

// --- Specificity ------------------------------------------------------------

describe('customerSpecificity', () => {
  it('ranks CUSTOMER > GROUP > ALL_CUSTOMERS', () => {
    expect(customerSpecificity({ type: 'CUSTOMER', customerId: 'x' })).toBe(2);
    expect(customerSpecificity({ type: 'GROUP', groupId: 'x' })).toBe(1);
    expect(customerSpecificity({ type: 'ALL_CUSTOMERS' })).toBe(0);
  });
});

describe('productSpecificity', () => {
  it('PRODUCT_IDS = 3', () => {
    expect(
      productSpecificity({ type: 'PRODUCT_IDS', productIds: ['x'] }),
    ).toBe(3);
  });
  it('FILTER with segment = 2', () => {
    expect(
      productSpecificity({ type: 'FILTER', filter: { segment: 'Sparkling' } }),
    ).toBe(2);
  });
  it('FILTER with brand = 2', () => {
    expect(
      productSpecificity({ type: 'FILTER', filter: { brand: 'Koyama' } }),
    ).toBe(2);
  });
  it('FILTER with subCategory only = 1', () => {
    expect(
      productSpecificity({ type: 'FILTER', filter: { subCategory: 'Wine' } }),
    ).toBe(1);
  });
  it('FILTER segment dominates subCategory in same filter', () => {
    expect(
      productSpecificity({
        type: 'FILTER',
        filter: { subCategory: 'Wine', segment: 'Sparkling' },
      }),
    ).toBe(2);
  });
  it('ALL_PRODUCTS = 0', () => {
    expect(productSpecificity({ type: 'ALL_PRODUCTS' })).toBe(0);
  });
});

describe('adjustmentSpecificity', () => {
  it('CUSTOM_PRICE = 1, others = 0', () => {
    expect(adjustmentSpecificity({ kind: 'CUSTOM_PRICE', price: 1 })).toBe(1);
    expect(
      adjustmentSpecificity({
        kind: 'FIXED',
        direction: 'DECREASE',
        amount: 5,
      }),
    ).toBe(0);
    expect(
      adjustmentSpecificity({
        kind: 'PERCENTAGE',
        direction: 'DECREASE',
        percent: 10,
      }),
    ).toBe(0);
  });
});

describe('compareTuplesDesc', () => {
  it('higher customer specificity wins', () => {
    expect(compareTuplesDesc([2, 0, 0, 0, 0], [1, 3, 1, 9, 9])).toBeLessThan(0);
  });
  it('falls through to priority when earlier axes tied', () => {
    expect(compareTuplesDesc([1, 1, 0, 5, 0], [1, 1, 0, 1, 100])).toBeLessThan(
      0,
    );
  });
  it('falls through to updatedAt last', () => {
    expect(compareTuplesDesc([1, 1, 0, 0, 200], [1, 1, 0, 0, 100])).toBeLessThan(
      0,
    );
  });
});

// --- resolvePrice -----------------------------------------------------------

describe('resolvePrice', () => {
  it('returns base price when no profile matches', () => {
    const result = resolvePrice(customer, product, []);
    expect(result.finalPrice).toBe(product.basePrice);
    expect(result.winningProfile).toBeNull();
    expect(result.matchedProfiles).toHaveLength(0);
    expect(result.explanation).toContain('No pricing rule applies');
  });

  it('uses priority as tiebreaker when specificity is equal', () => {
    const low = makeProfile({
      id: 'low',
      name: 'low priority',
      customerScope: { type: 'GROUP', groupId: 'g1' },
      productScope: { type: 'FILTER', filter: { subCategory: 'Wine' } },
      adjustment: { kind: 'FIXED', direction: 'DECREASE', amount: 5 },
      priority: 0,
    });
    const high = makeProfile({
      id: 'high',
      name: 'high priority',
      customerScope: { type: 'GROUP', groupId: 'g2' },
      productScope: { type: 'FILTER', filter: { subCategory: 'Wine' } },
      adjustment: { kind: 'FIXED', direction: 'DECREASE', amount: 25 },
      priority: 10,
    });
    const result = resolvePrice(customer, product, [low, high]);
    expect(result.winningProfile?.id).toBe('high');
    expect(result.finalPrice).toBe(75);
  });

  it('uses updatedAt as final tiebreaker when priority is also tied', () => {
    const older = makeProfile({
      id: 'older',
      name: 'older',
      customerScope: { type: 'GROUP', groupId: 'g1' },
      productScope: { type: 'FILTER', filter: { subCategory: 'Wine' } },
      adjustment: { kind: 'FIXED', direction: 'DECREASE', amount: 5 },
      priority: 0,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const newer = makeProfile({
      id: 'newer',
      name: 'newer',
      customerScope: { type: 'GROUP', groupId: 'g2' },
      productScope: { type: 'FILTER', filter: { subCategory: 'Wine' } },
      adjustment: { kind: 'FIXED', direction: 'DECREASE', amount: 7 },
      priority: 0,
      updatedAt: '2026-05-01T00:00:00.000Z',
    });
    const result = resolvePrice(customer, product, [older, newer]);
    expect(result.winningProfile?.id).toBe('newer');
    expect(result.finalPrice).toBe(93);
  });

  it('exposes specificity tuple on the winner for traceability', () => {
    const profile = makeProfile({
      customerScope: { type: 'CUSTOMER', customerId: 'c1' },
      productScope: { type: 'PRODUCT_IDS', productIds: ['p1'] },
      adjustment: { kind: 'CUSTOM_PRICE', price: 50 },
    });
    const result = resolvePrice(customer, product, [profile]);
    expect(result.matchedProfiles[0]?.specificity.slice(0, 3)).toEqual([
      2, 3, 1,
    ]);
  });
});
