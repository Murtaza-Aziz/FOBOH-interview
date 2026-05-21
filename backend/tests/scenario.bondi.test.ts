/**
 * The brief's headline scenario. Bondi Cellars is in both groups; all three
 * seeded profiles match on Koyama Methode Brut Nature NV. C must win.
 *
 * Then we sanity-check the neighbouring cases so the rule isn't a coincidence:
 *  - Bondi + Lacourte Brut Cru NV (Sparkling Wine, no custom)  -> B wins
 *  - Bondi + High Garden Pinot Noir (Red Wine, not Sparkling)  -> A wins
 *  - Unknown customer in neither group                         -> no match
 */

import { describe, expect, it } from 'vitest';
import { resolvePrice } from '../src/resolver.js';
import {
  customersRepo,
  productsRepo,
  profilesRepo,
  resetStore,
} from '../src/store.js';
import type { Customer } from '../src/types.js';

function setup() {
  resetStore();
  return {
    bondi: customersRepo.get('cust-bondi')!,
    koyamaBrut: productsRepo.get('prod-koyama-brut-nv')!,
    lacourteBrut: productsRepo.get('prod-lacourte-brut-cru-nv')!,
    pinotNoir: productsRepo.get('prod-high-garden-pinot')!,
    profiles: profilesRepo.list(),
  };
}

describe('Bondi Cellars overlapping-profile scenario', () => {
  it('all three profiles match for Bondi + Koyama Brut NV', () => {
    const { bondi, koyamaBrut, profiles } = setup();
    const result = resolvePrice(bondi, koyamaBrut, profiles);
    expect(result.matchedProfiles).toHaveLength(3);
  });

  it('Profile C wins with $95 (customer-specific + product-specific + custom price)', () => {
    const { bondi, koyamaBrut, profiles } = setup();
    const result = resolvePrice(bondi, koyamaBrut, profiles);
    expect(result.winningProfile?.id).toBe('profile-c-bondi-koyama-brut-95');
    expect(result.finalPrice).toBe(95);
    expect(result.explanation).toContain('wins at $95.00');
    expect(result.explanation).toContain('this specific customer');
    expect(result.explanation).toContain('this exact product');
  });

  it('Profile B wins for Bondi + Lacourte Brut Cru NV ($15 off Sparkling beats 10% off Wine)', () => {
    const { bondi, lacourteBrut, profiles } = setup();
    const result = resolvePrice(bondi, lacourteBrut, profiles);
    expect(result.winningProfile?.id).toBe('profile-b-sparkling-15off-vip');
    // 409.32 - 15 = 394.32
    expect(result.finalPrice).toBe(394.32);
    // Both A and B should have matched (C does not — different product).
    expect(result.matchedProfiles).toHaveLength(2);
  });

  it('Profile A wins for Bondi + High Garden Pinot Noir (only A matches; Red Wine, not Sparkling)', () => {
    const { bondi, pinotNoir, profiles } = setup();
    const result = resolvePrice(bondi, pinotNoir, profiles);
    expect(result.winningProfile?.id).toBe('profile-a-wine-10pct-indep');
    // 279.06 * 0.9 = 251.154 -> 251.15
    expect(result.finalPrice).toBe(251.15);
    expect(result.matchedProfiles).toHaveLength(1);
  });

  it('returns base price for a customer in neither group with no targeted profile', () => {
    const { koyamaBrut, profiles } = setup();
    const stranger: Customer = {
      id: 'cust-stranger',
      name: 'Stranger',
      groupIds: [],
    };
    const result = resolvePrice(stranger, koyamaBrut, profiles);
    expect(result.winningProfile).toBeNull();
    expect(result.finalPrice).toBe(koyamaBrut.basePrice);
    expect(result.matchedProfiles).toHaveLength(0);
  });
});
