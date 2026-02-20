import { roundMoney } from '../lib/money'
import type { PaymentMethod, SellerType } from '../domain/types'
import { createCommissionService, type CommissionServiceConfig } from './commission-service'

export interface FullPriceFromTargetNetContext {
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

export interface FullPriceFromTargetNetItemInput {
  variationName: string
  discountPercent: number
  targetNet: number
}

export interface FullPriceFromTargetNetInput {
  context: FullPriceFromTargetNetContext
  items: FullPriceFromTargetNetItemInput[]
  rulesConfig?: CommissionServiceConfig
}

export interface FullPriceFromTargetNetItemResult {
  variationName: string
  discountPercent: number
  targetNet: number
  requiredFullPrice: number
  discountedPrice: number
  couponApplied: boolean
  couponDiscountAmount: number
  finalBuyerPrice: number
  commissionAmount: number
  netAmount: number
  status: 'ok' | 'target-too-low' | 'target-too-high'
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) return 0

  const percent = value > 1 ? value / 100 : value
  if (percent < 0) return 0
  if (percent > 1) return 1
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

export function calculateFullPriceFromTargetNet(input: FullPriceFromTargetNetInput): FullPriceFromTargetNetItemResult[] {
  const service = createCommissionService(input.rulesConfig)
  const paymentMethod = input.context.paymentMethod ?? 'card_or_boleto'
  const ordersLast90Days = input.context.ordersLast90Days ?? 0
  const includeCampaignExtra = input.context.includeCampaignExtra ?? false

  const couponRate = normalizePercent(input.context.storeCoupon?.rate ?? 0)
  const couponMinPrice = input.context.storeCoupon?.minPrice
  const couponMaxDiscount = input.context.storeCoupon?.maxDiscount

  const evaluate = (fullPrice: number, discountPercent: number) => {
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
      discountedPrice,
      couponApplied: coupon.couponApplied,
      couponDiscountAmount: coupon.couponDiscountAmount,
      finalBuyerPrice: coupon.finalBuyerPrice,
      commissionAmount: commission.totalCommissionAmount,
      netAmount: commission.netAmount,
    }
  }

  return input.items.map((item) => {
    const discountPercent = normalizePercent(item.discountPercent)
    const targetNet = roundMoney(item.targetNet)

    const atZero = evaluate(0, discountPercent)
    if (targetNet <= atZero.netAmount) {
      return {
        variationName: item.variationName,
        discountPercent,
        targetNet,
        requiredFullPrice: 0,
        ...atZero,
        status: 'target-too-low',
      }
    }

    let low = 0
    let high = 100
    let atHigh = evaluate(high, discountPercent)
    let guard = 0

    while (atHigh.netAmount < targetNet && guard < 30) {
      high *= 2
      atHigh = evaluate(high, discountPercent)
      guard += 1
    }

    if (atHigh.netAmount < targetNet) {
      return {
        variationName: item.variationName,
        discountPercent,
        targetNet,
        requiredFullPrice: roundMoney(high),
        ...atHigh,
        status: 'target-too-high',
      }
    }

    let bestPrice = high
    let best = atHigh

    for (let i = 0; i < 80; i += 1) {
      const mid = (low + high) / 2
      const current = evaluate(mid, discountPercent)

      if (current.netAmount >= targetNet) {
        bestPrice = mid
        best = current
        high = mid
      } else {
        low = mid
      }
    }

    return {
      variationName: item.variationName,
      discountPercent,
      targetNet,
      requiredFullPrice: roundMoney(bestPrice),
      ...best,
      status: 'ok',
    }
  })
}

export function fullPriceFromTargetNetToCsv(results: FullPriceFromTargetNetItemResult[]): string {
  const header = [
    'variationName',
    'discountPercent',
    'targetNet',
    'requiredFullPrice',
    'discountedPrice',
    'couponApplied',
    'couponDiscountAmount',
    'finalBuyerPrice',
    'commissionAmount',
    'netAmount',
    'status',
  ].join(',')

  const lines = results.map((result) => {
    const row = [
      result.variationName,
      result.discountPercent,
      result.targetNet,
      result.requiredFullPrice,
      result.discountedPrice,
      result.couponApplied,
      result.couponDiscountAmount,
      result.finalBuyerPrice,
      result.commissionAmount,
      result.netAmount,
      result.status,
    ]

    return row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
  })

  return [header, ...lines].join('\n')
}
