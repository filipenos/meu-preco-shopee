import { describe, expect, it } from 'vitest'

import { calculateVariationPricingPlan } from '../src/services/variation-pricing-service'

describe('calculateVariationPricingPlan', () => {
  it('calcula preço cheio a partir de líquido alvo e desconto desejado', () => {
    const result = calculateVariationPricingPlan({
      context: {
        sellerType: 'cnpj',
        paymentMethod: 'card_or_boleto',
        ordersLast90Days: 0,
        includeCampaignExtra: false,
      },
      discountCandidates: [0.1, 0.12, 0.15],
      items: [
        {
          variationName: 'Kit 10',
          cost: 16,
          targetNet: 30,
          desiredDiscountRate: 0.12,
        },
      ],
    })

    expect(result).toHaveLength(1)
    expect(result[0].variationName).toBe('Kit 10')
    expect(result[0].sellingPriceNeeded).toBeGreaterThan(0)
    expect(result[0].fullPriceForDesiredDiscount).toBeCloseTo(
      result[0].sellingPriceNeeded / (1 - 0.12),
      2,
    )
    expect(result[0].marginAmount).toBe(14)
    expect(result[0].discountAlternatives).toHaveLength(3)
  })

  it('permite calcular sem cost e não retorna margem', () => {
    const result = calculateVariationPricingPlan({
      context: {
        sellerType: 'cnpj',
        paymentMethod: 'card_or_boleto',
        ordersLast90Days: 0,
        includeCampaignExtra: false,
      },
      items: [
        {
          variationName: 'Kit 20',
          targetNet: 44,
          desiredDiscountRate: 0.1,
        },
      ],
    })

    expect(result).toHaveLength(1)
    expect(result[0].sellingPriceNeeded).toBeGreaterThan(0)
    expect(result[0].marginAmount).toBeUndefined()
    expect(result[0].marginRateOnCost).toBeUndefined()
  })
})
