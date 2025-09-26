<template>
  <input
    :id="id"
    :type="type"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    :readonly="readonly"
    :autocomplete="autocomplete"
    :class="inputClasses"
    @input="handleInput"
    @focus="handleFocus"
    @blur="handleBlur"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue?: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  placeholder?: string
  disabled?: boolean
  required?: boolean
  readonly?: boolean
  autocomplete?: string
  id?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'error' | 'success'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  size: 'md',
  variant: 'default'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const isFocused = ref(false)

const inputClasses = computed(() => [
  'form-input',
  `form-input--${props.size}`,
  `form-input--${props.variant}`,
  {
    'form-input--focused': isFocused.value,
    'form-input--disabled': props.disabled,
    'form-input--readonly': props.readonly
  }
])

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
}
</script>

<style scoped>
.form-input {
  /* Base styling */
  width: 100%;
  border: 1px solid var(--form-input-border);
  border-radius: 8px;
  background-color: var(--form-input-bg);
  color: var(--form-input-text);
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  transition: all 0.2s ease-in-out;
  outline: none;
}

.form-input::placeholder {
  color: var(--form-input-placeholder);
}

/* Size variants */
.form-input--sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.form-input--md {
  padding: 0.75rem 1rem;
  font-size: 1rem;
}

.form-input--lg {
  padding: 1rem 1.25rem;
  font-size: 1.125rem;
}

/* Focus state */
.form-input:focus,
.form-input--focused {
  background-color: var(--form-input-bg-focus);
  border-color: var(--form-input-border-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

/* Hover state */
.form-input:hover:not(:disabled):not(:readonly) {
  border-color: var(--color-surface-border-hover);
}

/* Variant states */
.form-input--error {
  border-color: var(--color-error);
}

.form-input--error:focus {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px var(--color-error-bg);
}

.form-input--success {
  border-color: var(--color-success);
}

.form-input--success:focus {
  border-color: var(--color-success);
  box-shadow: 0 0 0 3px var(--color-success-bg);
}

/* Disabled state */
.form-input--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--color-surface);
}

/* Readonly state */
.form-input--readonly {
  background-color: var(--color-surface);
  cursor: default;
}

/* Dark theme adjustments */
[data-theme="dark"] .form-input {
  /* Already handled by CSS variables */
}

/* Light theme adjustments */
[data-theme="light"] .form-input {
  /* Already handled by CSS variables */
}

/* High contrast theme adjustments */
[data-theme="high-contrast"] .form-input {
  border-width: 2px;
}

[data-theme="high-contrast"] .form-input:focus {
  border-color: var(--color-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}
</style>