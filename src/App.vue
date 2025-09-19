<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useCloudflareStore } from './stores/cloudflareStore'
import { useTheme } from './composables/useTheme'
import NotificationContainer from './components/NotificationContainer.vue'
import AuthForm from './components/AuthForm.vue'

const store = useCloudflareStore()
const lastRefreshTime = ref(0)
const REFRESH_COOLDOWN = 5000 // 5 seconds

// Initialize theme system
const { } = useTheme()

function handleFocus() {
  const now = Date.now()
  if (now - lastRefreshTime.value > REFRESH_COOLDOWN) {
    console.log('Window focused, refreshing data...')
    // Only refresh if user is authenticated
    if (store.user) {
      store.loadData()
    }
    lastRefreshTime.value = now
  } else {
    console.log('Skipping refresh due to cooldown')
  }
}

function handleVisibilityChange() {
  if (!document.hidden) {
    const now = Date.now()
    if (now - lastRefreshTime.value > REFRESH_COOLDOWN) {
      console.log('Tab became visible, refreshing data...')
      // Only refresh if user is authenticated
      if (store.user) {
        store.loadData()
      }
      lastRefreshTime.value = now
    } else {
      console.log('Skipping refresh due to cooldown')
    }
  }
}

onMounted(async () => {
  console.log('App mounted, initializing...')
  await store.initializeStore()

  // Add event listeners for auto-refresh
  window.addEventListener('focus', handleFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('focus', handleFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div id="app">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">Baby Tracker</h1>
        <div v-if="store.user" class="flex items-center gap-4">
          <span class="text-sm text-gray-600">{{ store.user.email }}</span>
          <button @click="store.logout" class="text-sm text-red-600 hover:text-red-700">
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="store.loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error -->
    <div v-if="store.error" class="max-w-4xl mx-auto px-4 py-4">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{{ store.error }}</p>
        <button @click="store.clearError" class="text-red-600 hover:text-red-700 text-sm mt-2">
          Dismiss
        </button>
      </div>
    </div>

    <!-- Auth Form -->
    <AuthForm v-if="!store.user && !store.loading" />

    <!-- Main App with Router -->
    <router-view v-if="store.user && !store.loading" />

    <NotificationContainer />
  </div>
</template>

<style>
@import './styles/design-system.css';

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color-text-primary);
  margin: 0;
  padding: 0;
  background-color: var(--color-bg-primary);
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--color-bg-primary);
}

/* Tailwind-like utility classes for the header */
.bg-white { background-color: white; }
.shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
.border-b { border-bottom-width: 1px; border-color: #e5e7eb; }
.max-w-4xl { max-width: 56rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.py-12 { padding-top: 3rem; padding-bottom: 3rem; }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.items-center { align-items: center; }
.gap-4 { gap: 1rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.font-bold { font-weight: 700; }
.text-gray-900 { color: rgb(17 24 39); }
.text-gray-600 { color: rgb(75 85 99); }
.text-red-600 { color: rgb(220 38 38); }
.text-red-700 { color: rgb(185 28 28); }
.text-red-800 { color: rgb(153 27 27); }
.hover\:text-red-700:hover { color: rgb(185 28 28); }
.bg-red-50 { background-color: rgb(254 242 242); }
.border-red-200 { border-color: rgb(254 202 202); }
.rounded-lg { border-radius: 0.5rem; }
.p-4 { padding: 1rem; }
.mt-2 { margin-top: 0.5rem; }
.animate-spin { animation: spin 1s linear infinite; }
.rounded-full { border-radius: 9999px; }
.h-8 { height: 2rem; }
.w-8 { width: 2rem; }
.border-b-2 { border-bottom-width: 2px; }
.border-blue-600 { border-color: rgb(37 99 235); }

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>