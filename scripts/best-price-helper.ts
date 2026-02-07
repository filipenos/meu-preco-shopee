import { writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

import { formatCurrency, formatPercent } from '../src/lib/money'
import {
  calculateVariationPricingPlan,
  toCsv,
  type VariationPricingPlanInput,
} from '../src/services/variation-pricing-service'

type Args = Record<string, string>

function parseArgs(argv: string[]): Args {
  const args: Args = {}

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) continue

    const key = token.slice(2)
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

function printHelp(): void {
  console.log('Uso: npm run helper:best-price -- --input ./scripts/sample-best-price-input.json [--csv ./saida.csv]')
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = args.input

  if (!inputPath) {
    printHelp()
    process.exit(1)
  }

  const raw = await readFile(inputPath, 'utf-8')
  const input = JSON.parse(raw) as VariationPricingPlanInput
  const results = calculateVariationPricingPlan(input)

  console.log('Plano de preço cheio por variação')
  for (const result of results) {
    console.log(`\n- ${result.variationName}`)
    console.log(`  alvo líquido: ${formatCurrency(result.targetNet)}`)
    console.log(`  preço venda necessário (por): ${formatCurrency(result.sellingPriceNeeded)}`)
    console.log(
      `  cupom loja: ${formatPercent(result.couponRate)}${typeof result.couponMaxDiscount === 'number' ? ` (máximo ${formatCurrency(result.couponMaxDiscount)})` : ''}`,
    )
    console.log(`  desconto cupom aplicado: ${formatCurrency(result.couponDiscountAmount)}`)
    console.log(`  preço pago pelo comprador (após cupom): ${formatCurrency(result.buyerPriceAfterCoupon)}`)
    console.log(`  desconto desejado: ${formatPercent(result.desiredDiscountRate)}`)
    console.log(`  preço cheio para desconto desejado: ${formatCurrency(result.fullPriceForDesiredDiscount)}`)
    console.log(`  sugestão desconto: ${formatPercent(result.suggestedDiscountRate)}`)
    console.log(`  sugestão preço cheio: ${formatCurrency(result.suggestedFullPrice)}`)
    if (typeof result.marginAmount === 'number' && typeof result.marginRateOnCost === 'number') {
      console.log(`  margem sobre custo: ${formatCurrency(result.marginAmount)} (${formatPercent(result.marginRateOnCost)})`)
    } else {
      console.log('  margem sobre custo: não calculada (cost não informado)')
    }
  }

  if (args.csv) {
    writeFileSync(args.csv, toCsv(results), 'utf-8')
    console.log(`\nCSV salvo em: ${args.csv}`)
  }
}

void main()
