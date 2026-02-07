import { calculateCommission, calculateRequiredItemPrice } from '../domain/commission'
import { defaultCommissionRules2026 } from '../domain/default-rules'
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
>

type CommissionServiceInput = Omit<CommissionInput, 'rules'>
type InverseServiceInput = Omit<InverseCommissionInput, 'rules'>

export class CommissionService {
  private readonly rules: CommissionRules

  constructor(config: CommissionServiceConfig = {}) {
    this.rules = {
      ...defaultCommissionRules2026,
      ...config,
    }
  }

  getRules(): CommissionRules {
    return this.rules
  }

  calculateFromItemPrice(input: CommissionServiceInput): CommissionResult {
    return calculateCommission({
      ...input,
      rules: this.rules,
    })
  }

  calculateFromTargetNet(input: InverseServiceInput): InverseCommissionResult {
    return calculateRequiredItemPrice({
      ...input,
      rules: this.rules,
    })
  }
}

export function createCommissionService(config: CommissionServiceConfig = {}): CommissionService {
  return new CommissionService(config)
}
