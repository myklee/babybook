<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import { useNotifications } from '../composables/useNotifications'
import type { FeedingSchedule } from '../types/feedingScheduleAutomation'
import ScheduleTriggerButton from './ScheduleTriggerButton.vue'

interface Props {
  babyId: string
  babyName: string
}

const props = defineProps<Props>()

const store = useBabyStore()
const { showSuccess, showError } = useNotifications()

// Track which schedule is currently being triggered
const triggeringScheduleId = ref<string | null>(null)

// Store refs to button components for feedback
const buttonRefs = ref<Record<string, InstanceType<typeof ScheduleTriggerButton>>>({})

// Get active schedules for the baby
const activeSchedules = computed(() => {
  return store.getActiveFeedingSchedules(props.babyId)
})

// Check if there are any active schedules
const hasActiveSchedules = computed(() => {
  return activeSchedules.value.length > 0
})

// Trigger a feeding schedule
async function triggerSchedule(schedule: FeedingSchedule) {
  if (triggeringScheduleId.value) {
    // Already triggering a schedule, prevent double-clicks
    return
  }

  triggeringScheduleId.value = schedule.id

  try {
    const result = await store.triggerFeedingSchedule(schedule.id)

    if (result.success) {
      // Show success feedback on button
      buttonRefs.value[schedule.id]?.showSuccess()
      
      showSuccess(
        'Feeding Logged!',
        `${schedule.name} feeding entry created for ${props.babyName}`,
        { duration: 3000 }
      )
    } else {
      // Show error feedback on button
      buttonRefs.value[schedule.id]?.showError()
      
      // Provide specific error messages
      const errorTitle = result.error?.includes('inactive') 
        ? 'Schedule Inactive' 
        : result.error?.includes('not found')
        ? 'Schedule Not Found'
        : 'Failed to Log Feeding';
      
      const errorMessage = result.error || 'Please try again';
      
      showError(
        errorTitle,
        errorMessage,
        { duration: 6000 }
      )
    }
  } catch (error: any) {
    console.error('Error triggering schedule:', error)
    
    // Show error feedback on button
    buttonRefs.value[schedule.id]?.showError()
    
    // Handle specific error types
    if (error?.code === 'NETWORK_ERROR') {
      showError(
        'Connection Error',
        'Please check your internet connection and try again.',
        { duration: 6000 }
      )
    } else if (error?.code === 'AUTH_ERROR') {
      showError(
        'Session Expired',
        'Please sign in again to continue.',
        { duration: 8000, persistent: true }
      )
    } else {
      showError(
        'Failed to Log Feeding',
        error?.message || 'An unexpected error occurred. Please try again.',
        { duration: 6000 }
      )
    }
  } finally {
    triggeringScheduleId.value = null
  }
}

// Check if a schedule is currently being triggered
function isTriggering(scheduleId: string): boolean {
  return triggeringScheduleId.value === scheduleId
}

// Set button ref
function setButtonRef(scheduleId: string, el: any) {
  if (el) {
    buttonRefs.value[scheduleId] = el
  }
}
</script>

<template>
  <div v-if="hasActiveSchedules" class="quick-schedule-widget">
    <div class="widget-header">
      <h3 class="widget-title">Quick Schedules</h3>
    </div>
    
    <div class="schedule-buttons">
      <ScheduleTriggerButton
        v-for="schedule in activeSchedules"
        :key="schedule.id"
        :ref="(el) => setButtonRef(schedule.id, el)"
        :schedule="schedule"
        :is-loading="isTriggering(schedule.id)"
        :show-usage-badge="true"
        @trigger="triggerSchedule"
      />
    </div>
  </div>
</template>

<style scoped>
.quick-schedule-widget {
  width: 100%;
  max-width: 600px;
  margin: 0 auto 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 1rem;
  padding: 1rem;
}

.widget-header {
  margin-bottom: 0.75rem;
}

.widget-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.schedule-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .quick-schedule-widget {
    padding: 0.75rem;
  }

  .schedule-buttons {
    gap: 0.375rem;
  }
}

@media (min-width: 768px) {
  .schedule-buttons {
    gap: 0.75rem;
  }
}
</style>
