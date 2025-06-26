import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || './',
  server: {
    port: 5174
  },
  plugins: [
    vue()
  ]
})
