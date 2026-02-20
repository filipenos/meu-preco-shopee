<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

import type { PaymentMethod, SellerType } from '../domain/types'
import { formatCurrency, formatPercent } from '../lib/money'
import { getProductValueRuleVisibility } from './product-value-rule-visibility'
import {
  calculateProductValueFromCostAndTargetProfit,
  type ProductValueFromCostItemResult,
} from '../services/product-value-from-cost-and-target-profit-service'

interface ProductRow {
  id: number
  name: string
  productCost: number
  targetProfit: number
}

const rulesConfig = reactive({
  campaignExtraRatePercent: 2.5,
  cpfExtraFee: 3,
  cpfExtraOrdersThreshold90d: 450,
  cnpjLowPriceThreshold: 8,
  cpfLowPriceThreshold: 12,
})

const form = reactive({
  sellerType: 'cnpj' as SellerType,
  paymentMethod: 'card_or_boleto' as PaymentMethod,
  ordersLast90Days: 0,
  includeCampaignExtra: false,
  includeStoreCoupon: false,
  productCouponPercent: 0,
})

const storeCouponConfig = reactive({
  minPrice: 30,
  ratePercent: 3,
  maxDiscount: 3,
})

const rows = ref<ProductRow[]>([
  { id: 1, name: 'Produto 1', productCost: 202, targetProfit: 120 },
  { id: 2, name: 'Produto 2', productCost: 150, targetProfit: 80 },
])

const visibleRules = computed(() => getProductValueRuleVisibility(form.sellerType))
const campaignRateLabel = computed(() => formatPercent(rulesConfig.campaignExtraRatePercent / 100))
const cpfExtraFeeLabel = computed(() => formatCurrency(rulesConfig.cpfExtraFee))
const cpfOrdersThresholdLabel = computed(() => rulesConfig.cpfExtraOrdersThreshold90d.toLocaleString('pt-BR'))
const cnpjLowPriceThresholdLabel = computed(() => formatCurrency(rulesConfig.cnpjLowPriceThreshold))
const cpfLowPriceThresholdLabel = computed(() => formatCurrency(rulesConfig.cpfLowPriceThreshold))
const showCouponFields = computed(() => form.includeStoreCoupon)

const serviceRulesConfig = computed(() => ({
  campaignExtraRate: rulesConfig.campaignExtraRatePercent / 100,
  cpfExtraFee: rulesConfig.cpfExtraFee,
  cpfExtraOrdersThreshold90d: rulesConfig.cpfExtraOrdersThreshold90d,
  cnpjLowPriceThreshold: rulesConfig.cnpjLowPriceThreshold,
  cpfLowPriceThreshold: rulesConfig.cpfLowPriceThreshold,
}))

function safeMoney(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }

  return value
}

function buildStoreCoupon(enabled: boolean): { minPrice: number; rate: number; maxDiscount: number } | undefined {
  if (!enabled) {
    return undefined
  }

  return {
    minPrice: safeMoney(storeCouponConfig.minPrice),
    rate: safeMoney(storeCouponConfig.ratePercent) / 100,
    maxDiscount: safeMoney(storeCouponConfig.maxDiscount),
  }
}

const rowResults = computed(() => {
  const calculated = calculateProductValueFromCostAndTargetProfit({
    context: {
      sellerType: form.sellerType,
      paymentMethod: form.paymentMethod,
      ordersLast90Days: form.ordersLast90Days,
      includeCampaignExtra: form.includeCampaignExtra,
      storeCoupon: buildStoreCoupon(form.includeStoreCoupon),
    },
    items: rows.value.map((row) => ({
      variationName: row.name || `Produto ${row.id}`,
      productCost: safeMoney(row.productCost),
      targetProfit: safeMoney(row.targetProfit),
      productCouponPercent: safeMoney(form.productCouponPercent),
    })),
    rulesConfig: serviceRulesConfig.value,
  })

  return rows.value.map((row, index) => {
    const result = calculated[index] ?? createEmptyResult(row)
    return { row, result }
  })
})

function createEmptyResult(row: ProductRow): ProductValueFromCostItemResult {
  return {
    variationName: row.name || `Produto ${row.id}`,
    productCost: safeMoney(row.productCost),
    targetProfit: safeMoney(row.targetProfit),
    targetNetAmount: safeMoney(row.productCost) + safeMoney(row.targetProfit),
    productCouponPercent: safeMoney(form.productCouponPercent) / 100,
    requiredFullPrice: 0,
    discountedPrice: 0,
    couponApplied: false,
    couponDiscountAmount: 0,
    finalBuyerPrice: 0,
    commissionAmount: 0,
    pixSubsidyAmount: 0,
    netAmount: 0,
    netDiffToTarget: 0,
    profitAfterCost: 0,
    profitDiffToTarget: 0,
    status: 'target-too-low',
  }
}

let nextRowId = 3

function addRow(): void {
  const id = nextRowId
  nextRowId += 1
  rows.value.push({
    id,
    name: `Produto ${id}`,
    productCost: 0,
    targetProfit: 0,
  })
}

function removeRow(id: number): void {
  rows.value = rows.value.filter((row) => row.id !== id)
}
</script>

<template>
  <main class="page-shell min-h-screen">
    <section class="hero">
      <p class="eyebrow">Meu Preço Shopee</p>
      <h1>Calcular valor para vários produtos</h1>
      <p>Tabela para ajustar custo e lucro líquido por item, com cálculo em tempo real do preço de cadastro na Shopee.</p>
      <p class="hero-links">
        <router-link class="primary-link" to="/">Início</router-link>
        <router-link class="primary-link" to="/calcular-valor-produto">Página unitária</router-link>
      </p>
    </section>

    <section class="grid-two">
      <article class="card full">
        <h2>Configuração global</h2>
        <p class="card-subtitle">Contexto, descontos e regras aplicados para todos os produtos da tabela.</p>

        <section class="input-block">
          <div class="input-block-header">
            <h3>2. Contexto</h3>
          </div>
          <div class="form-grid">
            <label>
              Tipo de vendedor
              <select v-model="form.sellerType">
                <option value="cnpj">CNPJ</option>
                <option value="cpf">CPF</option>
              </select>
            </label>
            <label>
              Meio de pagamento
              <select v-model="form.paymentMethod">
                <option value="card_or_boleto">Cartão/Boleto</option>
                <option value="pix">Pix</option>
              </select>
            </label>
            <label v-if="form.sellerType === 'cpf'">
              Pedidos em 90 dias
              <input v-model.number="form.ordersLast90Days" type="number" min="0" step="1" />
            </label>
            <label class="inline-check">
              <input v-model="form.includeCampaignExtra" type="checkbox" />
              Aplicar Campanha de Destaque Shopee ({{ campaignRateLabel }})
            </label>
          </div>
        </section>

        <section class="input-block">
          <div class="input-block-header">
            <h3>3. Descontos</h3>
          </div>
          <div class="form-grid">
            <label>
              Cupom do produto (%) - global
              <input v-model.number="form.productCouponPercent" type="number" min="0" max="100" step="0.01" />
            </label>
            <label class="inline-check">
              <input v-model="form.includeStoreCoupon" type="checkbox" />
              Aplicar cupom da loja
            </label>
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
          </div>
          <div class="form-grid compact">
            <label>
              Campanha de Destaque Shopee (%)
              <input v-model.number="rulesConfig.campaignExtraRatePercent" type="number" min="0" step="0.1" />
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
      </article>

      <article class="card full table-first">
        <div class="table-actions">
          <h2>1. Produtos e resultado</h2>
          <button type="button" @click="addRow">Adicionar produto</button>
        </div>
        <p class="card-subtitle">
          Edite custo e lucro líquido desejado por linha. O sistema calcula o preço de cadastro e demais métricas.
        </p>

        <div class="table-wrap">
          <table class="pricing-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Custo</th>
                <th>Lucro líquido</th>
                <th>Preço cadastro</th>
                <th>Preço comprador</th>
                <th>Comissão</th>
                <th>Líquido</th>
                <th>Diferença</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody v-if="rowResults.length > 0">
              <tr v-for="item in rowResults" :key="item.row.id">
                <td>
                  <input v-model="item.row.name" type="text" />
                </td>
                <td>
                  <input v-model.number="item.row.productCost" type="number" min="0" step="0.01" />
                </td>
                <td>
                  <input v-model.number="item.row.targetProfit" type="number" min="0" step="0.01" />
                </td>
                <td>{{ formatCurrency(item.result.requiredFullPrice) }}</td>
                <td>{{ formatCurrency(item.result.finalBuyerPrice) }}</td>
                <td>{{ formatCurrency(item.result.commissionAmount) }}</td>
                <td>{{ formatCurrency(item.result.netAmount) }}</td>
                <td>{{ formatCurrency(item.result.netDiffToTarget) }}</td>
                <td>
                  <span class="status-pill">{{ item.result.status }}</span>
                </td>
                <td>
                  <button type="button" class="danger-btn" @click="removeRow(item.row.id)">Remover</button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="rowResults.length === 0" class="empty-table">Nenhum produto na tabela. Clique em "Adicionar produto".</p>
        </div>

      </article>
    </section>
  </main>
</template>
