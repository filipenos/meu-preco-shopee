import { describe, expect, it } from 'vitest'
import { calculateDiscountFromTargetNet, discountFromTargetNetToCsv } from '../src/services/discount-from-target-net-service'
import { calculateFullPriceFromTargetNet, fullPriceFromTargetNetToCsv } from '../src/services/full-price-from-target-net-service'
import { calculateNetFromFullPrice, netFromFullPriceToCsv } from '../src/services/net-from-full-price-service'
import { calculateProductValueFromCostAndTargetProfit } from '../src/services/product-value-from-cost-and-target-profit-service'
import { createPricingEngine, type PricingContext } from '../src/services/pricing-engine'
import { toCents } from '../src/lib/money'

const rulesConfig = { effectiveDate: '2026-09-18' }
const context: PricingContext = { sellerType: 'cnpj' }
const net = (fullPrice: number, discountPercent = 0, ctx = context) => calculateNetFromFullPrice({ context: ctx, rulesConfig, items: [{ variationName: 'synthetic', fullPrice, discountPercent }] })[0]
const full = (targetNet: number, discountPercent = 0, ctx = context) => calculateFullPriceFromTargetNet({ context: ctx, rulesConfig, items: [{ variationName: 'synthetic', discountPercent, targetNet }] })[0]

describe('pricing services', () => {
  it('calculates product discount followed by a capped store coupon', () => {
    const result = net(80.02, 0.5, { sellerType: 'cpf', storeCoupon: { minPrice: 30, rate: 0.03, maxDiscount: 3 } })
    expect(result.discountedPrice).toBe(40.01)
    expect(result.couponDiscountAmount).toBe(1.2)
    expect(result.finalBuyerPrice).toBe(38.81)
    expect(result.audit.warnings).toContain('coupon-commission-base-unverified')
  })
  it('supports fixed coupons and applies the minimum before discount', () => {
    expect(net(29.99, 0, { ...context, storeCoupon: { minPrice: 30, amount: 10 } }).couponDiscountAmount).toBe(0)
    expect(net(30, 0, { ...context, storeCoupon: { minPrice: 30, amount: 10 } }).couponDiscountAmount).toBe(10)
    expect(net(20, 0, { ...context, storeCoupon: { rate: 0.1 } }).couponDiscountAmount).toBe(2)
  })
  it.each([NaN, Infinity, -1, 50])('rejects invalid service discount %s rather than silently changing it', (discount) => {
    expect(() => net(100, discount)).toThrow()
    expect(() => full(10, discount)).toThrow()
  })
  it.each([NaN, Infinity, -1])('rejects invalid prices %s', (price) => {
    expect(() => net(price)).toThrow()
    expect(() => full(price)).toThrow()
  })
  it('distinguishes 1% from 100% without a heuristic', () => {
    expect(net(100, 0.01).discountedPrice).toBe(99)
    expect(net(100, 1).discountedPrice).toBe(0)
    expect(full(1, 1).status).toBe('target-too-high')
    expect(full(0).status).toBe('target-too-low')
  })
  it('chooses the cheapest valid bracket for target 59', () => {
    const result = full(59)
    expect(result.requiredFullPrice).toBe(78.75)
    expect(result.netAmount).toBe(59)
  })
  it('finds discounts across a falling net boundary', () => {
    const result = calculateDiscountFromTargetNet({ context, rulesConfig, items: [{ variationName: 'synthetic', fullPrice: 80, targetNet: 59 }] })[0]
    expect(result.status).toBe('ok')
    expect(net(80, result.requiredDiscountPercent).netAmount).toBe(result.netAmount)
    expect(result.netAmount).toBeGreaterThanOrEqual(59)
    expect(net(80, result.requiredDiscountPercent + 0.0001).netAmount).toBeLessThan(59)
  })
  it('reports genuinely impossible discount targets and the 99% cap', () => {
    const results = calculateDiscountFromTargetNet({ context, rulesConfig, items: [
      { variationName: 'impossible', fullPrice: 80, targetNet: 100 },
      { variationName: 'cap', fullPrice: 80, targetNet: 0 },
    ] })
    expect(results[0].status).toBe('target-too-high')
    expect(results[1].status).toBe('max-discount-cap-reached')
  })
  it.each([10.01, 10.02, 10.07, 59, 65.99, 150, 404])('recalculates returned cents with 13%% discount (target %s)', (target) => {
    const result = full(target, 0.13)
    expect(result.status).toBe('ok')
    expect(net(result.requiredFullPrice, 0.13).netAmount).toBe(result.netAmount)
    expect(result.netAmount).toBeGreaterThanOrEqual(target)
    expect(net(result.requiredFullPrice - 0.01, 0.13).netAmount).toBeLessThan(target)
  })
  it('handles coupon activation even when it reduces the net at the upper price', () => {
    const ctx = { ...context, storeCoupon: { minPrice: 30, amount: 20 } }
    const result = full(19, 0, ctx)
    expect(result.requiredFullPrice).toBe(28.75)
    expect(result.couponApplied).toBe(false)
    expect(net(result.requiredFullPrice, 0, ctx).netAmount).toBe(19)
  })
  it('includes known per-item costs and logistics copayment once', () => {
    const result = net(500, 0, { ...context, additionalCosts: { affiliateCommission: 20, sellerCoins: 3, shippingAdjustment: 2, returnShipping: 4, other: 1 }, sellerLogisticsFreightDiscount: 40 })
    expect(result.additionalCostsAmount).toBe(30)
    expect(result.freightCopaymentAmount).toBe(10)
    expect(result.netAmount).toBe(364)
    const ctx = { ...context, additionalCosts: { other: 2 }, sellerLogisticsFreightDiscount: 20 }
    const inverse = full(59, 0.1, ctx)
    expect(net(inverse.requiredFullPrice, 0.1, ctx).netAmount).toBe(inverse.netAmount)
    expect(inverse.netAmount).toBeGreaterThanOrEqual(59)
  })
  it('adds cost and target profit in cents', () => {
    const result = calculateProductValueFromCostAndTargetProfit({ context, rulesConfig, items: [{ variationName: 'synthetic', productCost: 10.005, targetProfit: 20.005, productCouponPercent: 0.13 }] })[0]
    expect(result.targetNetAmount).toBe(30.02)
    expect(result.netAmount).toBeGreaterThanOrEqual(30.02)
    expect(net(result.requiredFullPrice, 0.13).netAmount).toBe(result.netAmount)
    expect(result.profitAfterCost).toBeGreaterThanOrEqual(result.targetProfit)
  })
  it('escapes CSV labels and exports actual returned prices', () => {
    const item = net(100)
    item.variationName = 'kit "premium"'
    expect(netFromFullPriceToCsv([item])).toContain('"kit ""premium"""')
    expect(fullPriceFromTargetNetToCsv([full(59)])).toContain('"78.75"')
    const discount = calculateDiscountFromTargetNet({ context, rulesConfig, items: [{ variationName: 'synthetic', fullPrice: 80, targetNet: 59 }] })
    expect(discountFromTargetNetToCsv(discount)).toContain('"ok"')
  })
})

describe('inverse search independently checked against all price cents', () => {
  const cases: PricingContext[] = [
    context,
    { sellerType: 'cpf', ordersLast90Days: 451 },
    { sellerType: 'cpf', ordersLast90Days: 450, includeCampaignExtra: true },
    { ...context, paymentMethod: 'pix', includeCampaignExtra: true },
    { ...context, storeCoupon: { minPrice: 80, rate: 0.1, maxDiscount: 20 } },
    { ...context, storeCoupon: { minPrice: 100, amount: 30 } },
  ]
  it.each(cases)('finds the global minimum across all fee and coupon boundaries: %j', (ctx) => {
    const engine = createPricingEngine(ctx, rulesConfig)
    const targets = [100, 5900, 6600, 15000, 40400]
    const minimums = new Map<number, number>()
    for (let cents = 0; cents <= 70000 && minimums.size < targets.length; cents += 1) {
      const actual = toCents(engine.evaluate(cents, 0.13).netAmount)
      for (const target of targets) if (actual >= target && !minimums.has(target)) minimums.set(target, cents)
    }
    for (const target of targets) expect(engine.findPrice(0.13, target, 70000)).toBe(minimums.get(target))
  })
})

it('supports promotion and both coupon treatments for a net target', () => {
  const ctx = { sellerType: 'cnpj' as const, storeCoupon: { minPrice: 0, rate: 0.03, maxDiscount: 3 } }
  const input = { context: ctx, rulesConfig, items: [{ variationName: 'item', targetNet: 10, discountPercent: 0.2 }] }
  const compensated = calculateFullPriceFromTargetNet({ ...input, couponTreatment: 'compensate' })[0]
  const absorbed = calculateFullPriceFromTargetNet({ ...input, couponTreatment: 'absorb' })[0]
  expect(compensated.netAmount).toBeGreaterThanOrEqual(10)
  expect(absorbed.netAmount).toBeLessThan(10)
  expect(absorbed.requiredFullPrice).toBeLessThan(compensated.requiredFullPrice)
  expect(net(absorbed.requiredFullPrice, 0.2, { sellerType: 'cnpj' }).netAmount).toBeGreaterThanOrEqual(10)
  expect(net(absorbed.requiredFullPrice - 0.01, 0.2, { sellerType: 'cnpj' }).netAmount).toBeLessThan(10)
  expect(net(compensated.requiredFullPrice - 0.01, 0.2, ctx).netAmount).toBeLessThan(10)
  expect(absorbed.netAmount).toBe(net(absorbed.requiredFullPrice, 0.2, ctx).netAmount)
})
