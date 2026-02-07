import { createCommissionService } from '../src/services/commission-service'
import { formatCurrency, formatPercent } from '../src/lib/money'
import type { PaymentMethod, SellerType } from '../src/domain/types'

type Mode = 'from-price' | 'from-net'

type ArgsMap = Record<string, string>

function parseArgs(argv: string[]): ArgsMap {
  const args: ArgsMap = {}

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) {
      continue
    }

    const key = arg.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = 'true'
      continue
    }

    args[key] = next
    i += 1
  }

  return args
}

function toNumber(value: string | undefined, fallback = 0): number {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) {
    return fallback
  }

  if (value === '1' || value.toLowerCase() === 'true') {
    return true
  }

  if (value === '0' || value.toLowerCase() === 'false') {
    return false
  }

  return fallback
}

function toSeller(value: string | undefined): SellerType {
  return value === 'cpf' ? 'cpf' : 'cnpj'
}

function toPayment(value: string | undefined): PaymentMethod {
  return value === 'pix' ? 'pix' : 'card_or_boleto'
}

function printHelp(): void {
  console.log('Uso:')
  console.log('  npm run helper -- from-price --price 500 --seller cnpj --payment pix --orders 0 --campaign false')
  console.log('  npm run helper -- from-net --net 404 --seller cnpj --payment card_or_boleto --orders 0 --campaign false')
  console.log('Parâmetros opcionais de regra:')
  console.log('  --campaign-rate 0.025 --cpf-extra-fee 3 --cpf-threshold 450 --cnpj-low 8 --cpf-low 12')
}

function main(): void {
  const [, , rawMode, ...rest] = process.argv
  const mode = rawMode as Mode | undefined

  if (!mode || (mode !== 'from-price' && mode !== 'from-net')) {
    printHelp()
    process.exit(1)
  }

  const args = parseArgs(rest)

  const service = createCommissionService({
    campaignExtraRate: toNumber(args['campaign-rate'], 0.025),
    cpfExtraFee: toNumber(args['cpf-extra-fee'], 3),
    cpfExtraOrdersThreshold90d: toNumber(args['cpf-threshold'], 450),
    cnpjLowPriceThreshold: toNumber(args['cnpj-low'], 8),
    cpfLowPriceThreshold: toNumber(args['cpf-low'], 12),
  })

  const sellerType = toSeller(args.seller)
  const paymentMethod = toPayment(args.payment)
  const ordersLast90Days = toNumber(args.orders, 0)
  const includeCampaignExtra = toBoolean(args.campaign, false)

  if (mode === 'from-price') {
    const result = service.calculateFromItemPrice({
      itemPrice: toNumber(args.price, 0),
      sellerType,
      paymentMethod,
      ordersLast90Days,
      includeCampaignExtra,
    })

    console.log('Resultado (from-price)')
    console.log(`- Comissão total: ${formatCurrency(result.totalCommissionAmount)}`)
    console.log(`- Percentual efetivo: ${formatPercent(result.totalCommissionAmount / (result.itemPrice || 1))}`)
    console.log(`- Valor líquido: ${formatCurrency(result.netAmount)}`)
    console.log(`- Subsídio Pix: ${formatCurrency(result.pixSubsidyAmount)}`)
    return
  }

  const result = service.calculateFromTargetNet({
    targetNetAmount: toNumber(args.net, 0),
    sellerType,
    paymentMethod,
    ordersLast90Days,
    includeCampaignExtra,
  })

  console.log('Resultado (from-net)')
  console.log(`- Preço sugerido: ${formatCurrency(result.suggestedItemPrice)}`)
  console.log(`- Comissão total: ${formatCurrency(result.outcome.totalCommissionAmount)}`)
  console.log(`- Valor líquido alcançado: ${formatCurrency(result.outcome.netAmount)}`)
}

main()
