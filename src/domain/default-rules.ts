import type { CommissionRules } from './types'

export const defaultCommissionRules2026: CommissionRules = {
  brackets: [
    {
      min: 0,
      max: 79.99,
      percentageRate: 0.2,
      fixedFee: 4,
      pixSubsidyRate: 0,
    },
    {
      min: 80,
      max: 99.99,
      percentageRate: 0.14,
      fixedFee: 16,
      pixSubsidyRate: 0.05,
    },
    {
      min: 100,
      max: 199.99,
      percentageRate: 0.14,
      fixedFee: 20,
      pixSubsidyRate: 0.05,
    },
    {
      min: 200,
      max: 499.99,
      percentageRate: 0.14,
      fixedFee: 26,
      pixSubsidyRate: 0.05,
    },
    {
      min: 500,
      max: null,
      percentageRate: 0.14,
      fixedFee: 26,
      pixSubsidyRate: 0.08,
    },
  ],
  campaignExtraRate: 0.025,
  cpfExtraFee: 3,
  cpfExtraOrdersThreshold90d: 450,
  cnpjLowPriceThreshold: 8,
  cpfLowPriceThreshold: 12,
  cpfLowPriceWithExtraFeePoints: [
    { price: 8, fixedFee: 6 },
    { price: 10, fixedFee: 6.5 },
    { price: 12, fixedFee: 7 },
  ],
  cpfLowPriceWithoutExtraFeePoints: [
    { price: 8, fixedFee: 3 },
    { price: 10, fixedFee: 3.5 },
    { price: 12, fixedFee: 4 },
  ],
}

export type CommissionPolicyDate = string

export function getCommissionRules(effectiveDate: CommissionPolicyDate): CommissionRules {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)
    || !Number.isFinite(Date.parse(effectiveDate))
    || new Date(effectiveDate).toISOString().slice(0, 10) !== effectiveDate
    || effectiveDate < '2026-03-01') {
    throw new Error('Data da política inválida; suportada a partir de 01/03/2026')
  }
  const rules = structuredClone(defaultCommissionRules2026)
  if (effectiveDate >= '2026-04-23') rules.campaignExtraRate = 0.035
  if (effectiveDate >= '2026-10-01') {
    rules.brackets[0].fixedFee = 4.5
    rules.cnpjLowPriceThreshold = 9
  }
  return rules
}

export function todayInBrazil(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((entry) => entry.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
