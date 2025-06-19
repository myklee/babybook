<script setup lang="ts">
import { computed } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import { format } from 'date-fns'

const props = defineProps<{
  babyId: string
}>()

const store = useBabyStore()

const feedings = computed(() => {
  return store.getBabyFeedings(props.babyId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
})

const diaperChanges = computed(() => {
  return store.getBabyDiaperChanges(props.babyId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
})

function formatTime(date: Date) {
  return format(date, 'h:mm a')
}
</script>

<template>
  <div class="history">
    <div class="history-section">
      <h3>Recent Feedings</h3>
      <div v-if="feedings.length === 0" class="empty-state">
        No feedings recorded yet
      </div>
      <ul v-else class="history-list">
        <li v-for="feeding in feedings.slice(0, 5)" :key="feeding.id" class="history-item">
          <div class="time">{{ formatTime(feeding.timestamp) }}</div>
          <div class="details">
            <span class="type">{{ feeding.type }}</span>
            <span v-if="feeding.amount" class="amount">{{ feeding.amount }}ml</span>
          </div>
          <div v-if="feeding.notes" class="notes">{{ feeding.notes }}</div>
        </li>
      </ul>
    </div>

    <div class="history-section">
      <h3>Recent Diaper Changes</h3>
      <div v-if="diaperChanges.length === 0" class="empty-state">
        No diaper changes recorded yet
      </div>
      <ul v-else class="history-list">
        <li v-for="change in diaperChanges.slice(0, 5)" :key="change.id" class="history-item">
          <div class="time">{{ formatTime(change.timestamp) }}</div>
          <div class="details">
            <span class="type">{{ change.type }}</span>
          </div>
          <div v-if="change.notes" class="notes">{{ change.notes }}</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.history {
  margin-top: 1rem;
}

.history-section {
  margin-bottom: 1.5rem;
}

.history-section h3 {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.history-item {
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}

.history-item:last-child {
  border-bottom: none;
}

.time {
  font-size: 0.9rem;
  color: #666;
}

.details {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.type {
  text-transform: capitalize;
  color: #333;
}

.amount {
  color: #666;
}

.notes {
  font-size: 0.9rem;
  color: #666;
  margin-top: 0.25rem;
}

.empty-state {
  color: #999;
  font-style: italic;
  padding: 0.5rem;
}
</style> 