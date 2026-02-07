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
