import { describe, expect, it } from 'vitest'

import { finalBasedToListingDiscountPercent, normalizePercentInput } from '../src/lib/discount'

describe('discount helpers', () => {
  it('normalizes percent inputs from integer and decimal formats', () => {
    expect(normalizePercentInput(10)).toBe(0.1)
    expect(normalizePercentInput(0.1)).toBe(0.1)
    expect(normalizePercentInput(-2)).toBe(0)
    expect(normalizePercentInput(300)).toBe(1)
  })

  it('converts final-based discount to listing-equivalent discount', () => {
    expect(finalBasedToListingDiscountPercent(10)).toBeCloseTo(0.090909, 6)
    expect(finalBasedToListingDiscountPercent(0.1)).toBeCloseTo(0.090909, 6)
    expect(finalBasedToListingDiscountPercent(100)).toBe(0.5)
  })
})
