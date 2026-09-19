import { assertFiniteNumber, roundMoney, toCents } from '../lib/money'
import { createPricingEngine, type PricingContext, type PricingEvaluation } from './pricing-engine'
import type { CommissionServiceConfig } from './commission-service'

export type DiscountFromTargetNetContext = PricingContext

export interface DiscountFromTargetNetItemInput {
  variationName: string
  fullPrice: number
  targetNet: number
}

export interface DiscountFromTargetNetInput {
  context: DiscountFromTargetNetContext
  items: DiscountFromTargetNetItemInput[]
  rulesConfig?: CommissionServiceConfig
}

export interface DiscountFromTargetNetItemResult extends PricingEvaluation {
  variationName: string
  fullPrice: number
  targetNet: number
  requiredDiscountPercent: number
  status: 'ok' | 'target-too-high' | 'max-discount-cap-reached'
}

export function calculateDiscountFromTargetNet(input: DiscountFromTargetNetInput): DiscountFromTargetNetItemResult[] {
  const engine = createPricingEngine(input.context, input.rulesConfig)
  return input.items.map((item) => {
    assertFiniteNumber(item.fullPrice, 'Preço cheio', 0, 100_000_000)
    assertFiniteNumber(item.targetNet, 'Líquido alvo', 0, 100_000_000)
    const fullPrice = roundMoney(item.fullPrice)
    const targetNet = roundMoney(item.targetNet)
    // Return a discount that can be entered with two percentage decimal places.
    // Enumerating this finite grid handles all bracket and coupon discontinuities.
    for (let basisPoints = 9900; basisPoints >= 0; basisPoints -= 1) {
      const discount = basisPoints / 10000
      const result = engine.evaluate(toCents(fullPrice), discount)
      if (result.netAmount >= targetNet) return {
        variationName: item.variationName, fullPrice, targetNet,
        requiredDiscountPercent: discount, ...result,
        status: basisPoints === 9900 ? 'max-discount-cap-reached' as const : 'ok' as const,
      }
    }
    return {
      variationName: item.variationName, fullPrice, targetNet,
      requiredDiscountPercent: 0, ...engine.evaluate(toCents(fullPrice), 0), status: 'target-too-high' as const,
    }
  })
}

export function discountFromTargetNetToCsv(results: DiscountFromTargetNetItemResult[]): string {
  const header = [
    'variationName',
    'fullPrice',
    'targetNet',
    'requiredDiscountPercent',
    'discountedPrice',
    'couponApplied',
    'couponDiscountAmount',
    'finalBuyerPrice',
    'commissionAmount',
    'netAmount',
    'status',
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
      result.targetNet,
      result.requiredDiscountPercent,
      result.discountedPrice,
      result.couponApplied,
      result.couponDiscountAmount,
      result.finalBuyerPrice,
      result.commissionAmount,
      result.netAmount,
      result.status,
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
