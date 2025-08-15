<template>
  <button
    :class="[
      'retry-button',
      { 'retry-button--loading': isRetrying }
    ]"
    :disabled="isRetrying"
    @click="handleRetry"
    :aria-label="isRetrying ? 'Retrying...' : 'Retry'"
  >
    <span v-if="isRetrying" class="retry-button__spinner" aria-hidden="true"></span>
    <span class="retry-button__text">
      {{ isRetrying ? 'Retrying...' : 'Retry' }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  onRetry: () => Promise<void> | void
  disabled?: boolean
}

const props = defineProps<Props>()

const isRetrying = ref(false)

async function handleRetry() {
  if (isRetrying.value || props.disabled) return
  
  isRetrying.value = true
  try {
    await props.onRetry()
  } catch (error) {
    console.error('Retry failed:', error)
  } finally {
    isRetrying.value = false
  }
}
</script>

<style scoped>
.retry-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
  justify-content: center;
}

.retry-button:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
}

.retry-button:active:not(:disabled) {
  transform: translateY(0);
}

.retry-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.retry-button--loading {
  pointer-events: none;
}

.retry-button__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.retry-button__text {
  white-space: nowrap;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Theme variations */
.retry-button--secondary {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.retry-button--secondary:hover:not(:disabled) {
  background-color: var(--color-surface-hover);
}

.retry-button--danger {
  background-color: var(--color-error);
}

.retry-button--danger:hover:not(:disabled) {
  background-color: var(--color-error-hover);
}
</style>