import { describe, expect, it } from 'vitest'
import { calculateOrderPricing, calculateReversedOrderSettlement, reconcileAmounts } from '../src/services/order-pricing-service'
import { toCents } from '../src/lib/money'

const context = { sellerType: 'cnpj' as const }
const rulesConfig = { effectiveDate: '2026-09-18' }

describe('order pricing', () => {
  it('charges each unit separately and applies coupon minimum/cap once per order', () => {
    const result = calculateOrderPricing({ context, rulesConfig,
      items: [{ variationName: 'synthetic', unitPrice: 20, quantity: 2 }],
      storeCoupon: { minPrice: 30, rate: 0.1, maxDiscount: 3 },
    })
    expect(result.subtotal).toBe(40)
    expect(result.couponDiscountAmount).toBe(3)
    expect(result.items.map((item) => item.allocatedCouponAmount)).toEqual([1.5, 1.5])
    expect(result.commissionAmount).toBe(15.4)
    expect(result.netAmount).toBe(21.6)
    expect(result.audit.warnings).toContain('order-coupon-allocation-unverified')
  })
  it('allocates every coupon cent without losing remainder', () => {
    const result = calculateOrderPricing({ context, rulesConfig,
      items: [{ variationName: 'synthetic', unitPrice: 20, quantity: 3 }], storeCoupon: { amount: 1 },
    })
    expect(result.items.map((item) => item.allocatedCouponAmount)).toEqual([0.34, 0.33, 0.33])
    expect(result.items.reduce((sum, item) => sum + toCents(item.allocatedCouponAmount), 0)).toBe(100)
    expect(toCents(result.finalBuyerPrice) - toCents(result.commissionAmount)).toBe(toCents(result.netAmount))
  })
  it('accepts an actual coupon allocation and rejects an inconsistent allocation', () => {
    const input = { context, rulesConfig, items: [{ variationName: 'synthetic', unitPrice: 20, quantity: 2 }], storeCoupon: { amount: 1 } }
    const result = calculateOrderPricing({ ...input, couponAllocationAmounts: [0.49, 0.51] })
    expect(result.items.map((item) => item.allocatedCouponAmount)).toEqual([0.49, 0.51])
    expect(result.audit.warnings).not.toContain('order-coupon-allocation-unverified')
    expect(() => calculateOrderPricing({ ...input, couponAllocationAmounts: [0.5, 0.49] })).toThrow()
    expect(() => calculateOrderPricing({ ...input, couponAllocationAmounts: [-1, 2] })).toThrow()
  })
  it('subtracts logistics and recorded extra costs once per order, not per unit', () => {
    const result = calculateOrderPricing({ context, rulesConfig,
      items: [{ variationName: 'synthetic', unitPrice: 500, quantity: 2 }],
      additionalCosts: { affiliateCommission: 10, sellerCoins: 2 }, sellerLogisticsFreightDiscount: 40,
    })
    expect(result.commissionAmount).toBe(192)
    expect(result.additionalCostsAmount).toBe(12)
    expect(result.freightCopaymentAmount).toBe(10)
    expect(result.netAmount).toBe(786)
  })
  it('preserves the official Pix ledger when summing units', () => {
    const result = calculateOrderPricing({ context: { ...context, paymentMethod: 'pix' }, rulesConfig,
      items: [{ variationName: 'synthetic', unitPrice: 500, quantity: 2 }],
    })
    expect(result.finalBuyerPrice).toBe(920)
    expect(result.pixSubsidyAmount).toBe(80)
    expect(result.commissionAmount).toBe(112)
    expect(result.netAmount).toBe(808)
  })
  it('rejects empty orders, fractional quantities and conflicting coupon types', () => {
    expect(() => calculateOrderPricing({ context, rulesConfig, items: [] })).toThrow()
    expect(() => calculateOrderPricing({ context, rulesConfig, items: [{ variationName: 'synthetic', unitPrice: 1, quantity: 0.5 }] })).toThrow()
    expect(() => calculateOrderPricing({ context, rulesConfig, items: [{ variationName: 'synthetic', unitPrice: 1, quantity: 1 }], storeCoupon: { amount: 1, rate: 0.1 } })).toThrow()
  })
})

describe('reversals and reconciliation', () => {
  it('charges no commission for a full reversal without compensation', () => {
    expect(calculateReversedOrderSettlement({ compensationAmount: 0 })).toEqual({ commissionAmount: 0, netAmount: 0 })
  })
  it('requires actual commission on dispute compensation', () => {
    expect(() => calculateReversedOrderSettlement({ compensationAmount: 20 })).toThrow()
    expect(calculateReversedOrderSettlement({ compensationAmount: 20, chargedCommissionAmount: 4, additionalCostsAmount: 2 })).toEqual({ commissionAmount: 4, netAmount: 14 })
  })
  it('detects a one-cent statement difference', () => {
    expect(reconcileAmounts({ netAmount: 404 }, { netAmount: 404 }).matches).toBe(true)
    expect(reconcileAmounts({ netAmount: 403.99 }, { netAmount: 404 })).toEqual({ matches: false, differences: [{ field: 'netAmount', expected: 404, calculated: 403.99, differenceCents: -1 }] })
    expect(() => reconcileAmounts({}, { missing: 1 })).toThrow()
  })
})
