import { describe, expect, it, vi } from 'vitest'
import { getCommissionRules } from '../src/domain/default-rules'
import { createCommissionService } from '../src/services/commission-service'
import { toCents } from '../src/lib/money'

const base = { sellerType: 'cnpj' as const, paymentMethod: 'card_or_boleto' as const, ordersLast90Days: 0, includeCampaignExtra: false }
const calculate = (effectiveDate: string, itemPrice: number, extra = {}) => createCommissionService({ effectiveDate }).calculateFromItemPrice({ ...base, itemPrice, ...extra })

describe('dated official policies', () => {
  it.each([
    ['2026-03-01', 4, 8, 0.025], ['2026-04-22', 4, 8, 0.025],
    ['2026-04-23', 4, 8, 0.035], ['2026-09-30', 4, 8, 0.035], ['2026-10-01', 4.5, 9, 0.035],
  ])('selects fixed fee, cheap-item threshold and campaign rate for %s', (date, fee, threshold, campaign) => {
    const rules = getCommissionRules(date as string)
    expect(rules.brackets[0].fixedFee).toBe(fee)
    expect(rules.cnpjLowPriceThreshold).toBe(threshold)
    expect(rules.campaignExtraRate).toBe(campaign)
  })
  it('respects the Brazilian calendar at midnight UTC', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-01T02:59:59Z'))
      expect(createCommissionService().getRules().brackets[0].fixedFee).toBe(4)
      vi.setSystemTime(new Date('2026-10-01T03:00:00Z'))
      expect(createCommissionService().getRules().brackets[0].fixedFee).toBe(4.5)
    } finally { vi.useRealTimers() }
  })
  it.each(['2026-02-28', '2026-02-30', '2026-13-01', '18/09/2026'])('rejects unsupported/invalid date %s', (date) => {
    expect(() => getCommissionRules(date)).toThrow()
  })
  it('applies October cheap-item rule at 8, 8.99 and 9 reais', () => {
    expect(calculate('2026-09-30', 8.5).fixedFeeAmount).toBe(4)
    expect(calculate('2026-10-01', 8.5).fixedFeeAmount).toBe(4.25)
    expect(calculate('2026-10-01', 8.99).fixedFeeAmount).toBe(4.5)
    expect(calculate('2026-10-01', 9).fixedFeeAmount).toBe(4.5)
  })
  it.each([[79.99, 4], [80, 16], [99.99, 16], [100, 20], [199.99, 20], [200, 26], [499.99, 26], [500, 26]])('applies correct fixed fee at %s', (price, fee) => {
    expect(calculate('2026-09-18', price).fixedFeeAmount).toBe(fee)
  })
  it('does not charge the CPF surcharge at exactly 450 orders', () => {
    expect(calculate('2026-10-01', 20, { sellerType: 'cpf', ordersLast90Days: 450 }).cpfExtraFeeAmount).toBe(0)
    expect(calculate('2026-10-01', 20, { sellerType: 'cpf', ordersLast90Days: 451 }).cpfExtraFeeAmount).toBe(3)
  })
  it('marks undocumented assumptions rather than claiming exact compatibility', () => {
    expect(calculate('2026-09-18', 10, { sellerType: 'cpf' }).audit.warnings).toContain('cpf-low-price-unverified')
    expect(calculate('2026-09-18', 500, { paymentMethod: 'pix' }).audit.warnings).toContain('pix-rate-assumed')
    expect(calculate('2026-09-18', 500, { paymentMethod: 'pix', pixSubsidyRateOverride: 0.05 }).pixSubsidyAmount).toBe(25)
    expect(calculate('2026-09-18', 100, { paymentMethod: 'pix', includeCampaignExtra: true }).audit.warnings).toContain('campaign-pix-base-unverified')
  })
  it('protects rules from mutation through returned objects', () => {
    const service = createCommissionService({ effectiveDate: '2026-09-18' })
    service.getRules().brackets[0].fixedFee = 999
    expect(service.calculateFromItemPrice({ ...base, itemPrice: 20 }).fixedFeeAmount).toBe(4)
  })
  it('balances all ledger components in cents including half-cent campaign amounts', () => {
    for (const itemPrice of [0.01, 1.005, 7.99, 8.01, 10.02, 79.99, 80, 100, 199.99, 500.01]) {
      const r = calculate('2026-09-18', itemPrice, { paymentMethod: 'pix', includeCampaignExtra: true })
      expect(toCents(r.itemPrice) - toCents(r.pixSubsidyAmount)).toBe(toCents(r.itemInvoicePrice))
      expect(toCents(r.percentageAmount) + toCents(r.fixedFeeAmount) + toCents(r.cpfExtraFeeAmount)).toBe(toCents(r.baseCommissionAmount))
      expect(toCents(r.commissionAmount) + toCents(r.campaignExtraAmount)).toBe(toCents(r.totalCommissionAmount))
      expect(toCents(r.itemInvoicePrice) - toCents(r.totalCommissionAmount)).toBe(toCents(r.netAmount))
    }
  })
})
