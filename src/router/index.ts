import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import FeedingsPage from '../views/FeedingsPage.vue'
import BabyHistoryPage from '../views/BabyHistoryPage.vue'
import ProfilePage from '../views/ProfilePage.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/feedings',
    name: 'Feedings',
    component: FeedingsPage
  },
  {
    path: '/baby/:babyId',
    name: 'BabyHome',
    component: BabyHistoryPage
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router 