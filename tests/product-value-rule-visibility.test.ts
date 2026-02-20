import { describe, expect, it } from 'vitest'

import { getProductValueRuleVisibility } from '../src/pages/product-value-rule-visibility'

describe('product value advanced rules visibility', () => {
  it('shows only CNPJ-specific fields when seller is CNPJ', () => {
    const visibility = getProductValueRuleVisibility('cnpj')

    expect(visibility.campaignExtraRatePercent).toBe(true)
    expect(visibility.cpfExtraFee).toBe(false)
    expect(visibility.cpfExtraOrdersThreshold90d).toBe(false)
    expect(visibility.cnpjLowPriceThreshold).toBe(true)
    expect(visibility.cpfLowPriceThreshold).toBe(false)
  })

  it('shows only CPF-specific fields when seller is CPF', () => {
    const visibility = getProductValueRuleVisibility('cpf')

    expect(visibility.campaignExtraRatePercent).toBe(true)
    expect(visibility.cpfExtraFee).toBe(true)
    expect(visibility.cpfExtraOrdersThreshold90d).toBe(true)
    expect(visibility.cnpjLowPriceThreshold).toBe(false)
    expect(visibility.cpfLowPriceThreshold).toBe(true)
  })
})
