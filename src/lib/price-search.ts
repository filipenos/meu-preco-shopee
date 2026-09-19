// Search every fee interval: net proceeds can fall at bracket/coupon boundaries.
// The bound uses the highest item price and the lowest base/campaign fees in each interval, so
// one-cent dips caused by rounding cannot hide an earlier valid price.
export interface PriceEvaluation {
  grossCents: number
  baseFeesCents: number
  netCents: number
}

export function firstInteger(low: number, high: number, predicate: (value: number) => boolean): number {
  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (predicate(mid)) high = mid
    else low = mid + 1
  }
  return low
}

export function findFirstPrice(
  low: number,
  high: number,
  boundaries: number[],
  targetCents: number,
  evaluate: (price: number) => PriceEvaluation,
): number | undefined {
  const starts = [...new Set([low, ...boundaries.filter((value) => value > low && value <= high)])].sort((a, b) => a - b)
  const cache = new Map<number, PriceEvaluation>()
  const at = (value: number) => {
    let result = cache.get(value)
    if (!result) { result = evaluate(value); cache.set(value, result) }
    return result
  }
  const search = (left: number, right: number): number | undefined => {
    const first = at(left)
    if (first.netCents >= targetCents) return left
    const last = at(right)
    // Each interval has an affine unrounded net function in buyer price.
    // Six cents conservatively cover endpoint/component rounding errors.
    const upperBound = Math.min(last.grossCents - first.baseFeesCents, Math.max(first.netCents, last.netCents) + 6)
    if (left === right || upperBound < targetCents) return undefined
    const mid = Math.floor((left + right) / 2)
    return search(left, mid) ?? search(mid + 1, right)
  }
  for (let index = 0; index < starts.length; index += 1) {
    const found = search(starts[index], (starts[index + 1] ?? high + 1) - 1)
    if (found !== undefined) return found
  }
  return undefined
}
