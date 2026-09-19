import { assertFiniteNumber, fromCents, roundMoney, toCents } from '../lib/money'
import { validateRate } from '../lib/discount'
import { createPricingEngine, type PricingContext, type PricingEvaluation } from './pricing-engine'
import type { CommissionServiceConfig } from './commission-service'

export type FullPriceFromTargetNetContext = PricingContext

export interface FullPriceFromTargetNetItemInput {
  variationName: string
  discountPercent: number
  targetNet: number
}

export interface FullPriceFromTargetNetInput {
  couponTreatment?: 'compensate' | 'absorb'
  context: FullPriceFromTargetNetContext
  items: FullPriceFromTargetNetItemInput[]
  rulesConfig?: CommissionServiceConfig
}

export interface FullPriceFromTargetNetItemResult extends PricingEvaluation {
  variationName: string
  discountPercent: number
  targetNet: number
  requiredFullPrice: number
  status: 'ok' | 'target-too-low' | 'target-too-high'
}

export function calculateFullPriceFromTargetNet(input: FullPriceFromTargetNetInput): FullPriceFromTargetNetItemResult[] {
  if (input.couponTreatment !== undefined && !['compensate', 'absorb'].includes(input.couponTreatment)) throw new Error('Tratamento do cupom inválido')
  const engine = createPricingEngine(input.context, input.rulesConfig)
  const searchEngine = input.couponTreatment === 'absorb'
    ? createPricingEngine({ ...input.context, storeCoupon: undefined }, input.rulesConfig)
    : engine
  return input.items.map((item) => {
    const discountPercent = validateRate(item.discountPercent)
    assertFiniteNumber(item.targetNet, 'Líquido alvo', 0, 100_000_000)
    const targetNet = roundMoney(item.targetNet)
    const zero = engine.evaluate(0, discountPercent)
    if (zero.netAmount >= targetNet) return {
      variationName: item.variationName, discountPercent, targetNet,
      requiredFullPrice: 0, ...zero, status: 'target-too-low' as const,
    }
    const cents = searchEngine.findPrice(discountPercent, toCents(targetNet))
    const price = cents ?? 10_000_000_000
    return {
      variationName: item.variationName, discountPercent, targetNet,
      requiredFullPrice: fromCents(price), ...engine.evaluate(price, discountPercent),
      status: cents === undefined ? 'target-too-high' as const : 'ok' as const,
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
    'effectiveDate',
    'policyVersion',
    'calculationWarnings',
    'additionalCostsAmount',
    'freightCopaymentAmount',
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
