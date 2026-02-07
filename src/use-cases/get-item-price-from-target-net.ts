import { calculateRequiredItemPrice } from '../domain/commission'
import type { InverseCommissionInput, InverseCommissionResult } from '../domain/types'

export function getItemPriceFromTargetNet(input: InverseCommissionInput): InverseCommissionResult {
  return calculateRequiredItemPrice(input)
}
