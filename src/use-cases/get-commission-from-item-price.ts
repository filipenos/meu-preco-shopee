import { calculateCommission } from '../domain/commission'
import type { CommissionInput, CommissionResult } from '../domain/types'

export function getCommissionFromItemPrice(input: CommissionInput): CommissionResult {
  return calculateCommission(input)
}
