/**
 * Domain types for the pricing system.
 *
 * Money is plain `number` (dollars). All math goes through pricing.ts so the
 * rounding rule lives in one place.
 */

export type ID = string;
export type Money = number;

export interface Product {
  id: ID;
  title: string;
  sku: string;
  brand: string;
  /** e.g. "Wine" */
  subCategory: string;
  /** e.g. "Sparkling", "Red", "White", "Port/Dessert" */
  segment: string;
  basePrice: Money;
}

export interface CustomerGroup {
  id: ID;
  name: string;
}

export interface Customer {
  id: ID;
  name: string;
  groupIds: ID[];
}

/**
 * The three adjustment kinds. FIXED and PERCENTAGE carry an explicit direction
 * (clearer in the UI than a signed amount). CUSTOM_PRICE overrides the base
 * price entirely and has no direction.
 */
export type Adjustment =
  | { kind: 'FIXED'; direction: 'INCREASE' | 'DECREASE'; amount: number }
  | { kind: 'PERCENTAGE'; direction: 'INCREASE' | 'DECREASE'; percent: number }
  | { kind: 'CUSTOM_PRICE'; price: Money };

/** Who the profile targets. */
export type CustomerScope =
  | { type: 'ALL_CUSTOMERS' }
  | { type: 'CUSTOMER'; customerId: ID }
  | { type: 'GROUP'; groupId: ID };

/**
 * What the profile applies to. Hybrid model:
 *  - PRODUCT_IDS: explicit snapshot (what the UI builds from selected rows)
 *  - FILTER: dynamic rule by brand/subCategory/segment (used by seeded
 *    Profile A "all Wine" and Profile B "all Sparkling Wine"). New products
 *    matching the filter automatically join.
 *  - ALL_PRODUCTS: explicit wildcard
 */
export type ProductScope =
  | { type: 'ALL_PRODUCTS' }
  | { type: 'PRODUCT_IDS'; productIds: ID[] }
  | {
      type: 'FILTER';
      filter: {
        brand?: string;
        subCategory?: string;
        segment?: string;
      };
    };

export interface PricingProfile {
  id: ID;
  name: string;
  customerScope: CustomerScope;
  productScope: ProductScope;
  adjustment: Adjustment;
  /** Higher wins only after specificity is tied. Default 0. */
  priority: number;
  /** ISO timestamps. updatedAt is the final tiebreaker. */
  createdAt: string;
  updatedAt: string;
}
