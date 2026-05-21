/**
 * In-memory store. Singletons resettable from seed so tests get a clean slate.
 *
 * Kept deliberately tiny — no repository pattern, no abstractions. A Stage 3
 * route handler will call these directly.
 */

import {
  seedCustomers,
  seedGroups,
  seedProducts,
  seedProfiles,
} from './seed.js';
import type {
  Customer,
  CustomerGroup,
  ID,
  PricingProfile,
  Product,
} from './types.js';

// Populated from seed on first import. Tests call resetStore() for a clean slate.
const store = {
  products: new Map<ID, Product>(seedProducts.map((p) => [p.id, p])),
  customers: new Map<ID, Customer>(seedCustomers.map((c) => [c.id, c])),
  groups: new Map<ID, CustomerGroup>(seedGroups.map((g) => [g.id, g])),
  profiles: new Map<ID, PricingProfile>(seedProfiles.map((p) => [p.id, p])),
};

export function resetStore(): void {
  store.products.clear();
  store.customers.clear();
  store.groups.clear();
  store.profiles.clear();
  for (const p of seedProducts) store.products.set(p.id, p);
  for (const c of seedCustomers) store.customers.set(c.id, c);
  for (const g of seedGroups) store.groups.set(g.id, g);
  for (const pr of seedProfiles) store.profiles.set(pr.id, pr);
}

export const productsRepo = {
  list: (): Product[] => [...store.products.values()],
  get: (id: ID): Product | undefined => store.products.get(id),
};

export const customersRepo = {
  list: (): Customer[] => [...store.customers.values()],
  get: (id: ID): Customer | undefined => store.customers.get(id),
};

export const groupsRepo = {
  list: (): CustomerGroup[] => [...store.groups.values()],
  get: (id: ID): CustomerGroup | undefined => store.groups.get(id),
};

export const profilesRepo = {
  list: (): PricingProfile[] => [...store.profiles.values()],
  get: (id: ID): PricingProfile | undefined => store.profiles.get(id),
  upsert: (p: PricingProfile): PricingProfile => {
    store.profiles.set(p.id, p);
    return p;
  },
  delete: (id: ID): boolean => store.profiles.delete(id),
};
