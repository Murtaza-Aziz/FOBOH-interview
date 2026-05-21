/**
 * Seed data lifted from the challenge PDF.
 *
 * Five Wine products, two customer groups, one customer (Bondi Cellars) sitting
 * in both groups, and the three overlapping profiles A/B/C from the brief.
 */

import type {
  Customer,
  CustomerGroup,
  PricingProfile,
  Product,
} from './types.js';

const NOW = '2026-05-01T00:00:00.000Z';

export const seedProducts: Product[] = [
  {
    id: 'prod-high-garden-pinot',
    title: 'High Garden Pinot Noir 2021',
    sku: 'HGVPIN216',
    brand: 'High Garden',
    subCategory: 'Wine',
    segment: 'Red',
    basePrice: 279.06,
  },
  {
    id: 'prod-koyama-brut-nv',
    title: 'Koyama Methode Brut Nature NV',
    sku: 'KOYBRUNV6',
    brand: 'Koyama Wines',
    subCategory: 'Wine',
    segment: 'Sparkling',
    basePrice: 120.0,
  },
  {
    id: 'prod-koyama-riesling-2018',
    title: 'Koyama Riesling 2018',
    sku: 'KOYNR1837',
    brand: 'Koyama Wines',
    subCategory: 'Wine',
    segment: 'Port/Dessert',
    basePrice: 215.04,
  },
  {
    id: 'prod-koyama-tussock-riesling-2019',
    title: 'Koyama Tussock Riesling 2019',
    sku: 'KOYRIE19',
    brand: 'Koyama Wines',
    subCategory: 'Wine',
    segment: 'White',
    basePrice: 215.04,
  },
  {
    id: 'prod-lacourte-brut-cru-nv',
    title: 'Lacourte-Godbillon Brut Cru NV',
    sku: 'LACBNATNV6',
    brand: 'Lacourte-Godbillon',
    subCategory: 'Wine',
    segment: 'Sparkling',
    basePrice: 409.32,
  },
];

export const seedGroups: CustomerGroup[] = [
  { id: 'group-indep', name: 'Independent Retailers' },
  { id: 'group-vip', name: 'VIP' },
];

export const seedCustomers: Customer[] = [
  {
    id: 'cust-bondi',
    name: 'Bondi Cellars',
    groupIds: ['group-indep', 'group-vip'],
  },
];

/**
 * Seeded profiles match the brief's overlapping scenario verbatim.
 *  A: 10% off all Wine, Independent Retailers
 *  B: $15 off all Sparkling Wine, VIP
 *  C: Custom $95 on Koyama Methode Brut Nature NV, Bondi Cellars only
 */
export const seedProfiles: PricingProfile[] = [
  {
    id: 'profile-a-wine-10pct-indep',
    name: '10% off Wine for Independent Retailers',
    customerScope: { type: 'GROUP', groupId: 'group-indep' },
    productScope: { type: 'FILTER', filter: { subCategory: 'Wine' } },
    adjustment: { kind: 'PERCENTAGE', direction: 'DECREASE', percent: 10 },
    priority: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'profile-b-sparkling-15off-vip',
    name: '$15 off Sparkling Wine for VIP',
    customerScope: { type: 'GROUP', groupId: 'group-vip' },
    productScope: {
      type: 'FILTER',
      filter: { subCategory: 'Wine', segment: 'Sparkling' },
    },
    adjustment: { kind: 'FIXED', direction: 'DECREASE', amount: 15 },
    priority: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'profile-c-bondi-koyama-brut-95',
    name: 'Bondi Cellars custom price on Koyama Brut NV',
    customerScope: { type: 'CUSTOMER', customerId: 'cust-bondi' },
    productScope: {
      type: 'PRODUCT_IDS',
      productIds: ['prod-koyama-brut-nv'],
    },
    adjustment: { kind: 'CUSTOM_PRICE', price: 95 },
    priority: 0,
    createdAt: NOW,
    updatedAt: NOW,
  },
];
