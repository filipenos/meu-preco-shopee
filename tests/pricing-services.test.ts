import { describe, expect, it } from 'vitest'

import { createCommissionService } from '../src/services/commission-service'
import {
  calculateDiscountFromTargetNet,
  discountFromTargetNetToCsv,
} from '../src/services/discount-from-target-net-service'
import {
  calculateFullPriceFromTargetNet,
  fullPriceFromTargetNetToCsv,
} from '../src/services/full-price-from-target-net-service'
import { calculateNetFromFullPrice, netFromFullPriceToCsv } from '../src/services/net-from-full-price-service'
import { calculateProductValueFromCostAndTargetProfit } from '../src/services/product-value-from-cost-and-target-profit-service'

const cpfContext = {
  sellerType: 'cpf' as const,
  paymentMethod: 'card_or_boleto' as const,
  ordersLast90Days: 0,
  includeCampaignExtra: false,
  storeCoupon: {
    minPrice: 30,
    rate: 0.03,
    maxDiscount: 3,
  },
}

const cnpjContext = {
  sellerType: 'cnpj' as const,
  paymentMethod: 'card_or_boleto' as const,
  ordersLast90Days: 0,
  includeCampaignExtra: false,
}

describe('commission-service', () => {
  it('exposes merged rules via getRules', () => {
    const service = createCommissionService({ campaignExtraRate: 0.05 })

    expect(service.getRules().campaignExtraRate).toBe(0.05)
  })
})

describe('net-from-full-price service', () => {
  it('calculates net from full price with discount and coupon', () => {
    const result = calculateNetFromFullPrice({
      context: cpfContext,
      items: [{ variationName: '10 pcs', fullPrice: 80.02, discountPercent: 50 }],
    })[0]

    expect(result.couponApplied).toBe(true)
    expect(result.discountedPrice).toBe(40.01)
    expect(result.finalBuyerPrice).toBe(38.81)
    expect(result.netAmount).toBeLessThan(result.finalBuyerPrice)
    expect(result.effectiveCommissionRate).toBeGreaterThan(0)
  })

  it('handles normalization, defaults and edge paths (no coupon / zero price)', () => {
    const [first, second] = calculateNetFromFullPrice({
      context: {
        sellerType: 'cnpj',
        storeCoupon: { minPrice: 999, rate: Number.POSITIVE_INFINITY },
      },
      items: [
        { variationName: 'edge', fullPrice: 20, discountPercent: -10 },
        { variationName: 'zero', fullPrice: 100, discountPercent: 100 },
      ],
    })

    expect(first.discountPercent).toBe(0)
    expect(first.couponApplied).toBe(false)
    expect(first.discountedPrice).toBe(20)
    expect(first.finalBuyerPrice).toBe(20)

    expect(second.discountPercent).toBe(1)
    expect(second.finalBuyerPrice).toBe(0)
    expect(second.effectiveCommissionRate).toBe(0)
  })

  it('exports CSV with escaped values', () => {
    const csv = netFromFullPriceToCsv([
      {
        variationName: 'kit "premium"',
        fullPrice: 80,
        discountPercent: 0.5,
        discountedPrice: 40,
        couponApplied: false,
        couponRate: 0,
        couponMinPrice: undefined,
        couponMaxDiscount: undefined,
        couponDiscountAmount: 0,
        finalBuyerPrice: 40,
        commissionAmount: 12,
        netAmount: 28,
        effectiveCommissionRate: 0.3,
      },
    ])

    expect(csv).toContain('"kit ""premium"""')
    expect(csv).toContain('variationName,fullPrice,discountPercent')
  })

  it('applies coupon without max cap when maxDiscount is omitted', () => {
    const result = calculateNetFromFullPrice({
      context: {
        sellerType: 'cnpj',
        storeCoupon: { rate: 10, minPrice: 1 },
      },
      items: [{ variationName: 'no-cap', fullPrice: 100, discountPercent: 0 }],
    })[0]

    expect(result.couponApplied).toBe(true)
    expect(result.couponDiscountAmount).toBe(10)
    expect(result.finalBuyerPrice).toBe(90)
  })

  it('covers >100% normalization, minPrice branch and missing storeCoupon branch', () => {
    const [withMinPrice, withoutCouponConfig] = calculateNetFromFullPrice({
      context: { sellerType: 'cnpj', storeCoupon: { rate: 150, minPrice: 1, maxDiscount: 1000 } },
      items: [
        { variationName: 'with-min', fullPrice: 100, discountPercent: 200 },
        { variationName: 'no-store-coupon', fullPrice: 100, discountPercent: 10 },
      ],
    })

    const [withoutStoreCoupon] = calculateNetFromFullPrice({
      context: { sellerType: 'cnpj' },
      items: [{ variationName: 'plain', fullPrice: 100, discountPercent: 10 }],
    })

    expect(withMinPrice.discountPercent).toBe(1)
    expect(withMinPrice.couponApplied).toBe(false)
    expect(withoutCouponConfig.finalBuyerPrice).toBe(0)
    expect(withoutStoreCoupon.couponRate).toBe(0)
  })
})

describe('discount-from-target-net service', () => {
  it('finds a discount that reaches target net', () => {
    const targetNet = 27
    const result = calculateDiscountFromTargetNet({
      context: cpfContext,
      items: [{ variationName: '10 pcs', fullPrice: 80.02, targetNet }],
    })[0]

    expect(result.status).toBe('ok')
    expect(result.requiredDiscountPercent).toBeGreaterThanOrEqual(0)
    expect(result.requiredDiscountPercent).toBeLessThan(1)
    expect(result.netAmount).toBeGreaterThanOrEqual(targetNet)
  })

  it('returns target-too-high when target exceeds net at zero discount', () => {
    const result = calculateDiscountFromTargetNet({
      context: cnpjContext,
      items: [{ variationName: 'high', fullPrice: 80, targetNet: 9999 }],
    })[0]

    expect(result.status).toBe('target-too-high')
    expect(result.requiredDiscountPercent).toBe(0)
  })

  it('returns max-discount-cap-reached when target is below net at 99% discount', () => {
    const result = calculateDiscountFromTargetNet({
      context: cnpjContext,
      items: [{ variationName: 'low', fullPrice: 80, targetNet: -999 }],
    })[0]

    expect(result.status).toBe('max-discount-cap-reached')
    expect(result.requiredDiscountPercent).toBe(0.99)
  })

  it('handles coupon rate normalization branches', () => {
    const withNegative = calculateDiscountFromTargetNet({
      context: {
        sellerType: 'cnpj',
        storeCoupon: { rate: -2, minPrice: 1 },
      },
      items: [{ variationName: 'a', fullPrice: 100, targetNet: 50 }],
    })[0]

    const withPercentOverOne = calculateDiscountFromTargetNet({
      context: {
        sellerType: 'cnpj',
        storeCoupon: { rate: 300, minPrice: 1, maxDiscount: 999 },
      },
      items: [{ variationName: 'b', fullPrice: 100, targetNet: 50 }],
    })[0]

    expect(withNegative.couponDiscountAmount).toBe(0)
    expect(withPercentOverOne.couponDiscountAmount).toBeGreaterThan(0)
  })

  it('applies coupon path without max cap', () => {
    const result = calculateDiscountFromTargetNet({
      context: {
        sellerType: 'cnpj',
        storeCoupon: { rate: 0.1, minPrice: 1 },
      },
      items: [{ variationName: 'item', fullPrice: 100, targetNet: 10 }],
    })[0]

    expect(result.couponApplied).toBe(true)
    expect(result.couponDiscountAmount).toBeGreaterThan(0)
  })

  it('covers non-finite coupon rate normalization', () => {
    const result = calculateDiscountFromTargetNet({
      context: {
        sellerType: 'cnpj',
        storeCoupon: { rate: Number.NaN, minPrice: 1 },
      },
      items: [{ variationName: 'nan-rate', fullPrice: 100, targetNet: 50 }],
    })[0]

    expect(result.couponDiscountAmount).toBe(0)
  })

  it('exports CSV', () => {
    const csv = discountFromTargetNetToCsv([
      {
        variationName: 'item',
        fullPrice: 80,
        targetNet: 20,
        requiredDiscountPercent: 0.5,
        discountedPrice: 40,
        couponApplied: true,
        couponDiscountAmount: 1,
        finalBuyerPrice: 39,
        commissionAmount: 11,
        netAmount: 28,
        status: 'ok',
      },
    ])

    expect(csv).toContain('requiredDiscountPercent')
    expect(csv).toContain('"ok"')
  })
})

describe('full-price-from-target-net service', () => {
  it('finds full price from target net and fixed discount', () => {
    const targetNet = 27
    const discountPercent = 50
    const result = calculateFullPriceFromTargetNet({
      context: cpfContext,
      items: [{ variationName: '10 pcs', discountPercent, targetNet }],
    })[0]

    expect(result.status).toBe('ok')
    expect(result.requiredFullPrice).toBeGreaterThan(0)
    expect(result.netAmount).toBeGreaterThanOrEqual(targetNet)
  })

  it('returns target-too-low when target is already met at fullPrice 0', () => {
    const result = calculateFullPriceFromTargetNet({
      context: cnpjContext,
      items: [{ variationName: 'low', discountPercent: 50, targetNet: 0 }],
    })[0]

    expect(result.status).toBe('target-too-low')
    expect(result.requiredFullPrice).toBe(0)
  })

  it('returns target-too-high when target is unreachable', () => {
    const result = calculateFullPriceFromTargetNet({
      context: cnpjContext,
      items: [{ variationName: 'high', discountPercent: 100, targetNet: 1 }],
    })[0]

    expect(result.status).toBe('target-too-high')
  })

  it('handles normalization branches for discount and coupon rate', () => {
    const result = calculateFullPriceFromTargetNet({
      context: {
        sellerType: 'cnpj',
        storeCoupon: { rate: Number.NaN },
      },
      items: [{ variationName: 'normalize', discountPercent: -10, targetNet: 1 }],
    })[0]

    expect(result.discountPercent).toBe(0)
    expect(result.requiredFullPrice).toBeGreaterThan(0)
  })

  it('covers high-percent normalization and coupon without max cap', () => {
    const result = calculateFullPriceFromTargetNet({
      context: {
        sellerType: 'cnpj',
        storeCoupon: { rate: 10, minPrice: 1 },
      },
      items: [{ variationName: 'normalize-high', discountPercent: 250, targetNet: 1 }],
    })[0]

    expect(result.discountPercent).toBe(1)
    expect(result.status).toBe('target-too-high')
  })

  it('applies coupon branch without maxDiscount in full-price service', () => {
    const result = calculateFullPriceFromTargetNet({
      context: {
        sellerType: 'cnpj',
        storeCoupon: { rate: 0.1, minPrice: 1 },
      },
      items: [{ variationName: 'no-max', discountPercent: 0, targetNet: 10 }],
    })[0]

    expect(result.couponApplied).toBe(true)
    expect(result.couponDiscountAmount).toBeGreaterThan(0)
  })

  it('exports CSV', () => {
    const csv = fullPriceFromTargetNetToCsv([
      {
        variationName: 'item',
        discountPercent: 0.5,
        targetNet: 20,
        requiredFullPrice: 80,
        discountedPrice: 40,
        couponApplied: false,
        couponDiscountAmount: 0,
        finalBuyerPrice: 40,
        commissionAmount: 12,
        netAmount: 28,
        status: 'ok',
      },
    ])

    expect(csv).toContain('requiredFullPrice')
    expect(csv).toContain('"ok"')
  })
})

describe('product-value-from-cost-and-target-profit service', () => {
  it('uses target net as cost plus target profit', () => {
    const productCost = 10
    const targetProfit = 20
    const result = calculateProductValueFromCostAndTargetProfit({
      context: cnpjContext,
      items: [
        {
          variationName: 'sku',
          productCost,
          targetProfit,
          productCouponPercent: 0,
        },
      ],
    })[0]

    expect(result.targetNetAmount).toBe(30)
    expect(result.netAmount).toBeGreaterThanOrEqual(result.targetNetAmount)
    expect(result.profitAfterCost).toBeCloseTo(result.netAmount - productCost, 2)
    expect(result.profitDiffToTarget).toBeCloseTo(result.profitAfterCost - targetProfit, 2)
  })

  it('normalizes product coupon percent and returns pix subsidy breakdown', () => {
    const result = calculateProductValueFromCostAndTargetProfit({
      context: {
        sellerType: 'cnpj',
        paymentMethod: 'pix',
      },
      items: [
        {
          variationName: 'sku',
          productCost: 0,
          targetProfit: 10,
          productCouponPercent: 150,
        },
      ],
    })[0]

    expect(result.productCouponPercent).toBe(1)
    expect(result.pixSubsidyAmount).toBeGreaterThanOrEqual(0)
  })

  it('preserves target-too-high status for unreachable scenario', () => {
    const result = calculateProductValueFromCostAndTargetProfit({
      context: cnpjContext,
      items: [
        {
          variationName: 'unreachable',
          productCost: 100,
          targetProfit: 1,
          productCouponPercent: 100,
        },
      ],
    })[0]

    expect(result.status).toBe('target-too-high')
  })

  it('treats null and invalid values as zero', () => {
    const result = calculateProductValueFromCostAndTargetProfit({
      context: cnpjContext,
      items: [
        {
          variationName: 'normalize-null',
          productCost: null as unknown as number,
          targetProfit: Number.NaN,
          productCouponPercent: null as unknown as number,
        },
      ],
    })[0]

    expect(result.productCost).toBe(0)
    expect(result.targetProfit).toBe(0)
    expect(result.targetNetAmount).toBe(0)
    expect(result.productCouponPercent).toBe(0)
  })
})
