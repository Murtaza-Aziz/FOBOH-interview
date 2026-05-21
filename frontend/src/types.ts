/**
 * Domain types mirroring the backend.
 *
 * Deliberate copy rather than a shared package. For a 3-4 hour challenge the
 * tooling cost of a shared workspace package (tsconfig project references, build
 * ordering) outweighs the benefit. Noted in README under "what I'd do next".
 */

export type Money = number;

export interface Product {
  id: string;
  title: string;
  sku: string;
  brand: string;
  subCategory: string;
  segment: string;
  basePrice: Money;
}

export interface CustomerGroup {
  id: string;
  name: string;
}

export interface Customer {
  id: string;
  name: string;
  groupIds: string[];
}

export type Adjustment =
  | { kind: 'FIXED'; direction: 'INCREASE' | 'DECREASE'; amount: number }
  | { kind: 'PERCENTAGE'; direction: 'INCREASE' | 'DECREASE'; percent: number }
  | { kind: 'CUSTOM_PRICE'; price: Money };

export type CustomerScope =
  | { type: 'ALL_CUSTOMERS' }
  | { type: 'CUSTOMER'; customerId: string }
  | { type: 'GROUP'; groupId: string };

export type ProductScope =
  | { type: 'ALL_PRODUCTS' }
  | { type: 'PRODUCT_IDS'; productIds: string[] }
  | { type: 'FILTER'; filter: { brand?: string; subCategory?: string; segment?: string } };

export interface PricingProfile {
  id: string;
  name: string;
  customerScope: CustomerScope;
  productScope: ProductScope;
  adjustment: Adjustment;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

/** What the frontend sends to create or update a profile. No id or timestamps. */
export interface ProfilePayload {
  name: string;
  customerScope: CustomerScope;
  productScope: ProductScope;
  adjustment: Adjustment;
  priority: number;
}

export interface PreviewItem {
  productId: string;
  title: string;
  sku: string;
  basePrice: Money;
  newPrice: Money;
}

export interface PreviewResponse {
  items: PreviewItem[];
}

export interface MatchedProfileSummary {
  profileId: string;
  profileName: string;
  candidatePrice: Money;
  specificity: number[];
}

export interface ResolveResponse {
  customerId: string;
  productId: string;
  basePrice: Money;
  finalPrice: Money;
  winningProfile: { id: string; name: string } | null;
  matchedProfiles: MatchedProfileSummary[];
  explanation: string;
}
