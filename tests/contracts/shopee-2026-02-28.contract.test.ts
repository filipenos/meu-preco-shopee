import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { calculateLegacyCpfCommission } from '../../public/comissoes/services/legacy-cpf-commission-service.js'
import { calculateLegacyCnpjCommission } from '../../public/comissoes/services/legacy-cnpj-commission-service.js'

interface CpfRules {
  article: number
  percentageRate: number
  transportRateWhenFreteGratis: number
  campaignExtraRate: number
  baseCapWithoutCpfExtraFee: number
  baseCapWithCpfExtraFee: number
  fixedFeeDefault: number
  cpfExtraFee: number
  cpfExtraOrdersThreshold90d: number
  cpfLowPriceThreshold: number
  cpfLowPriceWithExtraFeePoints: Array<{ price: number; fixedFee: number }>
}

interface CnpjRules {
  article: number
  percentageRate: number
  transportRateWhenFreteGratis: number
  campaignExtraRate: number
  baseCap: number
  fixedFeeDefault: number
  cnpjLowPriceThreshold: number
  cnpjLowPriceMode: string
}

interface ContractExample<TInput, TExpected> {
  id: string
  input: TInput
  expected: TExpected
}

type CpfInput = {
  itemPrice: number
  ordersLast90Days: number
  includeFreteGratis: boolean
  includeCampaignExtra: boolean
}

type CnpjInput = {
  itemPrice: number
  includeFreteGratis: boolean
  includeCampaignExtra: boolean
  applyLowPriceRule: boolean
}

function loadJson<T>(relativePath: string): T {
  const fullPath = path.join(process.cwd(), relativePath)
  return JSON.parse(readFileSync(fullPath, 'utf-8')) as T
}

describe('shopee legacy contract (ate 28/02/2026)', () => {
  const cpfRules = loadJson<CpfRules>('references/shopee/2026-02-28/cpf/rules.json')
  const cnpjRules = loadJson<CnpjRules>('references/shopee/2026-02-28/cnpj/rules.json')

  const cpfExamples = loadJson<ContractExample<CpfInput, ReturnType<typeof calculateLegacyCpfCommission>>[]>(
    'references/shopee/2026-02-28/cpf/examples.json',
  )
  const cnpjExamples = loadJson<ContractExample<CnpjInput, ReturnType<typeof calculateLegacyCnpjCommission>>[]>(
    'references/shopee/2026-02-28/cnpj/examples.json',
  )

  it('keeps cpf reference metadata stable', () => {
    expect(cpfRules.article).toBe(18484)
    expect(cpfRules.percentageRate).toBe(0.14)
    expect(cpfRules.cpfExtraOrdersThreshold90d).toBe(450)
  })

  it('keeps cnpj reference metadata stable', () => {
    expect(cnpjRules.article).toBe(18483)
    expect(cnpjRules.percentageRate).toBe(0.14)
    expect(cnpjRules.baseCap).toBe(104)
  })

  it('matches cpf legacy scenarios', () => {
    for (const example of cpfExamples) {
      const result = calculateLegacyCpfCommission(example.input)
      expect(result, example.id).toStrictEqual(example.expected)
    }
  })

  it('matches cnpj legacy scenarios', () => {
    for (const example of cnpjExamples) {
      const result = calculateLegacyCnpjCommission(example.input)
      expect(result, example.id).toStrictEqual(example.expected)
    }
  })
})
