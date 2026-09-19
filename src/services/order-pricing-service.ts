import type { CalculationAudit } from '../domain/types'
import { validateRate } from '../lib/discount'
import { assertFiniteNumber, fromCents, multiplyRate, toCents } from '../lib/money'
import type { CommissionServiceConfig } from './commission-service'
import { couponDiscount, createPricingEngine, validateCoupon, type PricingContext, type StoreCoupon } from './pricing-engine'

export interface OrderPricingInput {
  context: Omit<PricingContext, 'storeCoupon' | 'additionalCosts' | 'sellerLogisticsFreightDiscount'>
  items: Array<{ variationName: string; unitPrice: number; quantity: number; discountRate?: number }>
  storeCoupon?: StoreCoupon
  // Optional actual allocation, one entry per unit in input order.
  couponAllocationAmounts?: number[]
  additionalCosts?: PricingContext['additionalCosts']
  sellerLogisticsFreightDiscount?: number
  rulesConfig?: CommissionServiceConfig
}

function allocateDiscount(total: number, prices: number[]): number[] {
  const sum = prices.reduce((acc, value) => acc + value, 0)
  if (sum === 0) return prices.map(() => 0)
  const entries = prices.map((price, index) => {
    const numerator = BigInt(total) * BigInt(price)
    return { index, cents: Number(numerator / BigInt(sum)), remainder: numerator % BigInt(sum) }
  })
  const left = total - entries.reduce((acc, entry) => acc + entry.cents, 0)
  const ordered = [...entries].sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1)
  for (let index = 0; index < left; index += 1) ordered[index].cents += 1
  return entries.map((entry) => entry.cents)
}

export function calculateOrderPricing(input: OrderPricingInput) {
  if (!Array.isArray(input.items) || input.items.length === 0) throw new Error('Pedido deve conter itens')
  validateCoupon(input.storeCoupon)
  let count = 0
  const units = input.items.flatMap((item) => {
    assertFiniteNumber(item.quantity, 'Quantidade', 1, 10000)
    if (!Number.isInteger(item.quantity)) throw new Error('Quantidade deve ser inteira')
    count += item.quantity
    if (count > 10000) throw new Error('Máximo de 10.000 unidades por pedido')
    assertFiniteNumber(item.unitPrice, 'Preço unitário', 0, 100_000_000)
    const price = multiplyRate(toCents(item.unitPrice), 1 - validateRate(item.discountRate ?? 0))
    return Array.from({ length: item.quantity }, () => ({ variationName: item.variationName, price }))
  })
  const subtotal = units.reduce((sum, unit) => sum + unit.price, 0)
  assertFiniteNumber(fromCents(subtotal), 'Subtotal', 0, 100_000_000)
  const discount = couponDiscount(subtotal, input.storeCoupon)
  const allocations = input.couponAllocationAmounts?.map((amount) => {
    assertFiniteNumber(amount, 'Rateio do cupom', 0, 100_000_000)
    return toCents(amount)
  }) ?? allocateDiscount(discount, units.map((unit) => unit.price))
  if (allocations.length !== units.length || allocations.reduce((sum, value) => sum + value, 0) !== discount
    || allocations.some((value, index) => value > units[index].price)) {
    throw new Error('Rateio deve somar o cupom e respeitar os valores de cada unidade')
  }
  const engine = createPricingEngine(input.context, input.rulesConfig)
  const results = units.map((unit, index) => ({
    variationName: unit.variationName,
    priceBeforeCoupon: fromCents(unit.price),
    allocatedCouponAmount: fromCents(allocations[index]),
    ...engine.evaluate(unit.price - allocations[index], 0),
  }))
  const costs = createPricingEngine({
    ...input.context, additionalCosts: input.additionalCosts,
    sellerLogisticsFreightDiscount: input.sellerLogisticsFreightDiscount,
  }, input.rulesConfig).evaluate(0, 0)
  const warnings = [...new Set(results.flatMap((result) => result.audit.warnings))]
  if (discount > 0) {
    warnings.push('coupon-commission-base-unverified')
    if (!input.couponAllocationAmounts) warnings.push('order-coupon-allocation-unverified')
  }
  const audit: CalculationAudit = { ...results[0].audit, warnings: [...new Set(warnings)] }
  const sum = (key: 'commissionAmount' | 'pixSubsidyAmount' | 'netAmount') => results.reduce((total, result) => total + toCents(result[key]), 0)
  return {
    items: results, subtotal: fromCents(subtotal), couponDiscountAmount: fromCents(discount),
    finalBuyerPrice: fromCents(subtotal - discount - sum('pixSubsidyAmount')),
    commissionAmount: fromCents(sum('commissionAmount')), pixSubsidyAmount: fromCents(sum('pixSubsidyAmount')),
    additionalCostsAmount: costs.additionalCostsAmount, freightCopaymentAmount: costs.freightCopaymentAmount,
    netAmount: fromCents(sum('netAmount') - toCents(costs.additionalCostsAmount) - toCents(costs.freightCopaymentAmount)), audit,
  }
}

// In a dispute the public policy does not define how to prorate all fixed fees.
// Require the actual charged commission instead of inventing a compensation formula.
export function calculateReversedOrderSettlement(input: {
  compensationAmount: number
  chargedCommissionAmount?: number
  additionalCostsAmount?: number
}) {
  assertFiniteNumber(input.compensationAmount, 'Compensação', 0, 100_000_000)
  assertFiniteNumber(input.additionalCostsAmount ?? 0, 'Custos', 0, 100_000_000)
  if (input.compensationAmount > 0 && input.chargedCommissionAmount === undefined) {
    throw new Error('Informe a comissão efetivamente cobrada sobre a compensação')
  }
  assertFiniteNumber(input.chargedCommissionAmount ?? 0, 'Comissão', 0, input.compensationAmount)
  const commission = toCents(input.chargedCommissionAmount ?? 0)
  return {
    commissionAmount: fromCents(commission),
    netAmount: fromCents(toCents(input.compensationAmount) - commission - toCents(input.additionalCostsAmount ?? 0)),
  }
}

export function reconcileAmounts(calculated: Record<string, number>, statement: Record<string, number>) {
  const differences = Object.entries(statement).map(([field, expected]) => {
    if (!(field in calculated)) throw new Error(`Campo não calculado: ${field}`)
    return { field, expected: fromCents(toCents(expected)), calculated: fromCents(toCents(calculated[field])), differenceCents: toCents(calculated[field]) - toCents(expected) }
  }).filter((entry) => entry.differenceCents !== 0)
  return { matches: differences.length === 0, differences }
}
