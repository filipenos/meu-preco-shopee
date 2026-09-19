import { rateUnits } from './money'

// UI fields use percent points: 1 means 1%, while service rates use 0.01.
export function normalizePercentInput(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value)) / 100
}

export function validateRate(value: number): number {
  rateUnits(value)
  return value
}
