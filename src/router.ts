import { createRouter, createWebHistory } from 'vue-router'

import HomePage from './pages/HomePage.vue'
import ProductValueBatchPage from './pages/ProductValueBatchPage.vue'
import ProductValuePage from './pages/ProductValuePage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/calcular-valor-produto',
      name: 'product-value',
      component: ProductValuePage,
    },
    {
      path: '/calcular-varios-produtos',
      name: 'product-value-batch',
      component: ProductValueBatchPage,
    },
  ],
})
