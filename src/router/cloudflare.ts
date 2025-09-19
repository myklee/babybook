import { createRouter, createWebHashHistory } from 'vue-router'
import CloudflareHomePage from '../views/CloudflareHomePage.vue'
import CloudflareBabyHistoryPage from '../views/CloudflareBabyHistoryPage.vue'
import CloudflareProfilePage from '../views/CloudflareProfilePage.vue'

const routes = [
  {
    path: '/',
    name: 'CloudflareHome',
    component: CloudflareHomePage
  },
  {
    path: '/baby/:babyId',
    name: 'CloudflareBabyHistory',
    component: CloudflareBabyHistoryPage,
    props: true
  },
  {
    path: '/profile',
    name: 'CloudflareProfile',
    component: CloudflareProfilePage
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router