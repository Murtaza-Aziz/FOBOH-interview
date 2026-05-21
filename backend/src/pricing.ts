/**
 * Price calculation: pure functions, no I/O.
 *
 * Rules from the brief:
 *  - Fixed:      new = base [+/-] amount
 *  - Percentage: new = base [+/-] (percent% * base)
 *  - Custom:     new = price (overrides base)
 *  - New price must never be negative -> clamp at 0
 *  - Round to 2 decimal places at the output boundary
 */

import type { Adjustment, Money } from './types.js';

export function roundCents(n: number): Money {
  // Math.round handles half-to-even oddities well enough for currency at this
  // scale. If we needed banker's rounding we'd swap this out.
  return Math.round(n * 100) / 100;
}

export function applyAdjustment(basePrice: Money, adjustment: Adjustment): Money {
  let raw: number;

  switch (adjustment.kind) {
    case 'CUSTOM_PRICE':
      raw = adjustment.price;
      break;
    case 'FIXED': {
      const sign = adjustment.direction === 'INCREASE' ? 1 : -1;
      raw = basePrice + sign * adjustment.amount;
      break;
    }
    case 'PERCENTAGE': {
      const sign = adjustment.direction === 'INCREASE' ? 1 : -1;
      raw = basePrice + sign * (adjustment.percent / 100) * basePrice;
      break;
    }
  }

  // Clamp before rounding so a tiny negative like -0.001 still becomes 0.00.
  return roundCents(Math.max(0, raw));
}
