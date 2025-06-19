<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useBabyStore } from './stores/babyStore'

const store = useBabyStore()
const lastRefreshTime = ref(0)
const REFRESH_COOLDOWN = 5000 // 5 seconds

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
    store.initializeStore()
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
      store.initializeStore()
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
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 1rem;
}

.btn:hover {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.history {
  margin-top: 1rem;
}

.history-section {
  margin-bottom: 1.5rem;
}

.history-section h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: white;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.history-content {
  flex: 1;
}

.time {
  font-weight: 500;
  color: #333;
  margin-bottom: 0.25rem;
}

.details {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.type {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
}

.amount {
  color: #666;
  font-size: 0.875rem;
}

.notes {
  color: #666;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* Modal styles */
.record-modal-overlay,
.edit-record-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.record-modal,
.edit-record-modal {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.record-modal h3,
.edit-record-modal h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
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
