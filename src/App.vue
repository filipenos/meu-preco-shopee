<script setup lang="ts">
import { computed, reactive } from 'vue'

import { defaultCommissionRules2026 } from './domain/default-rules'
import type { CommissionRules, PaymentMethod, SellerType } from './domain/types'
import { formatCurrency, formatPercent } from './lib/money'
import { getCommissionFromItemPrice } from './use-cases/get-commission-from-item-price'
import { getItemPriceFromTargetNet } from './use-cases/get-item-price-from-target-net'

const rulesConfig = reactive({
  campaignExtraRatePercent: 2.5,
  cpfExtraFee: 3,
  cpfExtraOrdersThreshold90d: 450,
  cnpjLowPriceThreshold: 8,
  cpfLowPriceThreshold: 12,
})

const defaultRulesConfig = {
  campaignExtraRatePercent: 2.5,
  cpfExtraFee: 3,
  cpfExtraOrdersThreshold90d: 450,
  cnpjLowPriceThreshold: 8,
  cpfLowPriceThreshold: 12,
}

const caseOneForm = reactive({
  itemPrice: 500,
  sellerType: 'cnpj' as SellerType,
  paymentMethod: 'card_or_boleto' as PaymentMethod,
  ordersLast90Days: 0,
  includeCampaignExtra: false,
})

const caseTwoForm = reactive({
  targetNetAmount: 404,
  sellerType: 'cnpj' as SellerType,
  paymentMethod: 'card_or_boleto' as PaymentMethod,
  ordersLast90Days: 0,
  includeCampaignExtra: false,
})

const cnpjRuleCards = computed(() => {
  return activeRules.value.brackets.map((bracket) => ({
    rangeLabel:
      bracket.max === null
        ? `Acima de ${formatCurrency(bracket.min)}`
        : `${formatCurrency(bracket.min)} até ${formatCurrency(bracket.max)}`,
    commissionLabel: `${formatPercent(bracket.percentageRate)} + ${formatCurrency(bracket.fixedFee)}`,
    pixLabel: bracket.pixSubsidyRate === 0 ? '-' : formatPercent(bracket.pixSubsidyRate),
  }))
})

const cpfRuleCards = computed(() => {
  return activeRules.value.brackets.map((bracket) => ({
    rangeLabel:
      bracket.max === null
        ? `Acima de ${formatCurrency(bracket.min)}`
        : `${formatCurrency(bracket.min)} até ${formatCurrency(bracket.max)}`,
    commissionLabel: `${formatPercent(bracket.percentageRate)} + ${formatCurrency(bracket.fixedFee)} + ${cpfExtraFeeLabel.value}`,
    pixLabel: bracket.pixSubsidyRate === 0 ? '-' : formatPercent(bracket.pixSubsidyRate),
  }))
})

const activeRules = computed<CommissionRules>(() => ({
  ...defaultCommissionRules2026,
  campaignExtraRate: rulesConfig.campaignExtraRatePercent / 100,
  cpfExtraFee: rulesConfig.cpfExtraFee,
  cpfExtraOrdersThreshold90d: rulesConfig.cpfExtraOrdersThreshold90d,
  cnpjLowPriceThreshold: rulesConfig.cnpjLowPriceThreshold,
  cpfLowPriceThreshold: rulesConfig.cpfLowPriceThreshold,
}))

const caseOneResult = computed(() =>
  getCommissionFromItemPrice({
    itemPrice: caseOneForm.itemPrice,
    sellerType: caseOneForm.sellerType,
    paymentMethod: caseOneForm.paymentMethod,
    ordersLast90Days: caseOneForm.ordersLast90Days,
    includeCampaignExtra: caseOneForm.includeCampaignExtra,
    rules: activeRules.value,
  }),
)

const caseTwoResult = computed(() =>
  getItemPriceFromTargetNet({
    targetNetAmount: caseTwoForm.targetNetAmount,
    sellerType: caseTwoForm.sellerType,
    paymentMethod: caseTwoForm.paymentMethod,
    ordersLast90Days: caseTwoForm.ordersLast90Days,
    includeCampaignExtra: caseTwoForm.includeCampaignExtra,
    rules: activeRules.value,
  }),
)

const campaignRateLabel = computed(() => formatPercent(rulesConfig.campaignExtraRatePercent / 100))
const cpfExtraFeeLabel = computed(() => formatCurrency(rulesConfig.cpfExtraFee))
const cpfOrdersThresholdLabel = computed(() => rulesConfig.cpfExtraOrdersThreshold90d.toLocaleString('pt-BR'))
const cnpjLowPriceThresholdLabel = computed(() => formatCurrency(rulesConfig.cnpjLowPriceThreshold))
const cpfLowPriceThresholdLabel = computed(() => formatCurrency(rulesConfig.cpfLowPriceThreshold))

function sellerLabel(value: SellerType): string {
  return value === 'cnpj' ? 'CNPJ' : 'CPF'
}

function paymentLabel(value: PaymentMethod): string {
  return value === 'pix' ? 'Pix' : 'Cartão ou Boleto'
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
  <main class="page-shell">
    <section class="hero">
      <p class="eyebrow">Meu Preço Shopee</p>
      <h1>Meu Preço Shopee</h1>
      <p>
        Simulador de comissão Shopee 2026 para vendedores CPF e CNPJ, com cálculo por faixa, subsídio Pix e
        cenários de preço/líquido.
      </p>
      <p>
        Referência oficial:
        <a
          href="https://seller.shopee.com.br/edu/article/26839/Comissao-para-vendedores-CNPJ-e-CPF-em-2026"
          target="_blank"
          rel="noreferrer"
        >
          Comissão para vendedores CNPJ e CPF em 2026
        </a>
      </p>
    </section>

    <section class="grid-two">
      <article class="card">
        <h2>Calcular taxa de comissão Shopee</h2>
        <p class="card-subtitle">Recebe preço e configurações, retorna comissão detalhada.</p>

        <div class="form-grid">
          <label>
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

          <label>
            Pedidos em 90 dias
            <input v-model.number="caseOneForm.ordersLast90Days" type="number" min="0" step="1" />
          </label>
        </div>

        <label class="inline-check">
          <input v-model="caseOneForm.includeCampaignExtra" type="checkbox" />
          Aplicar Campanha de Destaque Shopee ({{ campaignRateLabel }})
        </label>

        <div class="result-grid">
          <div>
            <span>Faixa</span>
            <strong>
              {{ formatCurrency(caseOneResult.bracket.min) }}
              <template v-if="caseOneResult.bracket.max !== null">
                até {{ formatCurrency(caseOneResult.bracket.max) }}
              </template>
              <template v-else>ou mais</template>
            </strong>
          </div>
          <div>
            <span>Comissão total</span>
            <strong>{{ formatCurrency(caseOneResult.totalCommissionAmount) }}</strong>
          </div>
          <div>
            <span>Valor líquido</span>
            <strong>{{ formatCurrency(caseOneResult.netAmount) }}</strong>
          </div>
          <div>
            <span>Subsídio Pix</span>
            <strong>{{ formatCurrency(caseOneResult.pixSubsidyAmount) }}</strong>
          </div>
        </div>

        <ul class="explain-list">
          <li>{{ sellerLabel(caseOneResult.sellerType) }} • {{ paymentLabel(caseOneResult.paymentMethod) }}</li>
          <li>Parcela percentual: {{ formatCurrency(caseOneResult.percentageAmount) }}</li>
          <li>Taxa fixa aplicável: {{ formatCurrency(caseOneResult.fixedFeeAmount) }}</li>
          <li>Adicional CPF aplicado: {{ formatCurrency(caseOneResult.cpfExtraFeeAmount) }}</li>
          <li>Comissão base: {{ formatCurrency(caseOneResult.baseCommissionAmount) }}</li>
          <li>Comissão após subsídio: {{ formatCurrency(caseOneResult.commissionAmount) }}</li>
        </ul>
      </article>

      <article class="card">
        <h2>Calcular quanto quero receber</h2>
        <p class="card-subtitle">Recebe líquido desejado e configurações, retorna preço sugerido.</p>

        <div class="form-grid">
          <label>
            Valor líquido desejado
            <input v-model.number="caseTwoForm.targetNetAmount" type="number" min="0" step="0.01" />
          </label>

          <label>
            Tipo de vendedor
            <select v-model="caseTwoForm.sellerType">
              <option value="cnpj">CNPJ</option>
              <option value="cpf">CPF</option>
            </select>
          </label>

          <label>
            Meio de pagamento
            <select v-model="caseTwoForm.paymentMethod">
              <option value="card_or_boleto">Cartão/Boleto</option>
              <option value="pix">Pix</option>
            </select>
          </label>

          <label>
            Pedidos em 90 dias
            <input v-model.number="caseTwoForm.ordersLast90Days" type="number" min="0" step="1" />
          </label>
        </div>

        <label class="inline-check">
          <input v-model="caseTwoForm.includeCampaignExtra" type="checkbox" />
          Aplicar Campanha de Destaque Shopee ({{ campaignRateLabel }})
        </label>

        <div class="result-grid">
          <div>
            <span>Preço sugerido</span>
            <strong>{{ formatCurrency(caseTwoResult.suggestedItemPrice) }}</strong>
          </div>
          <div>
            <span>Comissão total</span>
            <strong>{{ formatCurrency(caseTwoResult.outcome.totalCommissionAmount) }}</strong>
          </div>
          <div>
            <span>Líquido alcançado</span>
            <strong>{{ formatCurrency(caseTwoResult.outcome.netAmount) }}</strong>
          </div>
          <div>
            <span>Diferença para alvo</span>
            <strong>{{ formatCurrency(caseTwoResult.outcome.netAmount - caseTwoResult.requestedNetAmount) }}</strong>
          </div>
        </div>

        <ul class="explain-list">
          <li>Alvo informado: {{ formatCurrency(caseTwoResult.requestedNetAmount) }}</li>
          <li>Faixa encontrada: {{ formatCurrency(caseTwoResult.outcome.bracket.min) }} +</li>
          <li>Subsídio Pix aplicado: {{ formatCurrency(caseTwoResult.outcome.pixSubsidyAmount) }}</li>
          <li>Comissão final: {{ formatCurrency(caseTwoResult.outcome.totalCommissionAmount) }}</li>
        </ul>
      </article>
    </section>

    <section class="card full">
      <h2>Configurações das regras</h2>
      <p class="card-subtitle">
        Área avançada. Se você quer usar o padrão oficial de 01/03/2026, não precisa alterar nada.
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
      <h2>Tabela base de faixas</h2>
      <p class="card-subtitle">Referência oficial da política de comissão de 01/03/2026, separada por tipo de vendedor.</p>

      <div class="rates-section">
        <h3>Vendedores CNPJ</h3>
        <div class="rates-grid">
          <div v-for="item in cnpjRuleCards" :key="`cnpj-${item.rangeLabel}`" class="rate-item large">
            <h4>{{ item.rangeLabel }}</h4>
            <p>Comissão: {{ item.commissionLabel }}</p>
            <p>Subsídio Pix: {{ item.pixLabel }}</p>
          </div>
        </div>
      </div>

      <div class="rates-section">
        <h3>Vendedores CPF</h3>
        <p class="rates-note">
          Tabela com adicional CPF de {{ cpfExtraFeeLabel }}. Esse adicional entra quando passar de
          {{ cpfOrdersThresholdLabel }} pedidos em 90 dias.
        </p>
        <div class="rates-grid">
          <div v-for="item in cpfRuleCards" :key="`cpf-${item.rangeLabel}`" class="rate-item large">
            <h4>{{ item.rangeLabel }}</h4>
            <p>Comissão: {{ item.commissionLabel }}</p>
            <p>Subsídio Pix: {{ item.pixLabel }}</p>
          </div>
        </div>
      </div>

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
            <li>Sem cobrança em cancelamento, devolução, reembolso ou desistência da compra.</li>
            <li>Campanha de Destaque Shopee adiciona {{ campaignRateLabel }} durante campanha ativa.</li>
            <li>Atualização desta política com vigência em 01/03/2026.</li>
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
            <li>Programa de Frete Grátis sem coparticipação para todos os vendedores.</li>
            <li>Subsídio de frete: até R$20 (itens até R$79,99), até R$30 (R$80 a R$199,99), até R$40 (acima de R$200).</li>
            <li>Também há cupons de 50% de desconto no frete para compras acima de R$10.</li>
            <li>Vendedores com Intelipost/API de frete possuem política logística específica a partir de março/2026.</li>
          </ul>
        </article>
      </div>
    </section>
  </main>
</template>
