import { describe, expect, it } from 'vitest'
import { normalizePercentInput, validateRate } from '../src/lib/discount'
import { roundMoney, multiplyRate, toCents } from '../src/lib/money'

describe('explicit percentages and decimal money', () => {
  it.each([[0.5, 0.005], [1, 0.01], [1.01, 0.0101], [10, 0.1], [100, 1]])('converts UI %s percent to fraction %s', (input, expected) => {
    expect(normalizePercentInput(input)).toBeCloseTo(expected, 10)
  })
  it.each([-1, 50, NaN, Infinity])('rejects invalid service rate %s', (value) => {
    expect(() => validateRate(value)).toThrow()
  })
  it('rounds decimal ties without floating-point drift', () => {
    expect(roundMoney(1.005)).toBe(1.01)
    expect(roundMoney(2.675)).toBe(2.68)
    expect(roundMoney(-1.005)).toBe(-1.01)
    expect(toCents(1e-7)).toBe(0)
    expect(multiplyRate(9500, 0.025)).toBe(238)
  })
})
