import { describe, expect, it } from 'vitest';
import { applyAdjustment, roundCents } from '../src/pricing.js';
import type { Adjustment } from '../src/types.js';

describe('roundCents', () => {
  it('rounds to 2dp', () => {
    expect(roundCents(99.999)).toBe(100);
    expect(roundCents(66.6666)).toBe(66.67);
    expect(roundCents(251.154)).toBe(251.15);
    expect(roundCents(0)).toBe(0);
  });
});

describe('applyAdjustment - FIXED', () => {
  it('decrease subtracts the amount', () => {
    const adj: Adjustment = { kind: 'FIXED', direction: 'DECREASE', amount: 15 };
    expect(applyAdjustment(409.32, adj)).toBe(394.32);
  });

  it('increase adds the amount', () => {
    const adj: Adjustment = { kind: 'FIXED', direction: 'INCREASE', amount: 10 };
    expect(applyAdjustment(100, adj)).toBe(110);
  });

  it('clamps to 0 when amount exceeds base', () => {
    const adj: Adjustment = { kind: 'FIXED', direction: 'DECREASE', amount: 500 };
    expect(applyAdjustment(100, adj)).toBe(0);
  });
});

describe('applyAdjustment - PERCENTAGE', () => {
  it('decrease applies percent off base (brief example)', () => {
    // 10% off $279.06 = 251.154 -> 251.15
    const adj: Adjustment = {
      kind: 'PERCENTAGE',
      direction: 'DECREASE',
      percent: 10,
    };
    expect(applyAdjustment(279.06, adj)).toBe(251.15);
  });

  it('increase applies percent above base', () => {
    const adj: Adjustment = {
      kind: 'PERCENTAGE',
      direction: 'INCREASE',
      percent: 25,
    };
    expect(applyAdjustment(80, adj)).toBe(100);
  });

  it('100% decrease yields 0', () => {
    const adj: Adjustment = {
      kind: 'PERCENTAGE',
      direction: 'DECREASE',
      percent: 100,
    };
    expect(applyAdjustment(120, adj)).toBe(0);
  });

  it('over-100% decrease clamps at 0', () => {
    const adj: Adjustment = {
      kind: 'PERCENTAGE',
      direction: 'DECREASE',
      percent: 150,
    };
    expect(applyAdjustment(50, adj)).toBe(0);
  });
});

describe('applyAdjustment - CUSTOM_PRICE', () => {
  it('overrides base price', () => {
    const adj: Adjustment = { kind: 'CUSTOM_PRICE', price: 95 };
    expect(applyAdjustment(120, adj)).toBe(95);
  });

  it('rounds custom price to 2dp', () => {
    const adj: Adjustment = { kind: 'CUSTOM_PRICE', price: 95.005 };
    expect(applyAdjustment(120, adj)).toBe(95.01);
  });

  it('a negative custom price clamps to 0', () => {
    const adj: Adjustment = { kind: 'CUSTOM_PRICE', price: -5 };
    expect(applyAdjustment(120, adj)).toBe(0);
  });
});
