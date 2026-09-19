import { assertFiniteNumber, fromCents, toCents } from '../lib/money'
import type { CommissionServiceConfig } from './commission-service'
import { createPricingEngine, type PricingContext, type PricingEvaluation } from './pricing-engine'

export interface LowerPriceSuggestion {
  suggestedPrice: number
  priceReduction: number
  netGain: number
  outcome: PricingEvaluation
}

export function compareLowerPrices(input: {
  fullPrice: number
  context: PricingContext
  rulesConfig?: CommissionServiceConfig
}): { current: PricingEvaluation; suggestion: LowerPriceSuggestion | null } {
  assertFiniteNumber(input.fullPrice, 'Preço cheio', 0, 100_000_000)
  const price = toCents(input.fullPrice)
  const engine = createPricingEngine(input.context, input.rulesConfig)
  const current = engine.evaluate(price, 0)
  let suggestion: LowerPriceSuggestion | null = null
  if (price <= 1) return { current, suggestion }

  // Existence of a price reaching a target is monotonic, unlike net proceeds
  // across fee brackets. Reuse the cent-aware search for each target.
  let low = toCents(current.netAmount) + 1
  let high = price - 1
  while (low <= high) {
    const target = Math.floor((low + high) / 2)
    const found = engine.findPrice(0, target, price - 1, 1)
    if (found === undefined) {
      high = target - 1
    } else {
      const outcome = engine.evaluate(found, 0)
      suggestion = {
        suggestedPrice: fromCents(found),
        priceReduction: fromCents(price - found),
        netGain: fromCents(toCents(outcome.netAmount) - toCents(current.netAmount)),
        outcome,
      }
      low = toCents(outcome.netAmount) + 1
    }
  }
  return { current, suggestion }
}
