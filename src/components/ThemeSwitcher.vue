<template>
  <div class="theme-switcher">
    <label class="theme-switcher__label" for="theme-select">
      Theme
    </label>
    <select
      id="theme-select"
      v-model="selectedTheme"
      class="theme-switcher__select"
      @change="handleThemeChange"
    >
      <option
        v-for="option in themeOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTheme, type Theme } from '../composables/useTheme'

interface ThemeOption {
  value: Theme
  label: string
}

interface Props {
  variant?: 'dropdown' | 'toggle'
  size?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  variant: 'dropdown',
  size: 'md'
})

const { currentTheme, setTheme } = useTheme()
const selectedTheme = ref<Theme>('auto')

// Theme options for the dropdown
const themeOptions: ThemeOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' }
]

// Handle theme change
const handleThemeChange = () => {
  setTheme(selectedTheme.value)
}

// Initialize the selected theme on mount
onMounted(() => {
  selectedTheme.value = currentTheme.value
})
</script>

<style scoped>
.theme-switcher {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.theme-switcher__label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--form-label-text);
  margin-bottom: 0.25rem;
}

.theme-switcher__select {
  appearance: none;
  background-color: var(--form-input-bg);
  border: 1px solid var(--form-input-border);
  border-radius: 0.5rem;
  color: var(--form-input-text);
  cursor: pointer;
  font-size: 0.875rem;
  outline: none;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  transition: all 0.2s ease;
  width: 100%;
  
  /* Custom dropdown arrow */
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.75rem center;
  background-repeat: no-repeat;
  background-size: 1rem;
}

.theme-switcher__select:focus {
  background-color: var(--form-input-bg-focus);
  border-color: var(--form-input-border-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.theme-switcher__select:hover {
  border-color: var(--color-surface-border-hover);
}

/* Size variants */
.theme-switcher--sm .theme-switcher__select {
  font-size: 0.75rem;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
}

.theme-switcher--sm .theme-switcher__label {
  font-size: 0.75rem;
}

.theme-switcher--lg .theme-switcher__select {
  font-size: 1rem;
  padding: 1rem 3rem 1rem 1.25rem;
}

.theme-switcher--lg .theme-switcher__label {
  font-size: 1rem;
}

/* Light theme adjustments for dropdown arrow */
[data-theme="light"] .theme-switcher__select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23374151' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
}

/* High contrast theme adjustments */
[data-theme="high-contrast"] .theme-switcher__select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
  border-color: var(--color-text-primary);
}
</style>