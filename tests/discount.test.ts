import { describe, expect, it } from 'vitest'

import { normalizePercentInput } from '../src/lib/discount'

describe('discount helpers', () => {
  it('normalizes percent inputs from integer and decimal formats', () => {
    expect(normalizePercentInput(10)).toBe(0.1)
    expect(normalizePercentInput(0.1)).toBe(0.1)
    expect(normalizePercentInput(-2)).toBe(0)
    expect(normalizePercentInput(300)).toBe(1)
  })
})
