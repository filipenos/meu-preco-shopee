import { roundMoney } from '../lib/money'
import type { PaymentMethod, SellerType } from '../domain/types'
import { createCommissionService, type CommissionServiceConfig } from './commission-service'

export interface NetFromFullPriceContext {
  sellerType: SellerType
  paymentMethod?: PaymentMethod
  ordersLast90Days?: number
  includeCampaignExtra?: boolean
  storeCoupon?: {
    minPrice?: number
    rate?: number
    maxDiscount?: number
  }
}

export interface NetFromFullPriceItemInput {
  variationName: string
  fullPrice: number
  discountPercent: number
}

export interface NetFromFullPriceInput {
  context: NetFromFullPriceContext
  items: NetFromFullPriceItemInput[]
  rulesConfig?: CommissionServiceConfig
}

export interface NetFromFullPriceItemResult {
  variationName: string
  fullPrice: number
  discountPercent: number
  discountedPrice: number
  couponApplied: boolean
  couponRate: number
  couponMinPrice?: number
  couponMaxDiscount?: number
  couponDiscountAmount: number
  finalBuyerPrice: number
  commissionAmount: number
  netAmount: number
  effectiveCommissionRate: number
}

function normalizeDiscountPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const percent = value > 1 ? value / 100 : value
  if (percent < 0) {
    return 0
  }
  if (percent > 1) {
    return 1
  }

  return percent
}

function applyStoreCoupon(
  discountedPrice: number,
  couponRate: number,
  couponMinPrice?: number,
  couponMaxDiscount?: number,
): { couponApplied: boolean; couponDiscountAmount: number; finalBuyerPrice: number } {
  const meetsMinimum = typeof couponMinPrice === 'number' ? discountedPrice >= couponMinPrice : true
  if (!meetsMinimum || couponRate <= 0) {
    return {
      couponApplied: false,
      couponDiscountAmount: 0,
      finalBuyerPrice: discountedPrice,
    }
  }

  const rawCoupon = discountedPrice * couponRate
  const cappedCoupon = typeof couponMaxDiscount === 'number' ? Math.min(rawCoupon, couponMaxDiscount) : rawCoupon
  const couponDiscountAmount = roundMoney(Math.max(0, Math.min(cappedCoupon, discountedPrice)))
  const finalBuyerPrice = roundMoney(discountedPrice - couponDiscountAmount)

  return {
    couponApplied: couponDiscountAmount > 0,
    couponDiscountAmount,
    finalBuyerPrice,
  }
}

export function calculateNetFromFullPrice(input: NetFromFullPriceInput): NetFromFullPriceItemResult[] {
  const service = createCommissionService(input.rulesConfig)

  const paymentMethod = input.context.paymentMethod ?? 'card_or_boleto'
  const ordersLast90Days = input.context.ordersLast90Days ?? 0
  const includeCampaignExtra = input.context.includeCampaignExtra ?? false
  const couponRate = normalizeDiscountPercent(input.context.storeCoupon?.rate ?? 0)
  const couponMinPrice = input.context.storeCoupon?.minPrice
  const couponMaxDiscount = input.context.storeCoupon?.maxDiscount

  return input.items.map((item) => {
    const fullPrice = roundMoney(item.fullPrice)
    const discountPercent = normalizeDiscountPercent(item.discountPercent)
    const discountedPrice = roundMoney(fullPrice * (1 - discountPercent))
    const coupon = applyStoreCoupon(discountedPrice, couponRate, couponMinPrice, couponMaxDiscount)

    const commission = service.calculateFromItemPrice({
      itemPrice: coupon.finalBuyerPrice,
      sellerType: input.context.sellerType,
      paymentMethod,
      ordersLast90Days,
      includeCampaignExtra,
    })

    return {
      variationName: item.variationName,
      fullPrice,
      discountPercent,
      discountedPrice,
      couponApplied: coupon.couponApplied,
      couponRate,
      couponMinPrice,
      couponMaxDiscount,
      couponDiscountAmount: coupon.couponDiscountAmount,
      finalBuyerPrice: coupon.finalBuyerPrice,
      commissionAmount: commission.totalCommissionAmount,
      netAmount: commission.netAmount,
      effectiveCommissionRate: coupon.finalBuyerPrice > 0 ? commission.totalCommissionAmount / coupon.finalBuyerPrice : 0,
    }
  })
}

export function netFromFullPriceToCsv(results: NetFromFullPriceItemResult[]): string {
  const header = [
    'variationName',
    'fullPrice',
    'discountPercent',
    'discountedPrice',
    'couponApplied',
    'couponRate',
    'couponMinPrice',
    'couponMaxDiscount',
    'couponDiscountAmount',
    'finalBuyerPrice',
    'commissionAmount',
    'netAmount',
    'effectiveCommissionRate',
  ].join(',')

  const lines = results.map((result) => {
    const row = [
      result.variationName,
      result.fullPrice,
      result.discountPercent,
      result.discountedPrice,
      result.couponApplied,
      result.couponRate,
      result.couponMinPrice ?? '',
      result.couponMaxDiscount ?? '',
      result.couponDiscountAmount,
      result.finalBuyerPrice,
      result.commissionAmount,
      result.netAmount,
      result.effectiveCommissionRate,
    ]

    return row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')
  })

  return [header, ...lines].join('\n')
}
