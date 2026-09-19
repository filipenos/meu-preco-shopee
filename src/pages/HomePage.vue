<script setup lang="ts">
import { useCalculation } from '../composables/use-calculation'
import CalculationNotice from '../components/CalculationNotice.vue'
import { computed, reactive, ref } from 'vue'
import { inject } from '@vercel/analytics'

import { getCommissionRules, todayInBrazil } from '../domain/default-rules'
import type { CommissionRules, PaymentMethod, SellerType } from '../domain/types'
import { normalizePercentInput } from '../lib/discount'
import { formatCurrency, formatPercent } from '../lib/money'
import { getCommissionFromItemPrice } from '../use-cases/get-commission-from-item-price'
import { calculateTargetSalePrice } from '../services/target-sale-price-service'
import { compareLowerPrices } from '../services/lower-price-service'
import { calculateFullPriceFromTargetNet } from '../services/full-price-from-target-net-service'

inject()

const effectiveDate = todayInBrazil()
const policyRules = getCommissionRules(effectiveDate)

const rulesConfig = reactive({
  campaignExtraRatePercent: Number((policyRules.campaignExtraRate * 100).toFixed(4)),
  cpfExtraFee: 3,
  cpfExtraOrdersThreshold90d: 450,
  cnpjLowPriceThreshold: policyRules.cnpjLowPriceThreshold,
  cpfLowPriceThreshold: 12,
})

const defaultRulesConfig = {
  campaignExtraRatePercent: Number((policyRules.campaignExtraRate * 100).toFixed(4)),
  cpfExtraFee: 3,
  cpfExtraOrdersThreshold90d: 450,
  cnpjLowPriceThreshold: policyRules.cnpjLowPriceThreshold,
  cpfLowPriceThreshold: 12,
}

const calculationMode = ref<'price' | 'target' | 'sale'>('price')
const targetNet = ref(70)
const saleForm = reactive({ targetPrice: 14.9, discountPercent: 20, couponTreatment: 'compensate' as 'compensate' | 'absorb' })

const caseOneForm = reactive({
  itemPrice: 500,
  sellerType: 'cnpj' as SellerType,
  paymentMethod: 'card_or_boleto' as PaymentMethod,
  ordersLast90Days: 0,
  includeCampaignExtra: false,
  includeStoreCoupon: false,
})

const storeCouponConfig = reactive({
  minPrice: 30,
  ratePercent: 3,
  maxDiscount: 3,
})

function formatBracketRange(min: number, max: number | null): string {
  return max === null
    ? `A partir de ${formatCurrency(min)}`
    : `${formatCurrency(min)} até ${formatCurrency(max)}`
}

const cnpjRuleCards = computed(() => {
  return activeRules.value.brackets.map((bracket) => ({
    min: bracket.min,
    max: bracket.max,
    rangeLabel: formatBracketRange(bracket.min, bracket.max),
    commissionLabel: `${formatPercent(bracket.percentageRate)} + ${formatCurrency(bracket.fixedFee)}`,
    pixLabel: bracket.pixSubsidyRate === 0 ? '-' : `${bracket.pixSubsidyRate === 0.08 ? 'Até ' : ''}${formatPercent(bracket.pixSubsidyRate)}`,
  }))
})

const cpfRuleCards = computed(() => {
  return activeRules.value.brackets.map((bracket) => ({
    min: bracket.min,
    max: bracket.max,
    rangeLabel: formatBracketRange(bracket.min, bracket.max),
    commissionLabel: `${formatPercent(bracket.percentageRate)} + ${formatCurrency(bracket.fixedFee)} + ${cpfExtraFeeLabel.value}`,
    pixLabel: bracket.pixSubsidyRate === 0 ? '-' : `${bracket.pixSubsidyRate === 0.08 ? 'Até ' : ''}${formatPercent(bracket.pixSubsidyRate)}`,
  }))
})

const activeRules = computed<CommissionRules>(() => ({
  ...policyRules,
  campaignExtraRate: rulesConfig.campaignExtraRatePercent / 100,
  cpfExtraFee: rulesConfig.cpfExtraFee,
  cpfExtraOrdersThreshold90d: rulesConfig.cpfExtraOrdersThreshold90d,
  cnpjLowPriceThreshold: rulesConfig.cnpjLowPriceThreshold,
  cpfLowPriceThreshold: rulesConfig.cpfLowPriceThreshold,
}))

const serviceRulesConfig = computed(() => ({
  effectiveDate,
  campaignExtraRate: rulesConfig.campaignExtraRatePercent / 100,
  cpfExtraFee: rulesConfig.cpfExtraFee,
  cpfExtraOrdersThreshold90d: rulesConfig.cpfExtraOrdersThreshold90d,
  cnpjLowPriceThreshold: rulesConfig.cnpjLowPriceThreshold,
  cpfLowPriceThreshold: rulesConfig.cpfLowPriceThreshold,
}))

function buildStoreCoupon(enabled: boolean): { minPrice: number; rate: number; maxDiscount: number } | undefined {
  if (!enabled) {
    return undefined
  }

  return {
    minPrice: storeCouponConfig.minPrice,
    rate: normalizePercentInput(storeCouponConfig.ratePercent),
    maxDiscount: storeCouponConfig.maxDiscount,
  }
}

const { result: calculation, error: calculationError } = useCalculation(() => {
  const context = {
    sellerType: caseOneForm.sellerType,
    paymentMethod: caseOneForm.paymentMethod,
    ordersLast90Days: caseOneForm.ordersLast90Days,
    includeCampaignExtra: caseOneForm.includeCampaignExtra,
    storeCoupon: buildStoreCoupon(caseOneForm.includeStoreCoupon),
  }
  if (calculationMode.value === 'sale') {
    return calculateTargetSalePrice({
      targetPrice: saleForm.targetPrice,
      discountPercent: normalizePercentInput(saleForm.discountPercent),
      couponTreatment: saleForm.couponTreatment, context, rulesConfig: serviceRulesConfig.value,
    })
  }
  if (calculationMode.value === 'target') {
    const [result] = calculateFullPriceFromTargetNet({
      context,
      items: [{ variationName: 'item', discountPercent: normalizePercentInput(saleForm.discountPercent), targetNet: targetNet.value }],
      couponTreatment: saleForm.couponTreatment,
      rulesConfig: serviceRulesConfig.value,
    })
    if (result.status === 'target-too-low') throw new Error('Informe um valor líquido maior que zero.')
    if (result.status === 'target-too-high') throw new Error('Não foi possível atingir esse líquido no limite de preço da calculadora.')
    return { current: result, fullPrice: result.requiredFullPrice, suggestion: null }
  }
  return {
    ...compareLowerPrices({ fullPrice: caseOneForm.itemPrice, context, rulesConfig: serviceRulesConfig.value }),
    fullPrice: caseOneForm.itemPrice,
  }
})

const caseOneResult = computed(() => calculation.value?.current)
const lowerPriceSuggestion = computed(() => calculation.value?.suggestion)

const caseOneCommissionBreakdown = computed(() =>
  caseOneResult.value ? getCommissionFromItemPrice({
    itemPrice: caseOneResult.value.finalBuyerPrice,
    sellerType: caseOneForm.sellerType,
    paymentMethod: caseOneForm.paymentMethod,
    ordersLast90Days: caseOneForm.ordersLast90Days,
    includeCampaignExtra: caseOneForm.includeCampaignExtra,
    rules: activeRules.value,
  }) : null,
)

const appliedBracketLabel = computed(() => {
  const price = caseOneResult.value?.finalBuyerPrice
  if (price === undefined) return 'Não identificada'
  const bracket = activeRules.value.brackets.find((item) => isPriceInBracket(price, item.min, item.max))

  return bracket ? formatBracketRange(bracket.min, bracket.max) : 'Não identificada'
})

const campaignRateLabel = computed(() => formatPercent(rulesConfig.campaignExtraRatePercent / 100))
const cpfExtraFeeLabel = computed(() => formatCurrency(rulesConfig.cpfExtraFee))
const cpfOrdersThresholdLabel = computed(() => rulesConfig.cpfExtraOrdersThreshold90d.toLocaleString('pt-BR'))
const cnpjLowPriceThresholdLabel = computed(() => formatCurrency(rulesConfig.cnpjLowPriceThreshold))
const cpfLowPriceThresholdLabel = computed(() => formatCurrency(rulesConfig.cpfLowPriceThreshold))
const storeCouponRateLabel = computed(() => formatPercent(normalizePercentInput(storeCouponConfig.ratePercent)))

function sellerLabel(value: SellerType): string {
  return value === 'cnpj' ? 'CNPJ' : 'CPF'
}

function paymentLabel(value: PaymentMethod): string {
  return value === 'pix' ? 'Pix' : 'Cartão ou Boleto'
}

function effectiveRateLabel(totalCommissionAmount: number, itemPrice: number): string {
  if (itemPrice <= 0) {
    return formatPercent(0)
  }

  return formatPercent(totalCommissionAmount / itemPrice)
}

function isPriceInBracket(price: number, min: number, max: number | null): boolean {
  if (price < min) {
    return false
  }

  return max === null ? true : price <= max
}

function resetRulesConfig(): void {
  rulesConfig.campaignExtraRatePercent = defaultRulesConfig.campaignExtraRatePercent
  rulesConfig.cpfExtraFee = defaultRulesConfig.cpfExtraFee
  rulesConfig.cpfExtraOrdersThreshold90d = defaultRulesConfig.cpfExtraOrdersThreshold90d
  rulesConfig.cnpjLowPriceThreshold = defaultRulesConfig.cnpjLowPriceThreshold
  rulesConfig.cpfLowPriceThreshold = defaultRulesConfig.cpfLowPriceThreshold
}
</script>

<template>
  <main class="page-shell min-h-screen">
    <section class="hero">
      <p class="eyebrow">Meu Preço Shopee</p>
      <h1>Meu Preço Shopee</h1>
      <p>
        Simulador de comissão Shopee 2026 para vendedores CPF e CNPJ, com cálculo por faixa, subsídio Pix e
        cenários de preço/líquido.
      </p>
      <p>
        Referências oficiais:
        <a
          href="https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026"
          target="_blank"
          rel="noreferrer"
        >
          Confira como funcionará a nova política de comissão para vendedores CNPJ e CPF em 2026
        </a>
      </p>
    </section>
    <p v-if="calculationError" role="alert" class="card full">{{ calculationError }}</p>
    <CalculationNotice :audit="caseOneResult?.audit" />

    <section class="grid-two grid-main">
      <article class="card">
        <h2>{{ calculationMode !== 'price' ? 'Calcular preço de cadastro' : 'Calcular quanto vou receber' }}</h2>
        <div class="mode-tabs" role="group" aria-label="Modo de cálculo">
          <button type="button" :aria-pressed="calculationMode === 'price'" @click="calculationMode = 'price'">Tenho um preço</button>
          <button type="button" :aria-pressed="calculationMode === 'target'" @click="calculationMode = 'target'">Quero receber líquido</button>
          <button type="button" :aria-pressed="calculationMode === 'sale'" @click="calculationMode = 'sale'">Quero vender por um valor</button>
        </div>
        <p class="card-subtitle">
          {{ calculationMode === 'sale' ? 'Calcule o preço de cadastro para vender pelo valor desejado com promoção e cupom.'
            : calculationMode === 'target' ? 'Encontre o menor preço de cadastro para receber o líquido desejado.'
            : 'Informe o preço para calcular taxas e quanto você recebe.' }}
        </p>

        <div class="form-grid">
          <label v-if="calculationMode === 'target'">
            Quanto quero receber líquido (R$)
            <input v-model.number="targetNet" type="number" min="0.01" max="100000000" step="0.01" />
            <small>Por item, após os descontos da Shopee e antes do custo do produto.</small>
          </label>
          <label v-else-if="calculationMode === 'sale'">
            Quero vender por (R$)
            <input v-model.number="saleForm.targetPrice" type="number" min="0.01" max="100000000" step="0.01" />
          </label>
          <label v-else>
            Valor do produto
            <input v-model.number="caseOneForm.itemPrice" type="number" min="0" step="0.01" />
          </label>

          <label>
            Tipo de vendedor
            <select v-model="caseOneForm.sellerType">
              <option value="cnpj">CNPJ</option>
              <option value="cpf">CPF</option>
            </select>
          </label>

          <label>
            Meio de pagamento
            <select v-model="caseOneForm.paymentMethod">
              <option value="card_or_boleto">Cartão/Boleto</option>
              <option value="pix">Pix</option>
            </select>
          </label>

          <label v-if="caseOneForm.sellerType === 'cpf'">
            Pedidos em 90 dias
            <input v-model.number="caseOneForm.ordersLast90Days" type="number" min="0" step="1" />
          </label>
        </div>

        <div v-if="calculationMode !== 'price'" class="form-grid">
          <label>
            Desconto da promoção (%)
            <input v-model.number="saleForm.discountPercent" type="number" min="0" max="100" step="0.01" />
            <small>Aplicado ao preço de cadastro antes do cupom da loja.</small>
          </label>
          <label v-if="caseOneForm.includeStoreCoupon">
            Como tratar o cupom?
            <select v-model="saleForm.couponTreatment">
              <option value="compensate">Compensar no preço de cadastro</option>
              <option value="absorb">Absorver o cupom</option>
            </select>
            <small>{{ calculationMode === 'target'
              ? (saleForm.couponTreatment === 'compensate' ? 'A meta de líquido considera o cupom aplicado.' : 'A meta é calculada antes do cupom. O líquido final pode ficar abaixo dela.')
              : (saleForm.couponTreatment === 'compensate' ? 'O preço desejado é o que o comprador paga após o cupom.' : 'O cupom reduz o preço desejado e o seu líquido.') }}</small>
          </label>
        </div>

        <label class="inline-check">
          <input v-model="caseOneForm.includeCampaignExtra" type="checkbox" />
          Aplicar Campanha de Destaque Shopee ({{ campaignRateLabel }})
        </label>

        <label class="inline-check">
          <input v-model="caseOneForm.includeStoreCoupon" type="checkbox" />
          Aplicar cupom da loja
        </label>

        <div v-if="caseOneForm.includeStoreCoupon" class="form-grid">
          <label>
            Cupom (%)
            <input v-model.number="storeCouponConfig.ratePercent" type="number" min="0" max="100" step="0.01" />
          </label>
          <label>
            Mínimo para cupom (R$)
            <input v-model.number="storeCouponConfig.minPrice" type="number" min="0" step="0.01" />
          </label>
          <label>
            Teto desconto cupom (R$)
            <input v-model.number="storeCouponConfig.maxDiscount" type="number" min="0" step="0.01" />
          </label>
        </div>

        <section v-if="calculationMode === 'target' && calculation && caseOneResult" class="price-suggestion" aria-labelledby="target-result-title">
          <h3 id="target-result-title">Preço para cadastrar: {{ formatCurrency(calculation.fullPrice) }}</h3>
          <p>
            Para a meta de {{ formatCurrency(targetNet) }}{{ caseOneForm.includeStoreCoupon && saleForm.couponTreatment === 'absorb' ? ' antes do cupom' : ' líquidos' }}, cadastre por
            <strong>{{ formatCurrency(calculation.fullPrice) }}</strong>.
            Líquido estimado: <strong>{{ formatCurrency(caseOneResult.netAmount) }}</strong> por item.
          </p>
          <p class="metric-note">Menor preço que atinge sua meta {{ caseOneForm.includeStoreCoupon && saleForm.couponTreatment === 'absorb' ? 'antes do cupom' : 'após os descontos' }}, considerando os centavos e as mudanças de faixa.</p>
          <p v-if="caseOneForm.includeStoreCoupon && saleForm.couponTreatment === 'absorb'">Você absorve o cupom. O líquido após sua aplicação é {{ formatCurrency(caseOneResult.netAmount) }}, com as taxas recalculadas.</p>
        </section>

        <section v-if="calculationMode === 'sale' && calculation && caseOneResult" class="price-suggestion">
          <h3>Preço para cadastrar: {{ formatCurrency(calculation.fullPrice) }}</h3>
          <p>Após a promoção: {{ formatCurrency(caseOneResult.discountedPrice) }}. Após o cupom: <strong>{{ formatCurrency(caseOneResult.finalBuyerPrice) }}</strong>.</p>
          <p v-if="'exact' in calculation && !calculation.exact">A meta exata não é representável com esses descontos. Mostramos o menor preço que atinge ou supera a meta.</p>
          <p v-if="caseOneForm.includeStoreCoupon && !caseOneResult.couponApplied">O cupom não gerou desconto neste preço; confira o mínimo e o teto configurados.</p>
        </section>

        <div v-if="caseOneResult && caseOneCommissionBreakdown" class="result-grid">
          <div>
            <span>Preço de cadastro</span>
            <strong>{{ formatCurrency(calculation!.fullPrice) }}</strong>
          </div>
          <div v-if="calculationMode !== 'price'">
            <span>Desconto da promoção</span>
            <strong>{{ formatCurrency(calculation!.fullPrice - caseOneResult.discountedPrice) }}</strong>
          </div>
          <div v-if="calculationMode !== 'price'">
            <span>Preço após promoção</span>
            <strong>{{ formatCurrency(caseOneResult.discountedPrice) }}</strong>
          </div>
          <div>
            <span>Desconto cupom</span>
            <strong>{{ formatCurrency(caseOneResult.couponDiscountAmount) }}</strong>
          </div>
          <div>
            <span>Preço final comprador</span>
            <strong>{{ formatCurrency(caseOneResult.finalBuyerPrice) }}</strong>
          </div>
          <div>
            <span>Comissão total</span>
            <strong>{{ formatCurrency(caseOneResult.commissionAmount) }}</strong>
            <em class="metric-note">
              Efetivo: {{ effectiveRateLabel(caseOneResult.commissionAmount, caseOneResult.finalBuyerPrice) }}
            </em>
          </div>
          <div>
            <span>Valor líquido</span>
            <strong>{{ formatCurrency(caseOneResult.netAmount) }}</strong>
          </div>
        </div>

        <section v-if="lowerPriceSuggestion && caseOneResult" class="price-suggestion" aria-labelledby="price-suggestion-title">
          <h3 id="price-suggestion-title">Você pode receber mais vendendo por menos</h3>
          <p>
            Por <strong>{{ formatCurrency(lowerPriceSuggestion.suggestedPrice) }}</strong>,
            você recebe <strong>{{ formatCurrency(lowerPriceSuggestion.outcome.netAmount) }}</strong> líquidos.
            No preço atual, recebe {{ formatCurrency(caseOneResult.netAmount) }}.
          </p>
          <p>
            Reduzindo {{ formatCurrency(lowerPriceSuggestion.priceReduction) }} no preço,
            você recebe <strong>{{ formatCurrency(lowerPriceSuggestion.netGain) }} a mais por item</strong>.
          </p>
          <p class="metric-note">
            Comparação com as mesmas configurações, recalculando cupom, taxas e faixa.
            Valores estimados conforme as regras e ressalvas desta simulação.
          </p>
          <p v-if="calculationMode === 'sale'">
            Alternativa à sua meta: cadastro de {{ formatCurrency(lowerPriceSuggestion.suggestedPrice) }},
            preço final de {{ formatCurrency(lowerPriceSuggestion.outcome.finalBuyerPrice) }}.
            Sua meta permanece inalterada.
          </p>
          <CalculationNotice :audit="lowerPriceSuggestion.outcome.audit" />
          <button v-if="calculationMode === 'price'" type="button" @click="caseOneForm.itemPrice = lowerPriceSuggestion.suggestedPrice">
            Usar preço de {{ formatCurrency(lowerPriceSuggestion.suggestedPrice) }}
          </button>
        </section>

        <ul v-if="caseOneResult && caseOneCommissionBreakdown" class="explain-list">
          <li>{{ sellerLabel(caseOneForm.sellerType) }} • {{ paymentLabel(caseOneForm.paymentMethod) }}</li>
          <li>Faixa aplicada: {{ appliedBracketLabel }}</li>
          <li>
            Cupom loja:
            {{
              caseOneForm.includeStoreCoupon
                ? `ativo (${storeCouponRateLabel})`
                : 'desativado'
            }}
          </li>
          <li>Subsídio Pix aplicado: {{ formatCurrency(caseOneCommissionBreakdown.pixSubsidyAmount) }}</li>
          <li>Comissão base: {{ formatCurrency(caseOneCommissionBreakdown.baseCommissionAmount) }}</li>
          <li>Comissão final: {{ formatCurrency(caseOneResult.commissionAmount) }}</li>
        </ul>
      </article>

      <article class="card">
        <h2>Tabela base de faixas</h2>
        <p class="card-subtitle">Mostra as faixas conforme o tipo de vendedor selecionado no cálculo.</p>

        <div v-if="caseOneForm.sellerType === 'cnpj'" class="rates-section">
          <h3>Faixas CNPJ</h3>
          <div class="rates-stack">
            <div
              v-for="item in cnpjRuleCards"
              :key="`cnpj-${item.rangeLabel}`"
              :class="['rate-item', 'large', { 'rate-item-active': isPriceInBracket(caseOneResult?.finalBuyerPrice ?? -1, item.min, item.max) }]"
            >
              <h4>{{ item.rangeLabel }}</h4>
              <p>Comissão: {{ item.commissionLabel }}</p>
              <p>Subsídio Pix: {{ item.pixLabel }}</p>
            </div>
          </div>
        </div>

        <div v-else class="rates-section">
          <h3>Faixas CPF</h3>
          <p class="rates-note">
            Tabela com adicional CPF de {{ cpfExtraFeeLabel }}. Esse adicional entra quando passar de
            {{ cpfOrdersThresholdLabel }} pedidos em 90 dias.
          </p>
          <div class="rates-stack">
            <div
              v-for="item in cpfRuleCards"
              :key="`cpf-${item.rangeLabel}`"
              :class="['rate-item', 'large', { 'rate-item-active': isPriceInBracket(caseOneResult?.finalBuyerPrice ?? -1, item.min, item.max) }]"
            >
              <h4>{{ item.rangeLabel }}</h4>
              <p>Comissão: {{ item.commissionLabel }}</p>
              <p>Subsídio Pix: {{ item.pixLabel }}</p>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="card full">
      <h2>Configurações das regras</h2>
      <p class="card-subtitle">
        Área avançada. Os valores iniciais seguem a política aplicável à data do cálculo.
      </p>

      <details class="advanced-box">
        <summary>Editar parâmetros avançados</summary>

        <div class="form-grid compact">
          <label>
            Campanha de Destaque Shopee (%)
            <input v-model.number="rulesConfig.campaignExtraRatePercent" type="number" min="0" step="0.1" />
            <small>Aplicado somente quando “Campanha de Destaque Shopee” estiver marcada no cálculo.</small>
            <small>
              Campo usado na Campanha de Destaque Shopee e refletido automaticamente nos blocos acima.
            </small>
          </label>

          <label>
            Adicional CPF (R$)
            <input v-model.number="rulesConfig.cpfExtraFee" type="number" min="0" step="0.01" />
            <small>
              Taxa extra por item para CPF acima de {{ cpfOrdersThresholdLabel }} pedidos em 90 dias.
            </small>
          </label>

          <label>
            Limite pedidos CPF (90 dias)
            <input v-model.number="rulesConfig.cpfExtraOrdersThreshold90d" type="number" min="0" step="1" />
            <small>
              Com mais de {{ cpfOrdersThresholdLabel }} pedidos em 90 dias, aplica adicional de {{ cpfExtraFeeLabel }}.
            </small>
          </label>

          <label>
            Limite item barato CNPJ (R$)
            <input v-model.number="rulesConfig.cnpjLowPriceThreshold" type="number" min="0" step="0.01" />
            <small>
              Abaixo de {{ cnpjLowPriceThresholdLabel }}, taxa fixa vira metade do preço do item.
            </small>
          </label>

          <label>
            Limite item barato CPF (R$)
            <input v-model.number="rulesConfig.cpfLowPriceThreshold" type="number" min="0" step="0.01" />
            <small>
              Abaixo de {{ cpfLowPriceThresholdLabel }}, aplica taxa regressiva de item.
            </small>
          </label>
        </div>

        <div class="advanced-actions">
          <button type="button" @click="resetRulesConfig">Restaurar padrão oficial</button>
        </div>
      </details>
    </section>

    <section class="card full">
      <h2>Regras e observações</h2>
      <p class="card-subtitle">Resumo das regras consultadas em 18/09/2026; parâmetros selecionados acima.</p>

      <div class="notice-grid">
        <article>
          <h3>Operação e cobrança</h3>
          <ul>
            <li>
              CNPJ com item abaixo de {{ cnpjLowPriceThresholdLabel }} usa taxa fixa de metade do preço do item.
            </li>
            <li>
              CPF com item abaixo de {{ cpfLowPriceThresholdLabel }} usa taxa regressiva de item (modelo interpolado).
            </li>
            <li>Sem comissão em cancelamento ou devolução integral; compensações recebidas em disputas podem ter comissão.</li>
            <li>Campanha de Destaque Shopee adiciona {{ campaignRateLabel }} sobre todas as vendas da loja durante a participação na campanha.</li>
            <li>Campanha: 3,5% desde 23/04/2026. Em 01/10/2026, taxa fixa inicial passa para R$ 4,50 e limite CNPJ para R$ 9.</li>
            <li>Subsídio Pix não é repasse extra ao vendedor; é regra de precificação/comissão no pagamento por Pix.</li>
          </ul>
        </article>

        <article>
          <h3>CPF e documentação</h3>
          <ul>
            <li>
              Com mais de {{ cpfOrdersThresholdLabel }} pedidos em 90 dias, adiciona {{ cpfExtraFeeLabel }} por item.
            </li>
            <li>
              Com até {{ cpfOrdersThresholdLabel }} pedidos em 90 dias, não adiciona {{ cpfExtraFeeLabel }}.
            </li>
            <li>
              Loja com faturamento anual igual ou superior a R$81 mil deve emitir nota fiscal e operar com CNPJ.
            </li>
            <li>
              Ao migrar de CPF para CNPJ, o adicional de CPF deixa de ser aplicado em até 7 dias úteis.
            </li>
          </ul>
        </article>

        <article>
          <h3>Frete e logística</h3>
          <ul>
            <li>Logística do vendedor (Intelipost/API): coparticipação de 25% do cupom de frete utilizado, limitada a R$ 10 por pedido.</li>
            <li>Subsídio de frete: até R$20 (itens até R$79,99), até R$30 (R$80 a R$199,99), até R$40 (acima de R$200).</li>
            <li>Também há cupons de 50% de desconto no frete para compras acima de R$10.</li>
            <li>Vendedores com Intelipost/API de frete possuem política logística específica a partir de março/2026.</li>
          </ul>
        </article>
      </div>
    </section>
  </main>
</template>
