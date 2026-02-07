export type SellerType = 'cnpj' | 'cpf'
export type PaymentMethod = 'card_or_boleto' | 'pix'

export interface PriceBracket {
  min: number
  max: number | null
  percentageRate: number
  fixedFee: number
  pixSubsidyRate: number
}

export interface InterpolationPoint {
  price: number
  fixedFee: number
}

export interface CommissionRules {
  brackets: PriceBracket[]
  campaignExtraRate: number
  cpfExtraFee: number
  cpfExtraOrdersThreshold90d: number
  cnpjLowPriceThreshold: number
  cpfLowPriceThreshold: number
  cpfLowPriceWithExtraFeePoints: InterpolationPoint[]
  cpfLowPriceWithoutExtraFeePoints: InterpolationPoint[]
}

export interface CommissionInput {
  itemPrice: number
  sellerType: SellerType
  paymentMethod: PaymentMethod
  ordersLast90Days: number
  includeCampaignExtra: boolean
  rules: CommissionRules
}

export interface CommissionResult {
  itemPrice: number
  itemInvoicePrice: number
  sellerType: SellerType
  paymentMethod: PaymentMethod
  bracket: PriceBracket
  percentageAmount: number
  fixedFeeAmount: number
  cpfExtraFeeAmount: number
  baseCommissionAmount: number
  pixSubsidyRate: number
  pixSubsidyAmount: number
  commissionAmount: number
  campaignExtraRate: number
  campaignExtraAmount: number
  totalCommissionAmount: number
  netAmount: number
}

export interface InverseCommissionInput {
  targetNetAmount: number
  sellerType: SellerType
  paymentMethod: PaymentMethod
  ordersLast90Days: number
  includeCampaignExtra: boolean
  rules: CommissionRules
}

export interface InverseCommissionResult {
  requestedNetAmount: number
  suggestedItemPrice: number
  outcome: CommissionResult
}
