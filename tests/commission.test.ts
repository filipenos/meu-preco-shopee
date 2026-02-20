import { describe, expect, it } from 'vitest'

import { createCommissionService } from '../src/services/commission-service'

const service = createCommissionService()

describe('calculateCommission', () => {
  it('calcula cnpj sem pix para item de R$500', () => {
    const result = service.calculateFromItemPrice({
      itemPrice: 500,
      sellerType: 'cnpj',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
    })

    expect(result.baseCommissionAmount).toBe(96)
    expect(result.commissionAmount).toBe(96)
    expect(result.netAmount).toBe(404)
  })

  it('calcula cnpj com pix para item de R$500', () => {
    const result = service.calculateFromItemPrice({
      itemPrice: 500,
      sellerType: 'cnpj',
      paymentMethod: 'pix',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
    })

    expect(result.pixSubsidyAmount).toBe(40)
    expect(result.commissionAmount).toBe(56)
    expect(result.itemInvoicePrice).toBe(460)
    expect(result.netAmount).toBe(404)
  })

  it('aplica adicional cpf quando pedidos em 90 dias passam do limite', () => {
    const withExtra = service.calculateFromItemPrice({
      itemPrice: 100,
      sellerType: 'cpf',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 451,
      includeCampaignExtra: false,
    })

    const withoutExtra = service.calculateFromItemPrice({
      itemPrice: 100,
      sellerType: 'cpf',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 450,
      includeCampaignExtra: false,
    })

    expect(withExtra.cpfExtraFeeAmount).toBe(3)
    expect(withoutExtra.cpfExtraFeeAmount).toBe(0)
    expect(withExtra.totalCommissionAmount - withoutExtra.totalCommissionAmount).toBe(3)
  })

  it('aplica regra de item barato para cnpj abaixo de R$8', () => {
    const result = service.calculateFromItemPrice({
      itemPrice: 6,
      sellerType: 'cnpj',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
    })

    expect(result.fixedFeeAmount).toBe(3)
    expect(result.percentageAmount).toBe(1.2)
    expect(result.totalCommissionAmount).toBe(4.2)
  })

  it('respeita troca de faixa entre R$79,99 e R$80,00', () => {
    const at7999 = service.calculateFromItemPrice({
      itemPrice: 79.99,
      sellerType: 'cnpj',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
    })

    const at80 = service.calculateFromItemPrice({
      itemPrice: 80,
      sellerType: 'cnpj',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
    })

    expect(at7999.bracket.fixedFee).toBe(4)
    expect(at80.bracket.fixedFee).toBe(16)
  })

  it('aplica adicional CPF apenas acima de 450 pedidos em 90 dias', () => {
    const at450 = service.calculateFromItemPrice({
      itemPrice: 120,
      sellerType: 'cpf',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 450,
      includeCampaignExtra: false,
    })

    const at451 = service.calculateFromItemPrice({
      itemPrice: 120,
      sellerType: 'cpf',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 451,
      includeCampaignExtra: false,
    })

    expect(at450.cpfExtraFeeAmount).toBe(0)
    expect(at451.cpfExtraFeeAmount).toBe(3)
  })

  it('aplica taxa regressiva de CPF abaixo de R$12 conforme limite de pedidos', () => {
    const withoutExtra = service.calculateFromItemPrice({
      itemPrice: 10,
      sellerType: 'cpf',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
    })

    const withExtra = service.calculateFromItemPrice({
      itemPrice: 10,
      sellerType: 'cpf',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 451,
      includeCampaignExtra: false,
    })

    expect(withoutExtra.fixedFeeAmount).toBe(3.5)
    expect(withExtra.fixedFeeAmount).toBe(6.5)
    expect(withExtra.cpfExtraFeeAmount).toBe(0)
  })

  it('mantém líquido igual para Pix e cartão quando não há campanha', () => {
    const card = service.calculateFromItemPrice({
      itemPrice: 500,
      sellerType: 'cnpj',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
    })

    const pix = service.calculateFromItemPrice({
      itemPrice: 500,
      sellerType: 'cnpj',
      paymentMethod: 'pix',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
    })

    expect(card.netAmount).toBe(404)
    expect(pix.netAmount).toBe(404)
  })

  it('aplica campanha de 2,5% sobre itemInvoicePrice (após subsídio Pix)', () => {
    const result = service.calculateFromItemPrice({
      itemPrice: 100,
      sellerType: 'cnpj',
      paymentMethod: 'pix',
      ordersLast90Days: 0,
      includeCampaignExtra: true,
    })

    expect(result.itemInvoicePrice).toBe(95)
    expect(result.campaignExtraAmount).toBe(2.38)
    expect(result.totalCommissionAmount).toBe(31.38)
    expect(result.netAmount).toBe(63.62)
  })
})

describe('calculateRequiredItemPrice', () => {
  it('encontra preço para líquido alvo no cenário cnpj sem pix', () => {
    const result = service.calculateFromTargetNet({
      targetNetAmount: 404,
      sellerType: 'cnpj',
      paymentMethod: 'card_or_boleto',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
    })

    expect(result.suggestedItemPrice).toBeCloseTo(500, 2)
    expect(result.outcome.netAmount).toBeGreaterThanOrEqual(404)
  })

  it('encontra preço para líquido alvo no cenário cnpj com pix', () => {
    const result = service.calculateFromTargetNet({
      targetNetAmount: 404,
      sellerType: 'cnpj',
      paymentMethod: 'pix',
      ordersLast90Days: 0,
      includeCampaignExtra: false,
    })

    expect(result.suggestedItemPrice).toBeCloseTo(500, 2)
    expect(result.outcome.netAmount).toBeGreaterThanOrEqual(404)
  })
})
