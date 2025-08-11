<template>
  <textarea
    :id="id"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :required="required"
    :readonly="readonly"
    :rows="rows"
    :cols="cols"
    :maxlength="maxlength"
    :class="textareaClasses"
    @input="handleInput"
    @focus="handleFocus"
    @blur="handleBlur"
  ></textarea>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  readonly?: boolean
  id?: string
  rows?: number
  cols?: number
  maxlength?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'error' | 'success'
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

const props = withDefaults(defineProps<Props>(), {
  rows: 4,
  size: 'md',
  variant: 'default',
  resize: 'vertical'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
}>()

const isFocused = ref(false)

const textareaClasses = computed(() => [
  'form-textarea',
  `form-textarea--${props.size}`,
  `form-textarea--${props.variant}`,
  `form-textarea--resize-${props.resize}`,
  {
    'form-textarea--focused': isFocused.value,
    'form-textarea--disabled': props.disabled,
    'form-textarea--readonly': props.readonly
  }
])

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
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
.form-textarea {
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
  min-height: 100px;
}

.form-textarea::placeholder {
  color: var(--form-input-placeholder);
}

/* Size variants */
.form-textarea--sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  min-height: 80px;
}

.form-textarea--md {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  min-height: 100px;
}

.form-textarea--lg {
  padding: 1rem 1.25rem;
  font-size: 1.125rem;
  min-height: 120px;
}

/* Resize options */
.form-textarea--resize-none {
  resize: none;
}

.form-textarea--resize-vertical {
  resize: vertical;
}

.form-textarea--resize-horizontal {
  resize: horizontal;
}

.form-textarea--resize-both {
  resize: both;
}

/* Focus state */
.form-textarea:focus,
.form-textarea--focused {
  background-color: var(--form-input-bg-focus);
  border-color: var(--form-input-border-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

/* Hover state */
.form-textarea:hover:not(:disabled):not(:readonly) {
  border-color: var(--color-surface-border-hover);
}

/* Variant states */
.form-textarea--error {
  border-color: var(--color-error);
}

.form-textarea--error:focus {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px var(--color-error-bg);
}

.form-textarea--success {
  border-color: var(--color-success);
}

.form-textarea--success:focus {
  border-color: var(--color-success);
  box-shadow: 0 0 0 3px var(--color-success-bg);
}

/* Disabled state */
.form-textarea--disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--color-surface);
  resize: none;
}

/* Readonly state */
.form-textarea--readonly {
  background-color: var(--color-surface);
  cursor: default;
  resize: none;
}

/* Dark theme adjustments */
[data-theme="dark"] .form-textarea {
  /* Already handled by CSS variables */
}

/* Light theme adjustments */
[data-theme="light"] .form-textarea {
  /* Already handled by CSS variables */
}

/* High contrast theme adjustments */
[data-theme="high-contrast"] .form-textarea {
  border-width: 2px;
}

[data-theme="high-contrast"] .form-textarea:focus {
  border-color: var(--color-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}
</style>
</template>