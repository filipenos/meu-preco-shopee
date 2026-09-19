import { validateRate } from '../lib/discount'
import { assertFiniteNumber, fromCents, multiplyRate, toCents } from '../lib/money'
import { firstInteger } from '../lib/price-search'
import type { CommissionServiceConfig } from './commission-service'
import { createPricingEngine, type PricingContext } from './pricing-engine'
import { compareLowerPrices } from './lower-price-service'

export function calculateTargetSalePrice(input: {
  targetPrice: number
  discountPercent: number
  couponTreatment: 'compensate' | 'absorb'
  context: PricingContext
  rulesConfig?: CommissionServiceConfig
}) {
  assertFiniteNumber(input.targetPrice, 'Preço desejado', 0.01, 100_000_000)
  const discount = validateRate(input.discountPercent)
  if (!['compensate', 'absorb'].includes(input.couponTreatment)) throw new Error('Tratamento do cupom inválido')
  const engine = createPricingEngine(input.context, input.rulesConfig)
  const target = toCents(input.targetPrice)
  const limit = 10_000_000_000
  const activation = firstInteger(1, limit + 1, (price) =>
    multiplyRate(price, 1 - discount) >= toCents(input.context.storeCoupon?.minPrice ?? 0))
  // Coupon activation can lower the final price. Search each monotonic interval separately.
  const starts = [...new Set([1, activation].filter((price) => price <= limit))].sort((a, b) => a - b)
  for (let index = 0; index < starts.length; index += 1) {
    const end = (starts[index + 1] ?? limit + 1) - 1
    const found = firstInteger(starts[index], end + 1, (price) => {
      const result = engine.evaluate(price, discount)
      return toCents(input.couponTreatment === 'compensate' ? result.finalBuyerPrice : result.discountedPrice) >= target
    })
    if (found <= end) {
      const fullPrice = fromCents(found)
      const comparison = compareLowerPrices({ ...input, fullPrice })
      const achieved = input.couponTreatment === 'compensate' ? comparison.current.finalBuyerPrice : comparison.current.discountedPrice
      return { ...comparison, fullPrice, exact: toCents(achieved) === target }
    }
  }
  throw new Error('Não é possível atingir esse preço com os descontos informados no limite da calculadora.')
}
