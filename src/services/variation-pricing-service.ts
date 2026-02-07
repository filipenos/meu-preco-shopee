import { roundMoney } from '../lib/money'
import type { PaymentMethod, SellerType } from '../domain/types'
import { createCommissionService, type CommissionServiceConfig } from './commission-service'

export interface VariationPricingInput {
  productName?: string
  variationName: string
  cost?: number
  targetNet: number
  desiredDiscountRate: number
}

export interface VariationPricingContext {
  sellerType: SellerType
  paymentMethod: PaymentMethod
  ordersLast90Days: number
  includeCampaignExtra: boolean
}

export interface DiscountAlternative {
  discountRate: number
  fullPrice: number
}

export interface VariationPricingResult {
  productName?: string
  variationName: string
  cost?: number
  targetNet: number
  expectedNet: number
  desiredDiscountRate: number
  sellingPriceNeeded: number
  fullPriceForDesiredDiscount: number
  effectiveCommissionRate: number
  marginAmount?: number
  marginRateOnCost?: number
  discountAlternatives: DiscountAlternative[]
  suggestedDiscountRate: number
  suggestedFullPrice: number
}

export interface VariationPricingPlanInput {
  context: VariationPricingContext
  items: VariationPricingInput[]
  discountCandidates?: number[]
  rulesConfig?: CommissionServiceConfig
}

function clampDiscount(value: number): number {
  if (value < 0) return 0
  if (value >= 1) return 0.99
  return value
}

function buildDiscountCandidates(desired: number, explicit?: number[]): number[] {
  if (explicit && explicit.length > 0) {
    return [...new Set(explicit.map(clampDiscount))].sort((a, b) => a - b)
  }

  const spread = [0, -0.08, -0.05, -0.02, 0.02, 0.05, 0.08]
  return [...new Set(spread.map((delta) => clampDiscount(desired + delta)))].sort((a, b) => a - b)
}

function scoreCharm(fullPrice: number): number {
  const cents = Math.round((fullPrice - Math.floor(fullPrice)) * 100)
  return Math.min(Math.abs(cents - 90), Math.abs(cents - 99))
}

function pickSuggestedAlternative(
  alternatives: DiscountAlternative[],
  desiredDiscountRate: number,
): DiscountAlternative {
  return [...alternatives].sort((a, b) => {
    const charmA = scoreCharm(a.fullPrice)
    const charmB = scoreCharm(b.fullPrice)
    if (charmA !== charmB) {
      return charmA - charmB
    }

    const desiredDiffA = Math.abs(a.discountRate - desiredDiscountRate)
    const desiredDiffB = Math.abs(b.discountRate - desiredDiscountRate)
    if (desiredDiffA !== desiredDiffB) {
      return desiredDiffA - desiredDiffB
    }

    return a.fullPrice - b.fullPrice
  })[0]
}

export function calculateVariationPricingPlan(input: VariationPricingPlanInput): VariationPricingResult[] {
  const service = createCommissionService(input.rulesConfig)

  return input.items.map((item) => {
    const desiredDiscountRate = clampDiscount(item.desiredDiscountRate)

    const fromNet = service.calculateFromTargetNet({
      targetNetAmount: item.targetNet,
      sellerType: input.context.sellerType,
      paymentMethod: input.context.paymentMethod,
      ordersLast90Days: input.context.ordersLast90Days,
      includeCampaignExtra: input.context.includeCampaignExtra,
    })

    const sellingPriceNeeded = fromNet.suggestedItemPrice
    const fullPriceForDesiredDiscount = roundMoney(sellingPriceNeeded / (1 - desiredDiscountRate))

    const alternatives = buildDiscountCandidates(desiredDiscountRate, input.discountCandidates).map((discountRate) => ({
      discountRate,
      fullPrice: roundMoney(sellingPriceNeeded / (1 - discountRate)),
    }))

    const suggested = pickSuggestedAlternative(alternatives, desiredDiscountRate)

    const hasCost = typeof item.cost === 'number'
    const cost = hasCost ? roundMoney(item.cost as number) : undefined
    const marginAmount = hasCost ? roundMoney(item.targetNet - (item.cost as number)) : undefined
    const marginRateOnCost = hasCost && (item.cost as number) > 0 ? (marginAmount as number) / (item.cost as number) : undefined

    return {
      productName: item.productName,
      variationName: item.variationName,
      cost,
      targetNet: roundMoney(item.targetNet),
      expectedNet: fromNet.outcome.netAmount,
      desiredDiscountRate,
      sellingPriceNeeded,
      fullPriceForDesiredDiscount,
      effectiveCommissionRate: sellingPriceNeeded > 0 ? fromNet.outcome.totalCommissionAmount / sellingPriceNeeded : 0,
      marginAmount,
      marginRateOnCost,
      discountAlternatives: alternatives,
      suggestedDiscountRate: suggested.discountRate,
      suggestedFullPrice: suggested.fullPrice,
    }
  })
}

export function toCsv(results: VariationPricingResult[]): string {
  const header = [
    'productName',
    'variationName',
    'cost',
    'targetNet',
    'sellingPriceNeeded',
    'desiredDiscountRate',
    'fullPriceForDesiredDiscount',
    'suggestedDiscountRate',
    'suggestedFullPrice',
    'effectiveCommissionRate',
    'marginAmount',
    'marginRateOnCost',
  ].join(',')

  const lines = results.map((result) => {
    const row = [
      result.productName ?? '',
      result.variationName,
      result.cost ?? '',
      result.targetNet,
      result.sellingPriceNeeded,
      result.desiredDiscountRate,
      result.fullPriceForDesiredDiscount,
      result.suggestedDiscountRate,
      result.suggestedFullPrice,
      result.effectiveCommissionRate,
      result.marginAmount ?? '',
      result.marginRateOnCost ?? '',
    ]

    return row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')
  })

  return [header, ...lines].join('\n')
}
