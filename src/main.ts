import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/cloudflare'  // Use Cloudflare router
import './style.css'
import App from './App.vue'
import { Capacitor } from '@capacitor/core'

const app = createApp(App)
app.use(createPinia())
app.use(router)  // Enable Cloudflare router

if (Capacitor.getPlatform && Capacitor.getPlatform() === 'ios') {
  document.body.classList.add('ios')
}

app.mount('#app')
