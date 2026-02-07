import { roundMoney } from '../lib/money'
import type {
  CommissionInput,
  CommissionResult,
  InterpolationPoint,
  InverseCommissionInput,
  InverseCommissionResult,
  PriceBracket,
} from './types'

function clampNonNegative(value: number): number {
  return value < 0 ? 0 : value
}

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
      const ratio = (price - left.price) / (right.price - left.price)
      return left.fixedFee + ratio * (right.fixedFee - left.fixedFee)
    }
  }

  return lastPoint.fixedFee
}

function hasCpfExtraFee(ordersLast90Days: number, threshold: number): boolean {
  return ordersLast90Days > threshold
}

function resolveFixedFee(input: CommissionInput, bracket: PriceBracket): { fixedFee: number; cpfExtraFee: number } {
  const { itemPrice, rules, sellerType, ordersLast90Days } = input
  const cpfExtraEnabled = hasCpfExtraFee(ordersLast90Days, rules.cpfExtraOrdersThreshold90d)

  if (sellerType === 'cnpj' && itemPrice < rules.cnpjLowPriceThreshold) {
    return {
      fixedFee: itemPrice / 2,
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
  const itemPrice = roundMoney(input.itemPrice)
  const bracket = findBracket(itemPrice, input.rules.brackets)
  const { fixedFee, cpfExtraFee } = resolveFixedFee({ ...input, itemPrice }, bracket)

  const percentageAmount = roundMoney(itemPrice * bracket.percentageRate)
  const fixedFeeAmount = roundMoney(fixedFee)
  const cpfExtraFeeAmount = roundMoney(cpfExtraFee)

  const baseCommissionAmount = roundMoney(percentageAmount + fixedFeeAmount + cpfExtraFeeAmount)

  const isPix = input.paymentMethod === 'pix'
  const pixSubsidyRate = isPix ? bracket.pixSubsidyRate : 0
  const pixSubsidyAmount = roundMoney(isPix ? itemPrice * pixSubsidyRate : 0)

  const commissionAmount = roundMoney(clampNonNegative(baseCommissionAmount - pixSubsidyAmount))
  const itemInvoicePrice = roundMoney(clampNonNegative(itemPrice - pixSubsidyAmount))

  const campaignExtraRate = input.includeCampaignExtra ? input.rules.campaignExtraRate : 0
  const campaignExtraAmount = roundMoney(itemInvoicePrice * campaignExtraRate)

  const totalCommissionAmount = roundMoney(commissionAmount + campaignExtraAmount)
  const netAmount = roundMoney(itemInvoicePrice - totalCommissionAmount)

  return {
    itemPrice,
    itemInvoicePrice,
    sellerType: input.sellerType,
    paymentMethod: input.paymentMethod,
    bracket,
    percentageAmount,
    fixedFeeAmount,
    cpfExtraFeeAmount,
    baseCommissionAmount,
    pixSubsidyRate,
    pixSubsidyAmount,
    commissionAmount,
    campaignExtraRate,
    campaignExtraAmount,
    totalCommissionAmount,
    netAmount,
  }
}

export function calculateRequiredItemPrice(input: InverseCommissionInput): InverseCommissionResult {
  const requestedNetAmount = roundMoney(input.targetNetAmount)

  let low = 0
  let high = 500000
  let bestPrice = high

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2
    const outcome = calculateCommission({
      itemPrice: mid,
      sellerType: input.sellerType,
      paymentMethod: input.paymentMethod,
      ordersLast90Days: input.ordersLast90Days,
      includeCampaignExtra: input.includeCampaignExtra,
      rules: input.rules,
    })

    if (outcome.netAmount >= requestedNetAmount) {
      bestPrice = mid
      high = mid
    } else {
      low = mid
    }
  }

  const suggestedItemPrice = roundMoney(bestPrice)
  const outcome = calculateCommission({
    itemPrice: suggestedItemPrice,
    sellerType: input.sellerType,
    paymentMethod: input.paymentMethod,
    ordersLast90Days: input.ordersLast90Days,
    includeCampaignExtra: input.includeCampaignExtra,
    rules: input.rules,
  })

  return {
    requestedNetAmount,
    suggestedItemPrice,
    outcome,
  }
}
