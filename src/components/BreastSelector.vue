<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BreastType } from '../types/nursing'

interface Props {
  modelValue: BreastType
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  showLabels?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: BreastType): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  size: 'medium',
  showLabels: true
})

const emit = defineEmits<Emits>()

const selectedBreast = ref<BreastType>(props.modelValue)

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  selectedBreast.value = newValue
})

// Watch for internal changes and emit
watch(selectedBreast, (newValue) => {
  emit('update:modelValue', newValue)
})

function selectBreast(breast: BreastType) {
  if (props.disabled) return
  selectedBreast.value = breast
}

// Keyboard navigation
function handleKeydown(event: KeyboardEvent, breast: BreastType) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectBreast(breast)
  }
}
</script>

<template>
  <div class="breast-selector" :class="{ disabled, [`size-${size}`]: true }">
    <div class="breast-options">
      <!-- Left Breast -->
      <button
        type="button"
        class="breast-option"
        :class="{ 
          active: selectedBreast === 'left',
          disabled 
        }"
        :disabled="disabled"
        :aria-pressed="selectedBreast === 'left'"
        :aria-label="showLabels ? 'Left breast' : 'Left'"
        @click="selectBreast('left')"
        @keydown="handleKeydown($event, 'left')"
      >
        <div class="breast-icon left-breast">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M12 2C8.5 2 6 4.5 6 8C6 12 8 14 10 16C11 17 12 18 12 20V22H14V20C14 18 15 17 16 16C18 14 20 12 20 8C20 4.5 17.5 2 14 2H12Z" 
              :fill="selectedBreast === 'left' ? 'currentColor' : 'none'"
              :stroke="selectedBreast === 'left' ? 'none' : 'currentColor'"
              stroke-width="2"
            />
            <circle cx="15" cy="8" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <span v-if="showLabels" class="breast-label">Left</span>
      </button>

      <!-- Both Breasts -->
      <button
        type="button"
        class="breast-option both-option"
        :class="{ 
          active: selectedBreast === 'both',
          disabled 
        }"
        :disabled="disabled"
        :aria-pressed="selectedBreast === 'both'"
        :aria-label="showLabels ? 'Both breasts' : 'Both'"
        @click="selectBreast('both')"
        @keydown="handleKeydown($event, 'both')"
      >
        <div class="breast-icon both-breasts">
          <svg viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Left breast -->
            <path 
              d="M12 2C8.5 2 6 4.5 6 8C6 12 8 14 10 16C11 17 12 18 12 20V22H14V20C14 18 15 17 16 16C18 14 20 12 20 8C20 4.5 17.5 2 14 2H12Z" 
              :fill="selectedBreast === 'both' ? 'currentColor' : 'none'"
              :stroke="selectedBreast === 'both' ? 'none' : 'currentColor'"
              stroke-width="2"
            />
            <circle cx="15" cy="8" r="1.5" fill="currentColor" />
            <!-- Right breast -->
            <path 
              d="M36 2C32.5 2 30 4.5 30 8C30 12 32 14 34 16C35 17 36 18 36 20V22H38V20C38 18 39 17 40 16C42 14 44 12 44 8C44 4.5 41.5 2 38 2H36Z" 
              :fill="selectedBreast === 'both' ? 'currentColor' : 'none'"
              :stroke="selectedBreast === 'both' ? 'none' : 'currentColor'"
              stroke-width="2"
            />
            <circle cx="39" cy="8" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <span v-if="showLabels" class="breast-label">Both</span>
      </button>

      <!-- Right Breast -->
      <button
        type="button"
        class="breast-option"
        :class="{ 
          active: selectedBreast === 'right',
          disabled 
        }"
        :disabled="disabled"
        :aria-pressed="selectedBreast === 'right'"
        :aria-label="showLabels ? 'Right breast' : 'Right'"
        @click="selectBreast('right')"
        @keydown="handleKeydown($event, 'right')"
      >
        <div class="breast-icon right-breast">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M12 2C8.5 2 6 4.5 6 8C6 12 8 14 10 16C11 17 12 18 12 20V22H14V20C14 18 15 17 16 16C18 14 20 12 20 8C20 4.5 17.5 2 14 2H12Z" 
              :fill="selectedBreast === 'right' ? 'currentColor' : 'none'"
              :stroke="selectedBreast === 'right' ? 'none' : 'currentColor'"
              stroke-width="2"
            />
            <circle cx="15" cy="8" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <span v-if="showLabels" class="breast-label">Right</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.breast-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.breast-options {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
}

.breast-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-bg-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 4rem;
  position: relative;
}

.breast-option:hover:not(.disabled) {
  border-color: var(--color-text-accent);
  background: var(--color-surface-hover);
  transform: translateY(-1px);
}

.breast-option:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring, rgba(99, 102, 241, 0.1));
}

.breast-option.active {
  border-color: var(--color-text-accent);
  background: var(--color-text-accent);
  color: white;
}

.breast-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.breast-icon {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.breast-icon svg {
  width: 100%;
  height: 100%;
}

.both-breasts svg {
  width: 3rem;
  height: 1.5rem;
}

.breast-label {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
}

/* Size variations */
.size-small .breast-option {
  padding: 0.5rem;
  min-width: 3rem;
}

.size-small .breast-icon {
  width: 1.5rem;
  height: 1.5rem;
}

.size-small .both-breasts svg {
  width: 2.25rem;
  height: 1.125rem;
}

.size-small .breast-label {
  font-size: 0.75rem;
}

.size-large .breast-option {
  padding: 1rem;
  min-width: 5rem;
}

.size-large .breast-icon {
  width: 2.5rem;
  height: 2.5rem;
}

.size-large .both-breasts svg {
  width: 3.75rem;
  height: 1.875rem;
}

.size-large .breast-label {
  font-size: 1rem;
}

/* Responsive design */
@media (max-width: 480px) {
  .breast-options {
    gap: 0.5rem;
  }
  
  .breast-option {
    padding: 0.5rem;
    min-width: 3.5rem;
  }
  
  .breast-icon {
    width: 1.75rem;
    height: 1.75rem;
  }
  
  .both-breasts svg {
    width: 2.625rem;
    height: 1.3125rem;
  }
  
  .breast-label {
    font-size: 0.8125rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .breast-option {
    border-width: 3px;
  }
  
  .breast-option.active {
    background: #000;
    border-color: #000;
    color: white;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .breast-option {
    transition: none;
  }
  
  .breast-option:hover:not(.disabled) {
    transform: none;
  }
}
</style>