import { assertFiniteNumber, roundMoney, toCents } from '../lib/money'
import { validateRate } from '../lib/discount'
import { createPricingEngine, type PricingContext, type PricingEvaluation } from './pricing-engine'
import type { CommissionServiceConfig } from './commission-service'

export type NetFromFullPriceContext = PricingContext

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

export interface NetFromFullPriceItemResult extends PricingEvaluation {
  variationName: string
  fullPrice: number
  discountPercent: number
  couponRate: number
  couponMinPrice?: number
  couponMaxDiscount?: number
  effectiveCommissionRate: number
}

export function calculateNetFromFullPrice(input: NetFromFullPriceInput): NetFromFullPriceItemResult[] {
  const engine = createPricingEngine(input.context, input.rulesConfig)
  return input.items.map((item) => {
    assertFiniteNumber(item.fullPrice, 'Preço cheio', 0, 100_000_000)
    const fullPrice = roundMoney(item.fullPrice)
    const discountPercent = validateRate(item.discountPercent)
    const result = engine.evaluate(toCents(fullPrice), discountPercent)
    return {
      variationName: item.variationName, fullPrice, discountPercent, ...result,
      couponRate: input.context.storeCoupon?.rate ?? 0,
      couponMinPrice: input.context.storeCoupon?.minPrice,
      couponMaxDiscount: input.context.storeCoupon?.maxDiscount,
      effectiveCommissionRate: result.finalBuyerPrice > 0 ? result.commissionAmount / result.finalBuyerPrice : 0,
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
    'effectiveDate',
    'policyVersion',
    'calculationWarnings',
    'additionalCostsAmount',
    'freightCopaymentAmount',
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
      result.audit.effectiveDate ?? '',
      result.audit.policyVersion ?? '',
      result.audit.warnings.join(';'),
      result.additionalCostsAmount,
      result.freightCopaymentAmount,
    ]

    return row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')
  })

  return [header, ...lines].join('\n')
}
