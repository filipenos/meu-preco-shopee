import { readFile } from 'node:fs/promises'
import { writeFileSync } from 'node:fs'

import { formatCurrency, formatPercent } from '../src/lib/money'
import {
  calculateDiscountFromTargetNet,
  discountFromTargetNetToCsv,
  type DiscountFromTargetNetInput,
} from '../src/services/discount-from-target-net-service'

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
  console.log('Uso: npm run helper:discount-from-net -- --input ./scripts/test-data/dados.json [--csv ./scripts/test-data/resultado.csv]')
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const inputPath = args.input

  if (!inputPath) {
    printHelp()
    process.exit(1)
  }

  const raw = await readFile(inputPath, 'utf-8')
  const input = JSON.parse(raw) as DiscountFromTargetNetInput
  const results = calculateDiscountFromTargetNet(input)

  console.log('Desconto sugerido por variação (a partir do líquido alvo)')
  for (const result of results) {
    console.log(`\n- ${result.variationName}`)
    console.log(`  preco cheio: ${formatCurrency(result.fullPrice)}`)
    console.log(`  liquido alvo: ${formatCurrency(result.targetNet)}`)
    console.log(`  desconto calculado: ${formatPercent(result.requiredDiscountPercent)}`)
    console.log(`  preco com desconto: ${formatCurrency(result.discountedPrice)}`)
    console.log(`  desconto cupom: ${formatCurrency(result.couponDiscountAmount)}`)
    console.log(`  preco final comprador: ${formatCurrency(result.finalBuyerPrice)}`)
    console.log(`  comissao: ${formatCurrency(result.commissionAmount)}`)
    console.log(`  liquido alcançado: ${formatCurrency(result.netAmount)}`)
    console.log(`  status: ${result.status}`)
  }

  if (args.csv) {
    writeFileSync(args.csv, discountFromTargetNetToCsv(results), 'utf-8')
    console.log(`\nCSV salvo em: ${args.csv}`)
  }
}

void main()
