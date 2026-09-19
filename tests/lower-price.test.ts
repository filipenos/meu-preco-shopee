import { describe, expect, it } from 'vitest'
import { compareLowerPrices } from '../src/services/lower-price-service'
import { createPricingEngine, type PricingContext } from '../src/services/pricing-engine'
import { toCents } from '../src/lib/money'

const rulesConfig = { effectiveDate: '2026-09-18' }
const context: PricingContext = { sellerType: 'cnpj' }

describe('lower price suggestions', () => {
  it('receives more at 99.99 than at 102', () => {
    const result = compareLowerPrices({ fullPrice: 102, context, rulesConfig })
    expect(result.current.netAmount).toBe(67.72)
    expect(result.suggestion).toMatchObject({
      suggestedPrice: 99.99, priceReduction: 2.01, netGain: 2.27,
      outcome: { netAmount: 69.99 },
    })
  })

  it.each([0, 0.01, 79.99, 99.99, 150, 500, 100_000_000])('does not suggest an unprofitable reduction at %s', (fullPrice) => {
    expect(compareLowerPrices({ fullPrice, context, rulesConfig }).suggestion).toBeNull()
  })

  it.each([NaN, Infinity, -1, 100_000_001])('rejects invalid price %s', (fullPrice) => {
    expect(() => compareLowerPrices({ fullPrice, context, rulesConfig })).toThrow()
  })

  const scenarios: [number, PricingContext, string][] = [
    [80, context, '2026-09-18'],
    [100, context, '2026-10-01'],
    [200, { sellerType: 'cpf', ordersLast90Days: 451 }, '2026-09-18'],
    [102, { ...context, paymentMethod: 'pix', includeCampaignExtra: true }, '2026-09-18'],
    [103, { ...context, storeCoupon: { minPrice: 30, rate: 0.03, maxDiscount: 3 } }, '2026-09-18'],
    [100, { ...context, storeCoupon: { minPrice: 100, amount: 25 } }, '2026-09-18'],
    [12, { sellerType: 'cpf', ordersLast90Days: 451 }, '2026-09-18'],
    [102, { ...context, additionalCosts: { other: 5 }, sellerLogisticsFreightDiscount: 20 }, '2026-09-18'],
  ]
  it.each(scenarios)('matches exhaustive cent-by-cent search at %s with %j on %s', (fullPrice, ctx, effectiveDate) => {
    const config = { effectiveDate }
    const engine = createPricingEngine(ctx, config)
    const currentNet = toCents(engine.evaluate(toCents(fullPrice), 0).netAmount)
    let bestNet = currentNet
    let bestPrice: number | undefined
    for (let cents = 1; cents < toCents(fullPrice); cents += 1) {
      const net = toCents(engine.evaluate(cents, 0).netAmount)
      if (net > bestNet) { bestNet = net; bestPrice = cents }
    }
    const result = compareLowerPrices({ fullPrice, context: ctx, rulesConfig: config })
    if (bestPrice === undefined) expect(result.suggestion).toBeNull()
    else {
      expect(toCents(result.suggestion!.suggestedPrice)).toBe(bestPrice)
      expect(toCents(result.suggestion!.outcome.netAmount)).toBe(bestNet)
      expect(toCents(result.suggestion!.netGain)).toBe(bestNet - currentNet)
    }
  })
})
