import { computed } from 'vue'

export function useCalculation<T>(calculate: () => T) {
  const state = computed(() => {
    try {
      return { value: calculate(), error: '' }
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : 'Não foi possível calcular' }
    }
  })
  return {
    result: computed(() => state.value.value),
    error: computed(() => state.value.error),
  }
}
