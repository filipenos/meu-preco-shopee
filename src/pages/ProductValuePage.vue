<script setup lang="ts">
import { computed, reactive } from 'vue'

import type { PaymentMethod, SellerType } from '../domain/types'
import { formatCurrency, formatPercent } from '../lib/money'
import { getProductValueRuleVisibility } from './product-value-rule-visibility'
import { calculateProductValueFromCostAndTargetProfit } from '../services/product-value-from-cost-and-target-profit-service'

const rulesConfig = reactive({
  campaignExtraRatePercent: 2.5,
  cpfExtraFee: 3,
  cpfExtraOrdersThreshold90d: 450,
  cnpjLowPriceThreshold: 8,
  cpfLowPriceThreshold: 12,
})

const form = reactive({
  productCost: 202,
  targetNetAmount: 202,
  productCouponPercent: 0,
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

const serviceRulesConfig = computed(() => ({
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
    rate: storeCouponConfig.ratePercent / 100,
    maxDiscount: storeCouponConfig.maxDiscount,
  }
}

const result = computed(() => {
  const [calculated] = calculateProductValueFromCostAndTargetProfit({
    context: {
      sellerType: form.sellerType,
      paymentMethod: form.paymentMethod,
      ordersLast90Days: form.ordersLast90Days,
      includeCampaignExtra: form.includeCampaignExtra,
      storeCoupon: buildStoreCoupon(form.includeStoreCoupon),
    },
    items: [
      {
        variationName: 'item',
        productCost: form.productCost,
        targetProfit: form.targetNetAmount,
        productCouponPercent: form.productCouponPercent,
      },
    ],
    rulesConfig: serviceRulesConfig.value,
  })

  return calculated
})

const campaignRateLabel = computed(() => formatPercent(rulesConfig.campaignExtraRatePercent / 100))
const cpfExtraFeeLabel = computed(() => formatCurrency(rulesConfig.cpfExtraFee))
const cpfOrdersThresholdLabel = computed(() => rulesConfig.cpfExtraOrdersThreshold90d.toLocaleString('pt-BR'))
const cnpjLowPriceThresholdLabel = computed(() => formatCurrency(rulesConfig.cnpjLowPriceThreshold))
const cpfLowPriceThresholdLabel = computed(() => formatCurrency(rulesConfig.cpfLowPriceThreshold))
const storeCouponRateLabel = computed(() => formatPercent(storeCouponConfig.ratePercent / 100))
const showCouponFields = computed(() => form.includeStoreCoupon)
const visibleRules = computed(() => getProductValueRuleVisibility(form.sellerType))

function effectiveRateLabel(totalCommissionAmount: number, itemPrice: number): string {
  if (itemPrice <= 0) {
    return formatPercent(0)
  }

  return formatPercent(totalCommissionAmount / itemPrice)
}

</script>

<template>
  <main class="page-shell min-h-screen">
    <section class="hero">
      <p class="eyebrow">Meu Preço Shopee</p>
      <h1>Calcular valor do produto</h1>
      <p>
        Página exclusiva para calcular o preço que deve ser cadastrado no produto da Shopee com base em custo, lucro
        desejado e cupons.
      </p>
      <p>
        <router-link class="primary-link" to="/">Voltar para página principal</router-link>
      </p>
    </section>

    <section class="grid-two">
      <article class="card full">
        <h2>Calcular valor do produto</h2>
        <p class="card-subtitle">
          Todos os blocos ficam visíveis para ajuste rápido. O resultado atualiza em tempo real e destaca o preço de
          cadastro na Shopee.
        </p>

        <section class="input-block">
          <div class="input-block-header">
            <h3>1. Objetivo</h3>
            <p>Custo e lucro líquido real desejado (valor no bolso).</p>
          </div>
          <div class="form-grid">
            <label>
              Custo do produto
              <input v-model.number="form.productCost" type="number" min="0" step="0.01" />
            </label>
            <label>
              Lucro líquido desejado (valor real no bolso)
              <input v-model.number="form.targetNetAmount" type="number" min="0" step="0.01" />
            </label>
          </div>
          <div class="result-highlight">
            <span>Alvo total (custo + lucro)</span>
            <strong>{{ formatCurrency(result.targetNetAmount) }}</strong>
          </div>
        </section>

        <section class="input-block">
          <div class="input-block-header">
            <h3>2. Contexto</h3>
            <p>Define regras por perfil do vendedor e pagamento.</p>
          </div>
          <div class="form-grid">
            <div>
              <label>
                Tipo de vendedor
                <select v-model="form.sellerType">
                  <option value="cnpj">CNPJ</option>
                  <option value="cpf">CPF</option>
                </select>
              </label>
            </div>
            <div>
              <label>
                Meio de pagamento
                <select v-model="form.paymentMethod">
                  <option value="card_or_boleto">Cartão/Boleto</option>
                  <option value="pix">Pix</option>
                </select>
              </label>
            </div>
            <div v-if="form.sellerType === 'cpf'">
              <label>
                Pedidos em 90 dias
                <input v-model.number="form.ordersLast90Days" type="number" min="0" step="1" />
              </label>
            </div>
            <div>
              <label class="inline-check">
                <input v-model="form.includeCampaignExtra" type="checkbox" />
                Aplicar Campanha de Destaque Shopee ({{ campaignRateLabel }})
              </label>
            </div>
          </div>
        </section>

        <section class="input-block">
          <div class="input-block-header">
            <h3>3. Descontos</h3>
            <p>Cupons que impactam o preço final para chegar no líquido alvo.</p>
          </div>
          <div class="form-grid">
            <label>
              Cupom do produto (%)
              <input v-model.number="form.productCouponPercent" type="number" min="0" max="100" step="0.01" />
            </label>
            <div>
              <label class="inline-check">
                <input v-model="form.includeStoreCoupon" type="checkbox" />
                Aplicar cupom da loja
              </label>
            </div>
            <template v-if="showCouponFields">
              <label>
                Cupom da loja (%)
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
            </template>
          </div>
        </section>

        <section class="input-block">
          <div class="input-block-header">
            <h3>4. Regras avançadas</h3>
            <p>Use o padrão oficial, altere apenas se precisar simular outro cenário.</p>
          </div>
          <div class="form-grid compact">
            <label>
              Campanha de Destaque Shopee (%)
              <input v-model.number="rulesConfig.campaignExtraRatePercent" type="number" min="0" step="0.1" />
              <small>Aplicado apenas se a campanha estiver ativa.</small>
            </label>
            <label v-if="visibleRules.cpfExtraFee">
              Adicional CPF (R$)
              <input v-model.number="rulesConfig.cpfExtraFee" type="number" min="0" step="0.01" />
              <small>Taxa extra por item para CPF acima de {{ cpfOrdersThresholdLabel }} pedidos.</small>
            </label>
            <label v-if="visibleRules.cpfExtraOrdersThreshold90d">
              Limite pedidos CPF (90 dias)
              <input v-model.number="rulesConfig.cpfExtraOrdersThreshold90d" type="number" min="0" step="1" />
              <small>Acima do limite, aplica adicional de {{ cpfExtraFeeLabel }}.</small>
            </label>
            <label v-if="visibleRules.cnpjLowPriceThreshold">
              Limite item barato CNPJ (R$)
              <input v-model.number="rulesConfig.cnpjLowPriceThreshold" type="number" min="0" step="0.01" />
              <small>Abaixo de {{ cnpjLowPriceThresholdLabel }}, taxa fixa vira metade do preço.</small>
            </label>
            <label v-if="visibleRules.cpfLowPriceThreshold">
              Limite item barato CPF (R$)
              <input v-model.number="rulesConfig.cpfLowPriceThreshold" type="number" min="0" step="0.01" />
              <small>Abaixo de {{ cpfLowPriceThresholdLabel }}, aplica taxa regressiva.</small>
            </label>
          </div>
        </section>

        <section class="input-block result-block">
          <div class="input-block-header">
            <h3>5. Resultado</h3>
            <p>Preço final que deve ser cadastrado no produto da Shopee.</p>
          </div>
          <div class="result-grid">
            <div class="result-primary">
              <span>Preço de cadastro (Shopee)</span>
              <strong>{{ formatCurrency(result.requiredFullPrice) }}</strong>
              <em class="metric-note">Use este valor no campo de preço do anúncio.</em>
            </div>
            <div>
              <span>Preço final comprador</span>
              <strong>{{ formatCurrency(result.finalBuyerPrice) }}</strong>
            </div>
            <div>
              <span>Comissão total</span>
              <strong>{{ formatCurrency(result.commissionAmount) }}</strong>
              <em class="metric-note">
                Efetivo: {{ effectiveRateLabel(result.commissionAmount, result.finalBuyerPrice) }}
              </em>
            </div>
            <div>
              <span>Desconto cupom</span>
              <strong>{{ formatCurrency(result.couponDiscountAmount) }}</strong>
            </div>
            <div>
              <span>Líquido alcançado</span>
              <strong>{{ formatCurrency(result.netAmount) }}</strong>
            </div>
            <div>
              <span>Diferença para alvo total</span>
              <strong>{{ formatCurrency(result.netDiffToTarget) }}</strong>
            </div>
            <div>
              <span>Lucro após custo</span>
              <strong>{{ formatCurrency(result.profitAfterCost) }}</strong>
            </div>
          </div>
          <ul class="explain-list">
            <li>Preço para cadastrar: {{ formatCurrency(result.requiredFullPrice) }}</li>
            <li>Custo do produto: {{ formatCurrency(form.productCost) }}</li>
            <li>Lucro líquido desejado (no bolso): {{ formatCurrency(form.targetNetAmount) }}</li>
            <li>Alvo total (custo + lucro): {{ formatCurrency(result.targetNetAmount) }}</li>
            <li>Cupom do produto: {{ formatPercent(form.productCouponPercent / 100) }}</li>
            <li>Cupom loja: {{ form.includeStoreCoupon ? `ativo (${storeCouponRateLabel})` : 'desativado' }}</li>
            <li>Subsídio Pix aplicado: {{ formatCurrency(result.pixSubsidyAmount) }}</li>
            <li>Campanha ativa: {{ form.includeCampaignExtra ? `sim (${campaignRateLabel})` : 'não' }}</li>
            <li>Status do cálculo: {{ result.status }}</li>
          </ul>
        </section>
      </article>
    </section>
  </main>
</template>
