import { calculateCommission, calculateRequiredItemPrice } from '../domain/commission'
import { getCommissionRules, todayInBrazil } from '../domain/default-rules'
import { assertFiniteNumber, rateUnits } from '../lib/money'
import type {
  CommissionInput,
  CommissionResult,
  CommissionRules,
  InverseCommissionInput,
  InverseCommissionResult,
} from '../domain/types'

export type CommissionServiceConfig = Partial<
  Pick<
    CommissionRules,
    | 'campaignExtraRate'
    | 'cpfExtraFee'
    | 'cpfExtraOrdersThreshold90d'
    | 'cnpjLowPriceThreshold'
    | 'cpfLowPriceThreshold'
  >
> & { effectiveDate?: string }

type CommissionServiceInput = Omit<CommissionInput, 'rules'>
type InverseServiceInput = Omit<InverseCommissionInput, 'rules'>

export class CommissionService {
  private readonly rules: CommissionRules

  private readonly effectiveDate: string
  private readonly customized: boolean

  constructor(config: CommissionServiceConfig = {}) {
    const allowed = ['effectiveDate', 'campaignExtraRate', 'cpfExtraFee', 'cpfExtraOrdersThreshold90d', 'cnpjLowPriceThreshold', 'cpfLowPriceThreshold']
    if (!config || typeof config !== 'object' || Object.keys(config).some((key) => !allowed.includes(key))) {
      throw new Error('Configuração de comissão inválida')
    }
    const { effectiveDate = todayInBrazil(), ...overrides } = config
    this.effectiveDate = effectiveDate
    const defaults = getCommissionRules(effectiveDate)
    this.customized = Object.entries(overrides).some(([key, value]) => value !== defaults[key as keyof CommissionRules])
    this.rules = { ...defaults, ...overrides }
    rateUnits(this.rules.campaignExtraRate)
    for (const key of ['cpfExtraFee', 'cpfExtraOrdersThreshold90d', 'cnpjLowPriceThreshold', 'cpfLowPriceThreshold'] as const) {
      assertFiniteNumber(this.rules[key], key, 0, 100_000_000)
    }
    if (!Number.isInteger(this.rules.cpfExtraOrdersThreshold90d)) throw new Error('Limite de pedidos deve ser inteiro')
  }

  private audit(result: CommissionResult): CommissionResult {
    result.audit.effectiveDate = this.effectiveDate
    result.audit.policyVersion = this.effectiveDate >= '2026-10-01' ? '2026-10-01'
      : this.effectiveDate >= '2026-04-23' ? '2026-04-23' : '2026-03-01'
    if (this.customized) result.audit.warnings.push('custom-rules')
    return result
  }

  getRules(): CommissionRules {
    return structuredClone(this.rules)
  }

  calculateFromItemPrice(input: CommissionServiceInput): CommissionResult {
    return this.audit(calculateCommission({
      ...input,
      rules: this.rules,
    }))
  }

  calculateFromTargetNet(input: InverseServiceInput): InverseCommissionResult {
    const result = calculateRequiredItemPrice({
      ...input,
      rules: this.rules,
    })
    result.outcome = this.audit(result.outcome)
    return result
  }
}

export function createCommissionService(config: CommissionServiceConfig = {}): CommissionService {
  return new CommissionService(config)
}
