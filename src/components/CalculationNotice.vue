<script setup lang="ts">
import { computed } from 'vue'
import type { CalculationAudit, CalculationWarning } from '../domain/types'

const props = defineProps<{ audit?: CalculationAudit }>()
const labels: Record<CalculationWarning, string> = {
  'rounding-not-reconciled': 'Arredondamentos ainda não conciliados com extratos reais da Shopee.',
  'cpf-low-price-unverified': 'A fórmula completa para CPF abaixo de R$ 12 não foi confirmada; este valor é uma estimativa.',
  'pix-rate-assumed': 'Subsídio Pix estimado em 8%; a Shopee anuncia até 8%.',
  'campaign-pix-base-unverified': 'A base de cálculo da campanha combinada com Pix ainda precisa de confirmação.',
  'coupon-commission-base-unverified': 'A base de comissão com cupom ainda precisa de confirmação.',
  'order-coupon-allocation-unverified': 'Rateio proporcional do cupom estimado; pode diferir do rateio da Shopee.',
  'custom-rules': 'Há parâmetros personalizados diferentes da política publicada.',
}
const messages = computed(() => props.audit?.warnings.map((warning) => labels[warning]) ?? [])
const dateLabel = computed(() => props.audit?.effectiveDate?.split('-').reverse().join('/'))
</script>

<template>
  <aside class="card full text-sm" aria-label="Condições da simulação">
    <p v-if="dateLabel">Data do cálculo: {{ dateLabel }}. Fontes consultadas em 18/09/2026.</p>
    <ul>
      <li v-for="message in messages" :key="message">{{ message }}</li>
    </ul>
    <p>Esta tela simula cada produto isoladamente. Custos adicionais da operação não estão incluídos.</p>
  </aside>
</template>
