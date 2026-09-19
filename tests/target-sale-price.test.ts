import { describe, expect, it } from 'vitest'
import { calculateTargetSalePrice } from '../src/services/target-sale-price-service'
import { createPricingEngine } from '../src/services/pricing-engine'
import { toCents } from '../src/lib/money'

const base = { targetPrice: 14.9, discountPercent: 0.2, couponTreatment: 'compensate' as const, context: { sellerType: 'cnpj' as const }, rulesConfig: { effectiveDate: '2026-09-19' } }

describe('target sale price', () => {
  it('finds the cheapest cent with a 20% promotion', () => {
    const result = calculateTargetSalePrice(base)
    expect(result.fullPrice).toBe(18.62)
    expect(result.current.finalBuyerPrice).toBe(14.9)
    expect(result.exact).toBe(true)
  })
  it('compensates or absorbs the 3% coupon', () => {
    const input = { ...base, context: { ...base.context, storeCoupon: { minPrice: 0, rate: 0.03, maxDiscount: 3 } } }
    const compensated = calculateTargetSalePrice(input)
    const absorbed = calculateTargetSalePrice({ ...input, couponTreatment: 'absorb' })
    expect(compensated.current.finalBuyerPrice).toBe(14.9)
    expect(compensated.fullPrice).toBe(19.2)
    expect(absorbed.fullPrice).toBe(18.62)
    expect(absorbed.current.finalBuyerPrice).toBe(14.45)
  })
  it('does not apply a coupon below its minimum', () => {
    const result = calculateTargetSalePrice({ ...base, context: { ...base.context, storeCoupon: { minPrice: 30, rate: 0.03, maxDiscount: 3 } } })
    expect(result.fullPrice).toBe(18.62)
    expect(result.current.couponApplied).toBe(false)
  })
  it.each([0, -1, NaN, Infinity])('rejects invalid targets %s', (targetPrice) => {
    expect(() => calculateTargetSalePrice({ ...base, targetPrice })).toThrow()
  })
  it('rejects an impossible 100% promotion', () => {
    expect(() => calculateTargetSalePrice({ ...base, discountPercent: 1 })).toThrow()
  })
  it.each(['compensate', 'absorb'] as const)('matches exhaustive price search with coupon activation and cap (%s)', (couponTreatment) => {
    const input = { ...base, targetPrice: 30, couponTreatment, context: { ...base.context, storeCoupon: { minPrice: 30, rate: 0.1, maxDiscount: 3 } } }
    const result = calculateTargetSalePrice(input)
    const engine = createPricingEngine(input.context, input.rulesConfig)
    for (let cents = 1; cents < toCents(result.fullPrice); cents++) {
      const actual = engine.evaluate(cents, input.discountPercent)
      expect(toCents(couponTreatment === 'compensate' ? actual.finalBuyerPrice : actual.discountedPrice)).toBeLessThan(3000)
    }
    expect(result.current).toEqual(engine.evaluate(toCents(result.fullPrice), input.discountPercent))
  })
  it('keeps the promotion in a lower-price alternative', () => {
    const result = calculateTargetSalePrice({ ...base, targetPrice: 102 })
    expect(result.suggestion).not.toBeNull()
    const engine = createPricingEngine(base.context, base.rulesConfig)
    expect(result.suggestion!.outcome).toEqual(engine.evaluate(toCents(result.suggestion!.suggestedPrice), base.discountPercent))
    expect(result.suggestion!.outcome.finalBuyerPrice).toBe(99.99)
    expect(result.suggestion!.netGain).toBe(2.27)
  })
})
