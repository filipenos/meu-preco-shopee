import { commissionBoundaries } from '../domain/commission'
import type { CalculationAudit, PaymentMethod, SellerType } from '../domain/types'
import { validateRate } from '../lib/discount'
import { assertFiniteNumber, fromCents, multiplyRate, toCents } from '../lib/money'
import { findFirstPrice, firstInteger } from '../lib/price-search'
import { createCommissionService, type CommissionServiceConfig } from './commission-service'

export interface StoreCoupon {
  minPrice?: number
  rate?: number
  amount?: number
  maxDiscount?: number
}

export interface PricingContext {
  sellerType: SellerType
  paymentMethod?: PaymentMethod
  ordersLast90Days?: number
  includeCampaignExtra?: boolean
  storeCoupon?: StoreCoupon
  pixSubsidyRateOverride?: number
  // Actual amounts per simulated item; no guessed affiliate/return fee formulas.
  additionalCosts?: {
    affiliateCommission?: number
    sellerCoins?: number
    shippingAdjustment?: number
    returnShipping?: number
    other?: number
  }
  sellerLogisticsFreightDiscount?: number
}

export interface PricingEvaluation {
  discountedPrice: number
  couponApplied: boolean
  couponDiscountAmount: number
  finalBuyerPrice: number
  baseCommissionAmount: number
  campaignExtraAmount: number
  commissionAmount: number
  pixSubsidyAmount: number
  additionalCostsAmount: number
  freightCopaymentAmount: number
  netAmount: number
  audit: CalculationAudit
}

export function validateCoupon(coupon: StoreCoupon = {}): void {
  if (coupon.rate !== undefined) validateRate(coupon.rate)
  if (coupon.rate !== undefined && coupon.amount !== undefined) throw new Error('Escolha cupom percentual ou fixo')
  for (const value of [coupon.minPrice, coupon.maxDiscount, coupon.amount]) {
    if (value !== undefined) assertFiniteNumber(value, 'Valor do cupom', 0, 100_000_000)
  }
}

export function couponDiscount(cents: number, coupon: StoreCoupon = {}): number {
  if (cents < toCents(coupon.minPrice ?? 0)) return 0
  const discount = coupon.amount !== undefined ? toCents(coupon.amount) : multiplyRate(cents, coupon.rate ?? 0)
  return Math.min(cents, discount, coupon.maxDiscount === undefined ? cents : toCents(coupon.maxDiscount))
}

export function createPricingEngine(context: PricingContext, config?: CommissionServiceConfig) {
  const service = createCommissionService(config)
  const coupon = context.storeCoupon ?? {}
  validateCoupon(coupon)
  let costs = 0
  for (const value of Object.values(context.additionalCosts ?? {})) {
    assertFiniteNumber(value, 'Custo adicional', 0, 100_000_000)
    costs += toCents(value)
  }
  assertFiniteNumber(context.sellerLogisticsFreightDiscount ?? 0, 'Desconto de frete', 0, 100_000_000)
  const freight = Math.min(1000, multiplyRate(toCents(context.sellerLogisticsFreightDiscount ?? 0), 0.25))
  const discountedCents = (fullCents: number, discount: number) => multiplyRate(fullCents, 1 - discount)
  const buyerCents = (fullCents: number, discount: number) => {
    const price = discountedCents(fullCents, discount)
    return price - couponDiscount(price, coupon)
  }
  const evaluate = (fullCents: number, discount: number): PricingEvaluation => {
    const price = discountedCents(fullCents, discount)
    const couponAmount = couponDiscount(price, coupon)
    const result = service.calculateFromItemPrice({
      itemPrice: fromCents(price - couponAmount),
      sellerType: context.sellerType,
      paymentMethod: context.paymentMethod ?? 'card_or_boleto',
      ordersLast90Days: context.ordersLast90Days ?? 0,
      includeCampaignExtra: context.includeCampaignExtra ?? false,
      pixSubsidyRateOverride: context.pixSubsidyRateOverride,
    })
    if (couponAmount > 0) result.audit.warnings.push('coupon-commission-base-unverified')
    return {
      discountedPrice: fromCents(price), couponApplied: couponAmount > 0,
      couponDiscountAmount: fromCents(couponAmount), finalBuyerPrice: fromCents(price - couponAmount),
      baseCommissionAmount: result.baseCommissionAmount, campaignExtraAmount: result.campaignExtraAmount,
      commissionAmount: result.totalCommissionAmount, pixSubsidyAmount: result.pixSubsidyAmount,
      additionalCostsAmount: fromCents(costs), freightCopaymentAmount: fromCents(freight),
      netAmount: fromCents(toCents(result.netAmount) - costs - freight), audit: result.audit,
    }
  }
  const findPrice = (discount: number, target: number, maxCents = 10_000_000_000, minCents = 0): number | undefined => {
    // Coupon activation can lower the buyer price; split before mapping fee brackets.
    const activation = firstInteger(0, maxCents + 1, (cents) => discountedCents(cents, discount) >= toCents(coupon.minPrice ?? 0))
    const starts = [...new Set([0, activation].filter((value) => value <= maxCents))].sort((a, b) => a - b)
    const boundaries = [...starts]
    for (let i = 0; i < starts.length; i += 1) {
      const end = (starts[i + 1] ?? maxCents + 1) - 1
      for (const threshold of commissionBoundaries(service.getRules())) {
        const crossing = firstInteger(starts[i], end + 1, (cents) => buyerCents(cents, discount) >= threshold)
        if (crossing <= end) boundaries.push(crossing)
      }
    }
    return findFirstPrice(minCents, maxCents, boundaries, target, (cents) => {
      const result = evaluate(cents, discount)
      return { grossCents: toCents(result.finalBuyerPrice), baseFeesCents: toCents(result.baseCommissionAmount) + toCents(result.campaignExtraAmount) + costs + freight, netCents: toCents(result.netAmount) }
    })
  }
  return { evaluate, findPrice }
}
