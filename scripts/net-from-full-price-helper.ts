import { readFile } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'

import { formatCurrency, formatPercent } from '../src/lib/money'
import { calculateNetFromFullPrice, netFromFullPriceToCsv, type NetFromFullPriceInput } from '../src/services/net-from-full-price-service'

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
  console.log('Uso: npm run helper -- --input ./scripts/test-data/dados.json [--csv ./scripts/test-data/resultado.csv]')
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = args.input

  if (!inputPath) {
    printHelp()
    process.exit(1)
  }

  const raw = await readFile(inputPath, 'utf-8')
  const input = JSON.parse(raw) as NetFromFullPriceInput

  const results = calculateNetFromFullPrice(input)

  console.log('Liquido por variacao (a partir do preco cheio)')
  for (const result of results) {
    console.log(`\n- ${result.variationName}`)
    console.log(`  preco cheio: ${formatCurrency(result.fullPrice)}`)
    console.log(`  desconto: ${formatPercent(result.discountPercent)}`)
    console.log(`  preco com desconto: ${formatCurrency(result.discountedPrice)}`)
    console.log(
      `  cupom loja: ${result.couponApplied ? 'aplicado' : 'nao aplicado'} | taxa ${formatPercent(result.couponRate)}${typeof result.couponMinPrice === 'number' ? ` | minimo ${formatCurrency(result.couponMinPrice)}` : ''}${typeof result.couponMaxDiscount === 'number' ? ` | max ${formatCurrency(result.couponMaxDiscount)}` : ''}`,
    )
    console.log(`  desconto cupom: ${formatCurrency(result.couponDiscountAmount)}`)
    console.log(`  preco final comprador: ${formatCurrency(result.finalBuyerPrice)}`)
    console.log(`  comissao total: ${formatCurrency(result.commissionAmount)}`)
    console.log(`  liquido: ${formatCurrency(result.netAmount)}`)
    console.log(`  comissao efetiva: ${formatPercent(result.effectiveCommissionRate)}`)
  }

  if (args.csv) {
    writeFileSync(args.csv, netFromFullPriceToCsv(results), 'utf-8')
    console.log(`\nCSV salvo em: ${args.csv}`)
  }
}

void main()
