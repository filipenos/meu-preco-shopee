import { createRouter, createWebHistory } from 'vue-router'

import HomePage from './pages/HomePage.vue'
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
  ],
})
