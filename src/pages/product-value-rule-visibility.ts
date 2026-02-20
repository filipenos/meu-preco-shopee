import type { SellerType } from '../domain/types'

export interface ProductValueRuleVisibility {
  campaignExtraRatePercent: boolean
  cpfExtraFee: boolean
  cpfExtraOrdersThreshold90d: boolean
  cnpjLowPriceThreshold: boolean
  cpfLowPriceThreshold: boolean
}

export function getProductValueRuleVisibility(sellerType: SellerType): ProductValueRuleVisibility {
  if (sellerType === 'cpf') {
    return {
      campaignExtraRatePercent: true,
      cpfExtraFee: true,
      cpfExtraOrdersThreshold90d: true,
      cnpjLowPriceThreshold: false,
      cpfLowPriceThreshold: true,
    }
  }

  return {
    campaignExtraRatePercent: true,
    cpfExtraFee: false,
    cpfExtraOrdersThreshold90d: false,
    cnpjLowPriceThreshold: true,
    cpfLowPriceThreshold: false,
  }
}
