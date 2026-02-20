import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { createCommissionService } from '../../src/services/commission-service'

interface ReferenceRules {
  brackets: Array<{
    min: number
    max: number | null
    percentageRate: number
    fixedFee: number
    pixSubsidyRate: number
  }>
  campaignExtraRate: number
  cpfExtraFee: number
  cpfExtraOrdersThreshold90d: number
  cnpjLowPriceThreshold: number
  cpfLowPriceThreshold: number
  cpfLowPriceWithExtraFeePoints: Array<{ price: number; fixedFee: number }>
  cpfLowPriceWithoutExtraFeePoints: Array<{ price: number; fixedFee: number }>
}

interface ContractExample {
  id: string
  input: {
    itemPrice: number
    sellerType: 'cnpj' | 'cpf'
    paymentMethod: 'card_or_boleto' | 'pix'
    ordersLast90Days: number
    includeCampaignExtra: boolean
  }
  expected: {
    bracket: {
      min: number
      max: number | null
      percentageRate: number
      fixedFee: number
      pixSubsidyRate: number
    }
    percentageAmount: number
    fixedFeeAmount: number
    cpfExtraFeeAmount: number
    baseCommissionAmount: number
    pixSubsidyAmount: number
    itemInvoicePrice: number
    commissionAmount: number
    campaignExtraAmount: number
    totalCommissionAmount: number
    netAmount: number
  }
}

function loadJson<T>(relativePath: string): T {
  const fullPath = path.join(process.cwd(), relativePath)
  return JSON.parse(readFileSync(fullPath, 'utf-8')) as T
}

describe('shopee 2026 contract', () => {
  const service = createCommissionService()
  const referenceRules = loadJson<ReferenceRules>('references/shopee/2026-03-01/rules.json')
  const examples = loadJson<ContractExample[]>('references/shopee/2026-03-01/examples.json')

  it('matches reference default rules', () => {
    expect(service.getRules()).toStrictEqual(referenceRules)
  })

  it('matches all reference scenarios', () => {
    for (const example of examples) {
      const result = service.calculateFromItemPrice(example.input)

      expect(result.bracket).toStrictEqual(example.expected.bracket)
      expect(result.percentageAmount, example.id).toBe(example.expected.percentageAmount)
      expect(result.fixedFeeAmount, example.id).toBe(example.expected.fixedFeeAmount)
      expect(result.cpfExtraFeeAmount, example.id).toBe(example.expected.cpfExtraFeeAmount)
      expect(result.baseCommissionAmount, example.id).toBe(example.expected.baseCommissionAmount)
      expect(result.pixSubsidyAmount, example.id).toBe(example.expected.pixSubsidyAmount)
      expect(result.itemInvoicePrice, example.id).toBe(example.expected.itemInvoicePrice)
      expect(result.commissionAmount, example.id).toBe(example.expected.commissionAmount)
      expect(result.campaignExtraAmount, example.id).toBe(example.expected.campaignExtraAmount)
      expect(result.totalCommissionAmount, example.id).toBe(example.expected.totalCommissionAmount)
      expect(result.netAmount, example.id).toBe(example.expected.netAmount)
    }
  })
})
