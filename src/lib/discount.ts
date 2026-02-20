export function normalizePercentInput(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  const percent = value > 1 ? value / 100 : value
  if (percent < 0) {
    return 0
  }
  if (percent > 1) {
    return 1
  }

  return percent
}
