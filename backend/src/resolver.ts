/**
 * Pricing resolver: given a customer + product + the set of pricing profiles,
 * find the winning profile and the final price.
 *
 * Precedence rule (high to low):
 *   1. customer specificity  CUSTOMER=2, GROUP=1, ALL_CUSTOMERS=0
 *   2. product  specificity  PRODUCT_IDS=3,
 *                            FILTER with segment or brand=2,
 *                            FILTER with subCategory only=1,
 *                            ALL_PRODUCTS or empty FILTER=0
 *   3. adjustment specificity CUSTOM_PRICE=1, FIXED/PERCENTAGE=0
 *   4. explicit priority (higher wins)
 *   5. most recently updated (updatedAt epoch, higher wins)
 *
 * Compared lexicographically as a tuple. Higher tuple wins.
 */

import { applyAdjustment } from './pricing.js';
import type {
  Adjustment,
  Customer,
  CustomerScope,
  Money,
  PricingProfile,
  Product,
  ProductScope,
} from './types.js';

// --- Matching ---------------------------------------------------------------

export function customerMatches(
  scope: CustomerScope,
  customer: Customer,
): boolean {
  switch (scope.type) {
    case 'ALL_CUSTOMERS':
      return true;
    case 'CUSTOMER':
      return scope.customerId === customer.id;
    case 'GROUP':
      return customer.groupIds.includes(scope.groupId);
  }
}

export function productMatches(
  scope: ProductScope,
  product: Product,
): boolean {
  switch (scope.type) {
    case 'ALL_PRODUCTS':
      return true;
    case 'PRODUCT_IDS':
      return scope.productIds.includes(product.id);
    case 'FILTER': {
      const f = scope.filter;
      if (f.brand && f.brand !== product.brand) return false;
      if (f.subCategory && f.subCategory !== product.subCategory) return false;
      if (f.segment && f.segment !== product.segment) return false;
      return true;
    }
  }
}

// --- Specificity scoring ----------------------------------------------------

export function customerSpecificity(scope: CustomerScope): number {
  switch (scope.type) {
    case 'CUSTOMER':
      return 2;
    case 'GROUP':
      return 1;
    case 'ALL_CUSTOMERS':
      return 0;
  }
}

export function productSpecificity(scope: ProductScope): number {
  switch (scope.type) {
    case 'PRODUCT_IDS':
      return 3;
    case 'FILTER': {
      const f = scope.filter;
      // segment and brand are narrow in the F&B catalogue; sub-category is broad.
      if (f.segment || f.brand) return 2;
      if (f.subCategory) return 1;
      return 0;
    }
    case 'ALL_PRODUCTS':
      return 0;
  }
}

export function adjustmentSpecificity(adj: Adjustment): number {
  return adj.kind === 'CUSTOM_PRICE' ? 1 : 0;
}

/** [customer, product, adjustment, priority, updatedAtEpoch] — higher wins. */
export type SpecificityTuple = [number, number, number, number, number];

export function specificityTuple(profile: PricingProfile): SpecificityTuple {
  return [
    customerSpecificity(profile.customerScope),
    productSpecificity(profile.productScope),
    adjustmentSpecificity(profile.adjustment),
    profile.priority,
    Date.parse(profile.updatedAt) || 0,
  ];
}

/** Sort comparator: descending by tuple. */
export function compareTuplesDesc(
  a: SpecificityTuple,
  b: SpecificityTuple,
): number {
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return bv - av;
  }
  return 0;
}

// --- Resolution -------------------------------------------------------------

export interface MatchedProfile {
  profile: PricingProfile;
  specificity: SpecificityTuple;
  candidatePrice: Money;
}

export interface ResolutionResult {
  customerId: string;
  productId: string;
  basePrice: Money;
  finalPrice: Money;
  winningProfile: PricingProfile | null;
  matchedProfiles: MatchedProfile[];
  explanation: string;
}

export function resolvePrice(
  customer: Customer,
  product: Product,
  profiles: PricingProfile[],
): ResolutionResult {
  const matched: MatchedProfile[] = profiles
    .filter(
      (p) =>
        customerMatches(p.customerScope, customer) &&
        productMatches(p.productScope, product),
    )
    .map((profile) => ({
      profile,
      specificity: specificityTuple(profile),
      candidatePrice: applyAdjustment(product.basePrice, profile.adjustment),
    }))
    .sort((a, b) => compareTuplesDesc(a.specificity, b.specificity));

  const winner = matched[0] ?? null;

  return {
    customerId: customer.id,
    productId: product.id,
    basePrice: product.basePrice,
    finalPrice: winner ? winner.candidatePrice : product.basePrice,
    winningProfile: winner ? winner.profile : null,
    matchedProfiles: matched,
    explanation: explain(customer, product, matched),
  };
}

// --- Explanation ------------------------------------------------------------
//
// Goal: one plain-English sentence a supplier can read without knowing how the
// specificity algorithm works.
//
// e.g. "'Bondi Cellars custom price on Koyama Brut NV' wins at $95.00 —
//       it targets this specific customer and this exact product.
//       2 other rules also matched but were overridden:
//       '$15 off Sparkling Wine for VIP' ($105.00),
//       '10% off Wine for Independent Retailers' ($108.00)."

function whyWins(profile: PricingProfile): string {
  const who =
    profile.customerScope.type === 'CUSTOMER' ? 'this specific customer' :
    profile.customerScope.type === 'GROUP'     ? 'a customer group' :
                                                 'all customers';

  const what =
    profile.productScope.type === 'PRODUCT_IDS'
      ? profile.productScope.productIds.length === 1
        ? 'this exact product'
        : 'a specific set of products'
      : profile.productScope.type === 'FILTER'
      ? (() => {
          const f = profile.productScope.filter;
          if (f.segment && f.subCategory) return `all ${f.segment} ${f.subCategory}`;
          if (f.segment)     return `all ${f.segment} products`;
          if (f.subCategory) return `all ${f.subCategory} products`;
          if (f.brand)       return `all ${f.brand} products`;
          return 'a filtered range of products';
        })()
      : 'all products';

  return `it targets ${who} and covers ${what}`;
}

function explain(
  customer: Customer,
  product: Product,
  matched: MatchedProfile[],
): string {
  if (matched.length === 0) {
    return `No pricing rule applies to ${customer.name} for "${product.title}". ` +
           `They pay the standard price of $${product.basePrice.toFixed(2)}.`;
  }

  const winner = matched[0]!;
  const why = whyWins(winner.profile);

  if (matched.length === 1) {
    return `"${winner.profile.name}" applies — ${why}.`;
  }

  const overridden = matched
    .slice(1)
    .map((m) => `"${m.profile.name}" ($${m.candidatePrice.toFixed(2)})`)
    .join(', ');

  const count = matched.length - 1;
  return (
    `"${winner.profile.name}" wins at $${winner.candidatePrice.toFixed(2)} — ${why}. ` +
    `${count} other rule${count > 1 ? 's' : ''} also matched but ${count > 1 ? 'were' : 'was'} overridden: ${overridden}.`
  );
}
