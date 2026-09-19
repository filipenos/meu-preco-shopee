import { assertFiniteNumber, fromCents, roundMoney, toCents } from '../lib/money'
import { validateRate } from '../lib/discount'
import type { PricingContext, PricingEvaluation } from './pricing-engine'
import type { CommissionServiceConfig } from './commission-service'
import { calculateFullPriceFromTargetNet } from './full-price-from-target-net-service'

export type ProductValueFromCostContext = PricingContext

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

export interface ProductValueFromCostItemResult extends PricingEvaluation {
  variationName: string
  productCost: number
  targetProfit: number
  targetNetAmount: number
  productCouponPercent: number
  requiredFullPrice: number
  netDiffToTarget: number
  profitAfterCost: number
  profitDiffToTarget: number
  status: 'ok' | 'target-too-low' | 'target-too-high'
}

export function calculateProductValueFromCostAndTargetProfit(
  input: ProductValueFromCostInput,
): ProductValueFromCostItemResult[] {
  for (const item of input.items) {
    assertFiniteNumber(item.productCost, 'Custo', 0, 100_000_000)
    assertFiniteNumber(item.targetProfit, 'Lucro', 0, 100_000_000)
  }
  const fullPriceResults = calculateFullPriceFromTargetNet({
    context: input.context,
    items: input.items.map((item) => ({
      variationName: item.variationName,
      discountPercent: validateRate(item.productCouponPercent),
      targetNet: fromCents(toCents(item.productCost) + toCents(item.targetProfit)),
    })),
    rulesConfig: input.rulesConfig,
  })

  return fullPriceResults.map((result, index) => {
    const source = input.items[index]
    const productCost = roundMoney(source.productCost)
    const targetProfit = roundMoney(source.targetProfit)
    const targetNetAmount = fromCents(toCents(productCost) + toCents(targetProfit))
    const profitAfterCost = fromCents(toCents(result.netAmount) - toCents(productCost))

    return {
      ...result,
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
      pixSubsidyAmount: result.pixSubsidyAmount,
      netAmount: result.netAmount,
      netDiffToTarget: fromCents(toCents(result.netAmount) - toCents(targetNetAmount)),
      profitAfterCost,
      profitDiffToTarget: fromCents(toCents(profitAfterCost) - toCents(targetProfit)),
      status: result.status,
    }
  })
}
