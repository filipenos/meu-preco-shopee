import { assertFiniteNumber, fromCents, multiplyRate, roundMoney, toCents } from '../lib/money'
import { findFirstPrice } from '../lib/price-search'
import type {
  CommissionInput,
  CommissionResult,
  InterpolationPoint,
  InverseCommissionInput,
  InverseCommissionResult,
  PriceBracket,
} from './types'

function findBracket(price: number, brackets: PriceBracket[]): PriceBracket {
  const found = brackets.find((bracket) => {
    const isAboveMin = price >= bracket.min
    const isBelowMax = bracket.max === null || price <= bracket.max
    return isAboveMin && isBelowMax
  })

  if (!found) {
    throw new Error(`Faixa de preço não encontrada para ${price}`)
  }

  return found
}

function interpolateFixedFee(price: number, points: InterpolationPoint[]): number {
  if (points.length === 0) {
    return 0
  }

  const ordered = [...points].sort((a, b) => a.price - b.price)

  if (price <= ordered[0].price) {
    return ordered[0].fixedFee
  }

  const lastPoint = ordered[ordered.length - 1]
  if (price >= lastPoint.price) {
    return lastPoint.fixedFee
  }

  for (let i = 0; i < ordered.length - 1; i += 1) {
    const left = ordered[i]
    const right = ordered[i + 1]

    if (price >= left.price && price <= right.price) {
      const width = BigInt(toCents(right.price) - toCents(left.price))
      const offset = BigInt(toCents(price) - toCents(left.price))
      const numerator = BigInt(toCents(left.fixedFee)) * width + offset * BigInt(toCents(right.fixedFee) - toCents(left.fixedFee))
      return fromCents(Number((numerator + width / 2n) / width))
    }
  }

  return lastPoint.fixedFee
}

function hasCpfExtraFee(ordersLast90Days: number, threshold: number): boolean {
  return ordersLast90Days > threshold
}

function resolveFixedFee(input: CommissionInput, bracket: PriceBracket): { fixedFee: number; cpfExtraFee: number } {
  const { itemPrice, rules, sellerType, ordersLast90Days } = input
  if (itemPrice === 0) return { fixedFee: 0, cpfExtraFee: 0 }
  const cpfExtraEnabled = hasCpfExtraFee(ordersLast90Days, rules.cpfExtraOrdersThreshold90d)

  if (sellerType === 'cnpj' && itemPrice < rules.cnpjLowPriceThreshold) {
    return {
      fixedFee: fromCents(multiplyRate(toCents(itemPrice), 0.5)),
      cpfExtraFee: 0,
    }
  }

  if (sellerType === 'cpf' && itemPrice < rules.cpfLowPriceThreshold) {
    const points = cpfExtraEnabled
      ? rules.cpfLowPriceWithExtraFeePoints
      : rules.cpfLowPriceWithoutExtraFeePoints

    return {
      fixedFee: interpolateFixedFee(itemPrice, points),
      cpfExtraFee: 0,
    }
  }

  if (sellerType === 'cpf' && cpfExtraEnabled) {
    return {
      fixedFee: bracket.fixedFee,
      cpfExtraFee: rules.cpfExtraFee,
    }
  }

  return {
    fixedFee: bracket.fixedFee,
    cpfExtraFee: 0,
  }
}

export function calculateCommission(input: CommissionInput): CommissionResult {
  assertFiniteNumber(input.itemPrice, 'Preço', 0, 100_000_000)
  assertFiniteNumber(input.ordersLast90Days, 'Pedidos nos últimos 90 dias')
  if (!Number.isInteger(input.ordersLast90Days)) throw new Error('Pedidos devem ser inteiros')
  if (!['cpf', 'cnpj'].includes(input.sellerType)) throw new Error('Tipo de vendedor inválido')
  if (!['pix', 'card_or_boleto'].includes(input.paymentMethod)) throw new Error('Pagamento inválido')
  if (typeof input.includeCampaignExtra !== 'boolean') throw new Error('Campanha deve ser booleana')
  const itemCents = toCents(input.itemPrice)
  const itemPrice = fromCents(itemCents)
  const bracket = findBracket(itemPrice, input.rules.brackets)
  const { fixedFee, cpfExtraFee } = resolveFixedFee({ ...input, itemPrice }, bracket)
  const percentage = multiplyRate(itemCents, bracket.percentageRate)
  const fixed = toCents(fixedFee)
  const extra = toCents(cpfExtraFee)
  const base = percentage + fixed + extra
  const pixRate = input.paymentMethod === 'pix' ? Math.min(input.pixSubsidyRateOverride ?? bracket.pixSubsidyRate, bracket.pixSubsidyRate) : 0
  if (input.pixSubsidyRateOverride !== undefined) {
    assertFiniteNumber(input.pixSubsidyRateOverride, 'Subsídio Pix', 0, 0.08)
  }
  const subsidy = multiplyRate(itemCents, pixRate)
  const commission = Math.max(0, base - subsidy)
  const invoice = itemCents - subsidy
  const campaignRate = input.includeCampaignExtra ? input.rules.campaignExtraRate : 0
  const campaign = multiplyRate(invoice, campaignRate)
  const warnings: CommissionResult['audit']['warnings'] = ['rounding-not-reconciled']
  if (input.sellerType === 'cpf' && itemPrice < input.rules.cpfLowPriceThreshold) warnings.push('cpf-low-price-unverified')
  if (input.paymentMethod === 'pix' && bracket.pixSubsidyRate === 0.08 && input.pixSubsidyRateOverride === undefined) warnings.push('pix-rate-assumed')
  if (campaignRate > 0 && subsidy > 0) warnings.push('campaign-pix-base-unverified')
  return {
    audit: { warnings },
    itemPrice,
    itemInvoicePrice: fromCents(invoice),
    sellerType: input.sellerType,
    paymentMethod: input.paymentMethod,
    bracket: { ...bracket },
    percentageAmount: fromCents(percentage),
    fixedFeeAmount: fromCents(fixed),
    cpfExtraFeeAmount: fromCents(extra),
    baseCommissionAmount: fromCents(base),
    pixSubsidyRate: pixRate,
    pixSubsidyAmount: fromCents(subsidy),
    commissionAmount: fromCents(commission),
    campaignExtraRate: campaignRate,
    campaignExtraAmount: fromCents(campaign),
    totalCommissionAmount: fromCents(commission + campaign),
    netAmount: fromCents(invoice - commission - campaign),
  }
}

export function commissionBoundaries(rules: CommissionInput['rules']): number[] {
  return [
    ...rules.brackets.map((bracket) => toCents(bracket.min)),
    toCents(rules.cnpjLowPriceThreshold), toCents(rules.cpfLowPriceThreshold),
    ...rules.cpfLowPriceWithExtraFeePoints.map((point) => toCents(point.price)),
    ...rules.cpfLowPriceWithoutExtraFeePoints.map((point) => toCents(point.price)),
  ]
}

export function calculateRequiredItemPrice(input: InverseCommissionInput): InverseCommissionResult {
  assertFiniteNumber(input.targetNetAmount, 'Líquido alvo', 0, 100_000_000)
  const evaluate = (cents: number) => calculateCommission({ ...input, itemPrice: fromCents(cents) })
  const found = findFirstPrice(0, 10_000_000_000, commissionBoundaries(input.rules), toCents(input.targetNetAmount), (cents) => {
    const result = evaluate(cents)
    return { grossCents: toCents(result.itemPrice), baseFeesCents: toCents(result.baseCommissionAmount) + toCents(result.campaignExtraAmount), netCents: toCents(result.netAmount) }
  })
  if (found === undefined) throw new Error('Líquido alvo não alcançável no limite de R$ 100.000.000')
  return { requestedNetAmount: roundMoney(input.targetNetAmount), suggestedItemPrice: fromCents(found), outcome: evaluate(found) }
}
