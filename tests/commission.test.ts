import { describe, expect, it } from 'vitest'

import { calculateCommission, calculateRequiredItemPrice } from '../src/domain/commission'
import { defaultCommissionRules2026 } from '../src/domain/default-rules'

describe('calculateCommission', () => {
  it('calcula cnpj sem pix para item de R$500', () => {
    const result = calculateCommission({
      itemPrice: 500,
      sellerType: 'cnpj',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
      rules: defaultCommissionRules2026,
    })

    expect(result.baseCommissionAmount).toBe(96)
    expect(result.commissionAmount).toBe(96)
    expect(result.netAmount).toBe(404)
  })

  it('calcula cnpj com pix para item de R$500', () => {
    const result = calculateCommission({
      itemPrice: 500,
      sellerType: 'cnpj',
      paymentMethod: 'pix',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
      rules: defaultCommissionRules2026,
    })

    expect(result.pixSubsidyAmount).toBe(40)
    expect(result.commissionAmount).toBe(56)
    expect(result.itemInvoicePrice).toBe(460)
    expect(result.netAmount).toBe(404)
  })

  it('aplica adicional cpf quando pedidos em 90 dias passam do limite', () => {
    const withExtra = calculateCommission({
      itemPrice: 100,
      sellerType: 'cpf',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 451,
      includeCampaignExtra: false,
      rules: defaultCommissionRules2026,
    })

    const withoutExtra = calculateCommission({
      itemPrice: 100,
      sellerType: 'cpf',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 450,
      includeCampaignExtra: false,
      rules: defaultCommissionRules2026,
    })

    expect(withExtra.cpfExtraFeeAmount).toBe(3)
    expect(withoutExtra.cpfExtraFeeAmount).toBe(0)
    expect(withExtra.totalCommissionAmount - withoutExtra.totalCommissionAmount).toBe(3)
  })

  it('aplica regra de item barato para cnpj abaixo de R$8', () => {
    const result = calculateCommission({
      itemPrice: 6,
      sellerType: 'cnpj',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
      rules: defaultCommissionRules2026,
    })

    expect(result.fixedFeeAmount).toBe(3)
    expect(result.percentageAmount).toBe(1.2)
    expect(result.totalCommissionAmount).toBe(4.2)
  })
})

describe('calculateRequiredItemPrice', () => {
  it('encontra preço para líquido alvo no cenário cnpj sem pix', () => {
    const result = calculateRequiredItemPrice({
      targetNetAmount: 404,
      sellerType: 'cnpj',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
      rules: defaultCommissionRules2026,
    })

    expect(result.suggestedItemPrice).toBeCloseTo(500, 2)
    expect(result.outcome.netAmount).toBeGreaterThanOrEqual(404)
  })

  it('encontra preço para líquido alvo no cenário cnpj com pix', () => {
    const result = calculateRequiredItemPrice({
      targetNetAmount: 404,
      sellerType: 'cnpj',
      paymentMethod: 'pix',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
      rules: defaultCommissionRules2026,
    })

    expect(result.suggestedItemPrice).toBeCloseTo(500, 2)
    expect(result.outcome.netAmount).toBeGreaterThanOrEqual(404)
  })
})
