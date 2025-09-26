<template>
  <label
    :for="htmlFor"
    :class="labelClasses"
  >
    <slot />
    <span v-if="required" class="form-label__required" aria-label="required">*</span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  htmlFor?: string
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'error' | 'success' | 'disabled'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'default'
})

const labelClasses = computed(() => [
  'form-label',
  `form-label--${props.size}`,
  `form-label--${props.variant}`
])
</script>

<style scoped>
.form-label {
  /* Base styling */
  display: inline-block;
  color: var(--form-label-text);
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: color 0.2s ease-in-out;
}

/* Size variants */
.form-label--sm {
  font-size: 0.875rem;
  margin-bottom: 0.375rem;
}

.form-label--md {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.form-label--lg {
  font-size: 1.125rem;
  margin-bottom: 0.625rem;
}

/* Variant states */
.form-label--error {
  color: var(--color-error);
}

.form-label--success {
  color: var(--color-success);
}

.form-label--disabled {
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

/* Required indicator */
.form-label__required {
  color: var(--color-error);
  margin-left: 0.25rem;
  font-weight: bold;
}

/* Hover state */
.form-label:hover:not(.form-label--disabled) {
  color: var(--color-text-secondary);
}

/* Dark theme adjustments */
[data-theme="dark"] .form-label {
  /* Already handled by CSS variables */
}

/* Light theme adjustments */
[data-theme="light"] .form-label {
  /* Already handled by CSS variables */
}

/* High contrast theme adjustments */
[data-theme="high-contrast"] .form-label {
  font-weight: 600;
}

[data-theme="high-contrast"] .form-label__required {
  color: var(--color-focus);
}
</style>