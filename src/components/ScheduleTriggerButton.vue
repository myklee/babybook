<script setup lang="ts">
import { ref, computed } from 'vue'
import type { FeedingSchedule } from '../types/feedingScheduleAutomation'
import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import spoonIcon from '../assets/icons/spoon.svg'

interface Props {
  schedule: FeedingSchedule
  isLoading?: boolean
  showAmount?: boolean
  compact?: boolean
  showUsageBadge?: boolean
}

interface Emits {
  (e: 'trigger', schedule: FeedingSchedule): void
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  showAmount: true,
  compact: false,
  showUsageBadge: false
})

const emit = defineEmits<Emits>()

// Feedback state
const feedbackState = ref<'idle' | 'success' | 'error'>('idle')
const feedbackTimer = ref<number | null>(null)

// Get icon for feeding type
const feedingIcon = computed(() => {
  switch (props.schedule.feeding_type) {
    case 'breast':
      return breastIcon
    case 'formula':
      return formulaIcon
    case 'solid':
      return spoonIcon
    default:
      return breastIcon
  }
})

// Get CSS class for feeding type
const feedingTypeClass = computed(() => {
  return `schedule-trigger-btn-${props.schedule.feeding_type}`
})

// Get display text for schedule
const scheduleDisplayText = computed(() => {
  return props.schedule.name
})

// Get amount text if applicable
const amountText = computed(() => {
  if (props.showAmount && props.schedule.feeding_type === 'formula' && props.schedule.default_amount) {
    return `${props.schedule.default_amount}ml`
  }
  return null
})

// Handle button click
function handleClick() {
  if (props.isLoading || feedbackState.value !== 'idle') {
    return
  }
  emit('trigger', props.schedule)
}

// Show success feedback
function showSuccess() {
  feedbackState.value = 'success'
  clearFeedbackTimer()
  feedbackTimer.value = window.setTimeout(() => {
    feedbackState.value = 'idle'
  }, 2000)
}

// Show error feedback
function showError() {
  feedbackState.value = 'error'
  clearFeedbackTimer()
  feedbackTimer.value = window.setTimeout(() => {
    feedbackState.value = 'idle'
  }, 3000)
}

// Clear feedback timer
function clearFeedbackTimer() {
  if (feedbackTimer.value !== null) {
    clearTimeout(feedbackTimer.value)
    feedbackTimer.value = null
  }
}

// Expose methods for parent components
defineExpose({
  showSuccess,
  showError
})
</script>

<template>
  <button
    class="schedule-trigger-btn"
    :class="[
      feedingTypeClass,
      {
        'is-loading': isLoading,
        'is-success': feedbackState === 'success',
        'is-error': feedbackState === 'error',
        'is-compact': compact
      }
    ]"
    :disabled="isLoading || feedbackState !== 'idle'"
    @click="handleClick"
    :aria-label="`Trigger ${schedule.name} feeding schedule`"
    :aria-busy="isLoading"
    :aria-live="feedbackState !== 'idle' ? 'polite' : undefined"
  >
    <!-- Usage Badge -->
    <div v-if="showUsageBadge && schedule.usage_count > 0" class="usage-badge">
      {{ schedule.usage_count }}
    </div>

    <div class="schedule-trigger-btn-content">
      <img 
        :src="feedingIcon" 
        :alt="`${schedule.feeding_type} feeding`"
        class="schedule-trigger-icon"
        :class="{ 'icon-spinning': isLoading }"
      />
      <div class="schedule-trigger-info">
        <span class="schedule-trigger-name">{{ scheduleDisplayText }}</span>
        <span v-if="amountText" class="schedule-trigger-amount">
          {{ amountText }}
        </span>
      </div>
    </div>
    
    <!-- Loading spinner overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner" role="status" aria-label="Creating feeding entry"></div>
    </div>

    <!-- Success feedback -->
    <div v-if="feedbackState === 'success'" class="feedback-overlay feedback-success">
      <svg class="feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>

    <!-- Error feedback -->
    <div v-if="feedbackState === 'error'" class="feedback-overlay feedback-error">
      <svg class="feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    </div>
  </button>
</template>

<style scoped>
.schedule-trigger-btn {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal) var(--transition-easing);
  flex: 1 1 auto;
  min-width: 140px;
  overflow: hidden;
}

.schedule-trigger-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.schedule-trigger-btn:active:not(:disabled) {
  transform: translateY(0);
}

.schedule-trigger-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.schedule-trigger-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.schedule-trigger-btn.is-loading,
.schedule-trigger-btn.is-success,
.schedule-trigger-btn.is-error {
  pointer-events: none;
}

.schedule-trigger-btn.is-compact {
  padding: 0.625rem 0.75rem;
  min-width: 120px;
}

.usage-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--color-primary);
  color: white;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 3;
  line-height: 1.2;
}

.schedule-trigger-btn-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  z-index: 1;
}

.schedule-trigger-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  transition: transform var(--transition-slow) var(--transition-easing);
}

.schedule-trigger-btn.is-compact .schedule-trigger-icon {
  width: 20px;
  height: 20px;
}

.icon-spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.schedule-trigger-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  flex: 1;
}

.schedule-trigger-name {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

.schedule-trigger-btn.is-compact .schedule-trigger-name {
  font-size: 0.8125rem;
}

.schedule-trigger-amount {
  font-size: 0.75rem;
  opacity: 0.8;
  font-weight: 500;
}

.schedule-trigger-btn.is-compact .schedule-trigger-amount {
  font-size: 0.6875rem;
}

/* Overlay styles */
.loading-overlay,
.feedback-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  z-index: 2;
}

.loading-overlay {
  background: rgba(0, 0, 0, 0.1);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.feedback-overlay {
  animation: fadeIn var(--transition-fast) var(--transition-easing);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.feedback-success {
  background: rgba(34, 197, 94, 0.2);
}

.feedback-error {
  background: rgba(239, 68, 68, 0.2);
}

.feedback-icon {
  width: 32px;
  height: 32px;
  animation: scaleIn var(--transition-normal) var(--transition-easing);
}

@keyframes scaleIn {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.feedback-success .feedback-icon {
  color: var(--color-success);
}

.feedback-error .feedback-icon {
  color: var(--color-error);
}

/* Feeding type specific colors */
.schedule-trigger-btn-breast {
  background-color: var(--color-feeding-breast);
  color: #2d2d2d;
}

.schedule-trigger-btn-breast .schedule-trigger-icon {
  filter: brightness(0) saturate(100%) invert(0%);
}

.schedule-trigger-btn-formula {
  background-color: var(--color-feeding-formula);
  color: #2d2d2d;
}

.schedule-trigger-btn-formula .schedule-trigger-icon {
  filter: brightness(0) saturate(100%) invert(0%);
}

.schedule-trigger-btn-solid {
  background-color: var(--color-feeding-solid);
  color: #ffffff;
}

.schedule-trigger-btn-solid .schedule-trigger-icon {
  filter: brightness(0) invert(1);
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .schedule-trigger-btn {
    min-width: 120px;
    padding: 0.625rem 0.75rem;
  }

  .schedule-trigger-icon {
    width: 20px;
    height: 20px;
  }

  .schedule-trigger-name {
    font-size: 0.8125rem;
  }

  .schedule-trigger-amount {
    font-size: 0.6875rem;
  }
}

@media (min-width: 768px) {
  .schedule-trigger-btn {
    min-width: 160px;
  }
}

/* High contrast theme adjustments */
[data-theme="high-contrast"] .schedule-trigger-btn {
  border: 2px solid currentColor;
}

[data-theme="high-contrast"] .schedule-trigger-btn:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 3px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .schedule-trigger-btn {
    transition: none;
  }

  .icon-spinning {
    animation: none;
  }

  .spinner {
    animation: none;
    border-top-color: rgba(255, 255, 255, 0.9);
  }

  .feedback-overlay,
  .feedback-icon {
    animation: none;
  }
}
</style>
