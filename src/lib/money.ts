const RATE_SCALE = 1_000_000

export function assertFiniteNumber(value: number, name: string, min = 0, max = Number.MAX_SAFE_INTEGER): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} deve ser um número entre ${min} e ${max}`)
  }
}

// Decimal input is converted before arithmetic to avoid binary floating-point ties.
export function toCents(value: number): number {
  assertFiniteNumber(value, 'Valor monetário', -100_000_000, 100_000_000)
  const negative = value < 0
  const [coefficient, exponentText = '0'] = Math.abs(value).toString().toLowerCase().split('e')
  const [whole, fraction = ''] = coefficient.split('.')
  const digits = BigInt(whole + fraction)
  const shift = Number(exponentText) - fraction.length + 2
  const divisor = 10n ** BigInt(Math.max(0, -shift))
  const cents = shift >= 0 ? digits * 10n ** BigInt(shift) : (digits + divisor / 2n) / divisor
  return Number(negative ? -cents : cents)
}

export function fromCents(value: number): number {
  if (!Number.isSafeInteger(value)) throw new Error('Centavos devem ser inteiros seguros')
  return value / 100
}

export function roundMoney(value: number): number {
  return fromCents(toCents(value))
}

export function rateUnits(rate: number): number {
  assertFiniteNumber(rate, 'Taxa (fração de 0 a 1)', 0, 1)
  const units = Math.round(rate * RATE_SCALE)
  if (Math.abs(units / RATE_SCALE - rate) > 1e-12) {
    throw new Error('Taxa deve ter no máximo seis casas decimais')
  }
  return units
}

export function multiplyRate(cents: number, rate: number): number {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Base deve ser centavos não negativos')
  return Number((BigInt(cents) * BigInt(rateUnits(rate)) + 500_000n) / 1_000_000n)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 }).format(value)
}
