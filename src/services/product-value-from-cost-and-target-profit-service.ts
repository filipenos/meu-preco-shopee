import { roundMoney } from '../lib/money'
import type { PaymentMethod, SellerType } from '../domain/types'
import { createCommissionService, type CommissionServiceConfig } from './commission-service'
import { calculateFullPriceFromTargetNet } from './full-price-from-target-net-service'

export interface ProductValueFromCostContext {
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

export interface ProductValueFromCostItemInput {
  variationName: string
  productCost: number
  targetProfit: number
  productCouponPercent: number
}

export interface ProductValueFromCostInput {
  context: ProductValueFromCostContext
  items: ProductValueFromCostItemInput[]
  rulesConfig?: CommissionServiceConfig
}

export interface ProductValueFromCostItemResult {
  variationName: string
  productCost: number
  targetProfit: number
  targetNetAmount: number
  productCouponPercent: number
  requiredFullPrice: number
  discountedPrice: number
  couponApplied: boolean
  couponDiscountAmount: number
  finalBuyerPrice: number
  commissionAmount: number
  pixSubsidyAmount: number
  netAmount: number
  netDiffToTarget: number
  profitAfterCost: number
  profitDiffToTarget: number
  status: 'ok' | 'target-too-low' | 'target-too-high'
}

function normalizeMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return value < 0 ? 0 : value
}

function normalizePercent(value: number): number {
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

export function calculateProductValueFromCostAndTargetProfit(
  input: ProductValueFromCostInput,
): ProductValueFromCostItemResult[] {
  const paymentMethod = input.context.paymentMethod ?? 'card_or_boleto'
  const ordersLast90Days = input.context.ordersLast90Days ?? 0
  const includeCampaignExtra = input.context.includeCampaignExtra ?? false
  const service = createCommissionService(input.rulesConfig)

  const fullPriceResults = calculateFullPriceFromTargetNet({
    context: input.context,
    items: input.items.map((item) => ({
      variationName: item.variationName,
      discountPercent: normalizePercent(item.productCouponPercent),
      targetNet: roundMoney(normalizeMoney(item.productCost) + normalizeMoney(item.targetProfit)),
    })),
    rulesConfig: input.rulesConfig,
  })

  return fullPriceResults.map((result, index) => {
    const source = input.items[index]
    const productCost = roundMoney(normalizeMoney(source.productCost))
    const targetProfit = roundMoney(normalizeMoney(source.targetProfit))
    const targetNetAmount = roundMoney(productCost + targetProfit)
    const profitAfterCost = roundMoney(result.netAmount - productCost)
    const breakdown = service.calculateFromItemPrice({
      itemPrice: result.finalBuyerPrice,
      sellerType: input.context.sellerType,
      paymentMethod,
      ordersLast90Days,
      includeCampaignExtra,
    })

    return {
      variationName: result.variationName,
      productCost,
      targetProfit,
      targetNetAmount,
      productCouponPercent: result.discountPercent,
      requiredFullPrice: result.requiredFullPrice,
      discountedPrice: result.discountedPrice,
      couponApplied: result.couponApplied,
      couponDiscountAmount: result.couponDiscountAmount,
      finalBuyerPrice: result.finalBuyerPrice,
      commissionAmount: result.commissionAmount,
      pixSubsidyAmount: breakdown.pixSubsidyAmount,
      netAmount: result.netAmount,
      netDiffToTarget: roundMoney(result.netAmount - targetNetAmount),
      profitAfterCost,
      profitDiffToTarget: roundMoney(profitAfterCost - targetProfit),
      status: result.status,
    }
  })
}
