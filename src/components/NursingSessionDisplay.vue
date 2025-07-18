<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'

interface Props {
  session: {
    id: string
    type: string
    timestamp: string
    start_time?: string
    end_time?: string
    left_duration?: number
    right_duration?: number
    total_duration?: number
    breast_used?: 'left' | 'right' | 'both'
    notes?: string
  }
  showEdit?: boolean
  compact?: boolean
}

interface Emits {
  (e: 'edit', session: any): void
}

const props = withDefaults(defineProps<Props>(), {
  showEdit: true,
  compact: false
})

const emit = defineEmits<Emits>()

// Computed properties for display
const hasIndividualDurations = computed(() => {
  return !!(props.session.left_duration || props.session.right_duration)
})

const totalDurationDisplay = computed(() => {
  if (props.session.total_duration) {
    const minutes = Math.floor(props.session.total_duration / 60)
    const seconds = props.session.total_duration % 60
    return `${minutes}m ${seconds}s`
  }
  
  // Fallback to calculated duration from start/end times
  if (props.session.start_time && props.session.end_time) {
    const duration = Math.floor((new Date(props.session.end_time).getTime() - new Date(props.session.start_time).getTime()) / 1000)
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    return `${minutes}m ${seconds}s`
  }
  
  return 'Unknown duration'
})

const leftDurationDisplay = computed(() => {
  if (!props.session.left_duration) return null
  const minutes = Math.floor(props.session.left_duration / 60)
  const seconds = props.session.left_duration % 60
  return `${minutes}m ${seconds}s`
})

const rightDurationDisplay = computed(() => {
  if (!props.session.right_duration) return null
  const minutes = Math.floor(props.session.right_duration / 60)
  const seconds = props.session.right_duration % 60
  return `${minutes}m ${seconds}s`
})

const sessionTimeDisplay = computed(() => {
  if (props.session.start_time && props.session.end_time) {
    const start = new Date(props.session.start_time)
    const end = new Date(props.session.end_time)
    const isSameDay = start.toDateString() === end.toDateString()
    
    if (isSameDay) {
      return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
    } else {
      return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'MMM d, h:mm a')}`
    }
  } else if (props.session.timestamp) {
    return format(new Date(props.session.timestamp), 'MMM d, h:mm a')
  }
  
  return 'Unknown time'
})

const breastUsageDisplay = computed(() => {
  if (hasIndividualDurations.value) {
    if (props.session.left_duration && props.session.right_duration) {
      return 'both'
    } else if (props.session.left_duration) {
      return 'left'
    } else if (props.session.right_duration) {
      return 'right'
    }
  }
  
  return props.session.breast_used || 'unknown'
})

const isOngoing = computed(() => {
  return props.session.start_time && !props.session.end_time
})

function handleEdit() {
  if (props.showEdit) {
    emit('edit', props.session)
  }
}
</script>

<template>
  <div 
    class="nursing-session-display"
    :class="{ 
      compact: compact,
      clickable: showEdit,
      ongoing: isOngoing
    }"
    @click="handleEdit"
  >
    <!-- Header with time and status -->
    <div class="session-header">
      <div class="session-time">
        <span v-if="isOngoing" class="ongoing-indicator">🤱</span>
        {{ sessionTimeDisplay }}
        <span v-if="isOngoing" class="ongoing-text">Ongoing</span>
      </div>
      <div v-if="showEdit && !isOngoing" class="edit-indicator">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <!-- Duration display -->
    <div class="duration-section">
      <div class="total-duration">
        <span class="duration-label">Total:</span>
        <span class="duration-value">{{ totalDurationDisplay }}</span>
      </div>

      <!-- Individual breast durations -->
      <div v-if="hasIndividualDurations && !compact" class="individual-durations">
        <div v-if="leftDurationDisplay" class="breast-duration left">
          <span class="breast-indicator left-breast">L</span>
          <span class="duration-value">{{ leftDurationDisplay }}</span>
        </div>
        <div v-if="rightDurationDisplay" class="breast-duration right">
          <span class="breast-indicator right-breast">R</span>
          <span class="duration-value">{{ rightDurationDisplay }}</span>
        </div>
      </div>

      <!-- Compact dual display -->
      <div v-else-if="hasIndividualDurations && compact" class="compact-durations">
        <span v-if="leftDurationDisplay" class="compact-duration">
          <span class="breast-indicator left-breast">L</span>{{ leftDurationDisplay }}
        </span>
        <span v-if="rightDurationDisplay" class="compact-duration">
          <span class="breast-indicator right-breast">R</span>{{ rightDurationDisplay }}
        </span>
      </div>

      <!-- Breast usage indicator for legacy sessions -->
      <div v-else-if="!hasIndividualDurations && breastUsageDisplay !== 'unknown'" class="breast-usage">
        <span class="usage-label">Breast:</span>
        <span class="usage-value" :class="breastUsageDisplay">
          {{ breastUsageDisplay === 'both' ? 'Both' : breastUsageDisplay === 'left' ? 'Left' : 'Right' }}
        </span>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="session.notes && !compact" class="session-notes">
      <span class="notes-label">Notes:</span>
      <span class="notes-text">{{ session.notes }}</span>
    </div>

    <!-- Compact notes -->
    <div v-else-if="session.notes && compact" class="compact-notes">
      {{ session.notes }}
    </div>
  </div>
</template>

<style scoped>
.nursing-session-display {
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  border: 1px solid #dda0dd;
  border-radius: 0.75rem;
  padding: 1rem;
  transition: all 0.3s ease;
  position: relative;
  animation: fadeInUp 0.4s ease-out;
}

.nursing-session-display.clickable {
  cursor: pointer;
}

.nursing-session-display.clickable:hover {
  border-color: #c084fc;
  box-shadow: 0 2px 8px rgba(221, 160, 221, 0.2);
  transform: translateY(-1px);
}

.nursing-session-display.ongoing {
  border-color: #22c55e;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.nursing-session-display.compact {
  padding: 0.75rem;
}

/* Header */
.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.session-time {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
}

.ongoing-indicator {
  font-size: 1rem;
}

.ongoing-text {
  color: #22c55e;
  font-weight: 600;
  font-size: 0.8rem;
}

.edit-indicator {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.edit-indicator svg {
  width: 1rem;
  height: 1rem;
  color: #6b7280;
}

.nursing-session-display.clickable:hover .edit-indicator {
  opacity: 1;
}

/* Duration Section */
.duration-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.total-duration {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.duration-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.duration-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #7c3aed;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

/* Individual Durations */
.individual-durations {
  display: flex;
  gap: 1rem;
  margin-top: 0.25rem;
}

.breast-duration {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.breast-indicator {
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 1.5rem;
  text-align: center;
}

.breast-indicator.left-breast {
  background: #fef3c7;
  color: #92400e;
}

.breast-indicator.right-breast {
  background: #dbeafe;
  color: #1e40af;
}

/* Compact Durations */
.compact-durations {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.compact-duration {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #7c3aed;
}

.compact-duration .breast-indicator {
  padding: 0.125rem 0.375rem;
  font-size: 0.7rem;
}

/* Breast Usage (Legacy) */
.breast-usage {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.usage-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.usage-value {
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.usage-value.left {
  background: #fef3c7;
  color: #92400e;
}

.usage-value.right {
  background: #dbeafe;
  color: #1e40af;
}

.usage-value.both {
  background: #f3e8ff;
  color: #7c3aed;
}

/* Notes */
.session-notes {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(221, 160, 221, 0.3);
}

.notes-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  margin-right: 0.5rem;
}

.notes-text {
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.4;
}

.compact-notes {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #6b7280;
  font-style: italic;
  line-height: 1.3;
}

/* Responsive Design */
@media (max-width: 480px) {
  .individual-durations {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .compact-durations {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .session-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .nursing-session-display {
    border-width: 2px;
  }
  
  .breast-indicator {
    border: 1px solid currentColor;
  }
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .nursing-session-display,
  .edit-indicator {
    transition: none;
    animation: none;
  }
  
  .nursing-session-display.clickable:hover {
    transform: none;
  }
}
</style>