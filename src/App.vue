<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useBabyStore } from './stores/babyStore'
import { useTheme } from './composables/useTheme'

const store = useBabyStore()
const lastRefreshTime = ref(0)
const REFRESH_COOLDOWN = 5000 // 5 seconds

// Initialize theme system
const { } = useTheme()

onMounted(async () => {
  console.log('App mounted, initializing...')
  await store.initializeStore()

  // Add focus listener for auto-refresh
  window.addEventListener('focus', handleFocus)

  // Add visibility change listener for when tab becomes visible
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener('focus', handleFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

function handleFocus() {
  const now = Date.now()
  if (now - lastRefreshTime.value > REFRESH_COOLDOWN) {
    console.log('Window focused, refreshing data...')
    // Only refresh if user is authenticated
    if (store.currentUser) {
      store.initializeStore()
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
      if (store.currentUser) {
        store.initializeStore()
      }
      lastRefreshTime.value = now
    } else {
      console.log('Skipping refresh due to cooldown')
    }
  }
}
</script>

<template>
  <div id="app">
    <router-view />
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
  background-color: black;
}


.btn-feeding {
  background-color: #ff9800;
}

.btn-feeding:hover {
  background-color: #f57c00;
}

.btn-feeding.breast {
  background-color: #ff9800;
}

.btn-feeding.formula {
  background-color: #2196f3;
}

.btn-diaper {
  background-color: #4caf50;
}

.btn-diaper:hover {
  background-color: #388e3c;
}

.btn-diaper.wet {
  background-color: #00bcd4;
}

.btn-diaper.dirty {
  background-color: #795548;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 2rem;
}



.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.btn-save {
  background-color: #4caf50;
  flex: 1;
}

.btn-save:hover {
  background-color: #388e3c;
}

.btn-delete {
  background-color: #f44336;
}

.btn-delete:hover {
  background-color: #d32f2f;
}

.btn-cancel {
  background-color: #9e9e9e;
}

.btn-cancel:hover {
  background-color: #757575;
}
</style>
