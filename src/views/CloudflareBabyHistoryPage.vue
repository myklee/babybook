<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useCloudflareStore } from '../stores/cloudflareStore'
import { useRouter, useRoute } from 'vue-router'
import CloudflareFeedingModal from '../components/CloudflareFeedingModal.vue'
import IconButton from '../components/IconButton.vue'
import SleepingAnimation from '../components/SleepingAnimation.vue'
import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import poopIcon from '../assets/icons/hugeicons_poop.svg'
import dropletsIcon from '../assets/icons/droplets.svg'
import spoonIcon from '../assets/icons/spoon.svg'
import arrowBigLeftIcon from '../assets/icons/arrow-big-left.svg'
import pencilIcon from '../assets/icons/lucide_pencil.svg'

// Define a unified type for all history events
type HistoryEvent = {
  id: string;
  event_type: 'feeding' | 'diaper' | 'sleep' | 'solid';
  event_time: string;
  // Feeding specific
  feeding_type?: 'breast' | 'formula' | 'solid';
  amount?: number | null;
  // Diaper specific
  diaper_type?: 'wet' | 'dirty' | 'both';
  // Sleep specific
  start_time?: string;
  end_time?: string | null;
  // Solid food specific
  food_name?: string;
}

const store = useCloudflareStore()
const router = useRouter()
const route = useRoute()

const selectedBaby = ref<any>(null)

// Modal state
const showFeedingModal = ref(false)
const showDiaperModal = ref(false)
const showSolidFoodModal = ref(false)
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast')
const diaperType = ref<'wet' | 'dirty' | 'both'>('wet')

// Form data for simple modals
const diaperForm = ref({
  type: 'wet' as 'wet' | 'dirty' | 'both',
  timestamp: new Date().toISOString().slice(0, 16)
})
const solidFoodForm = ref({
  food: '',
  timestamp: new Date().toISOString().slice(0, 16)
})

// When the component mounts, find the baby from route params
onMounted(() => {
  const babyId = route.params.babyId as string
  if (store.babies.length > 0) {
    selectedBaby.value = store.babies.find(b => b.id === babyId)
  }
})

// Watch for changes in the store's babies array
watch(() => store.babies, (newBabies) => {
  if (newBabies.length > 0 && !selectedBaby.value) {
    const babyId = route.params.babyId as string
    selectedBaby.value = newBabies.find(b => b.id === babyId)
  }
}, { immediate: true })

const combinedHistory = computed((): HistoryEvent[] => {
  if (!selectedBaby.value) return []

  const feedings: HistoryEvent[] = store.feedings
    .filter(f => f.baby_id === selectedBaby.value.id)
    .map(f => ({
      id: f.id,
      event_type: 'feeding',
      event_time: f.timestamp,
      feeding_type: f.type,
      amount: f.amount,
    }))

  const diapers: HistoryEvent[] = store.diaperChanges
    .filter(d => d.baby_id === selectedBaby.value.id)
    .map(d => ({
      id: d.id,
      event_type: 'diaper',
      event_time: d.timestamp,
      diaper_type: d.type as 'wet' | 'dirty' | 'both'
    }))

  const sleeps: HistoryEvent[] = store.sleepSessions
    .filter(s => s.baby_id === selectedBaby.value.id)
    .map(s => ({
      id: s.id,
      event_type: 'sleep',
      event_time: s.start_time,
      start_time: s.start_time,
      end_time: s.end_time,
    }))

  const allEvents = [...feedings, ...diapers, ...sleeps]

  return allEvents.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
})

// Basic stats
const basicStats = computed(() => {
  if (!selectedBaby.value) return null

  const babyFeedings = store.feedings.filter(f => f.baby_id === selectedBaby.value.id)
  const babyDiapers = store.diaperChanges.filter(d => d.baby_id === selectedBaby.value.id)

  // Get last 24 hours
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const last24HourFeedings = babyFeedings.filter(f => new Date(f.timestamp) >= yesterday)
  const last24HourDiapers = babyDiapers.filter(d => new Date(d.timestamp) >= yesterday)

  const totalAmount = last24HourFeedings.reduce((sum, f) => sum + (f.amount || 0), 0)
  const totalFeeds = last24HourFeedings.length
  const totalPoops = last24HourDiapers.filter(d => d.type === 'dirty' || d.type === 'both').length

  return {
    totalAmount,
    totalFeeds,
    totalPoops,
    avgPerFeed: totalFeeds > 0 ? Math.round(totalAmount / totalFeeds) : 0
  }
})

function getIcon(item: HistoryEvent) {
  switch (item.event_type) {
    case 'feeding':
      if (item.feeding_type === 'breast') {
        return breastIcon
      } else if (item.feeding_type === 'solid') {
        return spoonIcon
      }
      return formulaIcon
    case 'diaper':
      return item.diaper_type === 'wet' ? dropletsIcon : poopIcon
    case 'sleep':
      return dropletsIcon // placeholder
    default:
      return ''
  }
}

function formatTimestamp(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatBirthdate(birthdate: string) {
  return new Date(birthdate).toLocaleDateString()
}

function goHome() {
  router.push('/')
}

function switchBaby(baby: any) {
  router.push(`/baby/${baby.id}`)
}

// Modal handlers
function openFeedingModal(type: 'breast' | 'formula' | 'solid') {
  feedingType.value = type
  showFeedingModal.value = true
}

function openDiaperModal(type: 'wet' | 'dirty' | 'both') {
  diaperType.value = type
  diaperForm.value.type = type
  diaperForm.value.timestamp = new Date().toISOString().slice(0, 16)
  showDiaperModal.value = true
}

function openSolidFoodModal() {
  solidFoodForm.value.food = ''
  solidFoodForm.value.timestamp = new Date().toISOString().slice(0, 16)
  showSolidFoodModal.value = true
}

function handleFeedingSaved() {
  showFeedingModal.value = false
}

async function handleAddDiaperChange() {
  if (!selectedBaby.value) return
  
  try {
    await store.addDiaperChange({
      baby_id: selectedBaby.value.id,
      type: diaperForm.value.type,
      timestamp: diaperForm.value.timestamp
    })
    showDiaperModal.value = false
    diaperForm.value = {
      type: 'wet',
      timestamp: new Date().toISOString().slice(0, 16)
    }
  } catch (error) {
    console.error('Failed to add diaper change:', error)
  }
}

async function handleAddSolidFood() {
  if (!selectedBaby.value) return
  
  try {
    await store.addFeeding({
      baby_id: selectedBaby.value.id,
      type: 'solid',
      amount: undefined,
      timestamp: solidFoodForm.value.timestamp
    })
    showSolidFoodModal.value = false
    solidFoodForm.value = {
      food: '',
      timestamp: new Date().toISOString().slice(0, 16)
    }
  } catch (error) {
    console.error('Failed to add solid food:', error)
  }
}

function getEventDescription(item: HistoryEvent): string {
  switch (item.event_type) {
    case 'feeding':
      if (item.feeding_type === 'solid') {
        return `Solid food: ${item.food_name || 'Unknown'}`
      }
      return `${item.feeding_type} - ${item.amount || 0}ml`
    case 'diaper':
      return `Diaper: ${item.diaper_type}`
    case 'sleep':
      if (item.end_time) {
        const start = new Date(item.start_time!)
        const end = new Date(item.end_time)
        const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
        return `Sleep: ${duration} minutes`
      }
      return 'Sleep: In progress'
    default:
      return 'Unknown event'
  }
}
</script>

<template>
  <div class="history-page">
    <div v-if="selectedBaby" class="container">
      <header class="page-header">
        <IconButton :icon="arrowBigLeftIcon" alt="Go Home" title="Go Home" @click="goHome" />
        <div class="baby-info">
          <SleepingAnimation :is-sleeping="false" :size="60">
            <img
              :src="selectedBaby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${selectedBaby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`"
              :alt="selectedBaby.name" class="baby-photo" />
          </SleepingAnimation>
          <div class="baby-details">
            <div class="baby-name-section">
              <h2>{{ selectedBaby.name }}</h2>
            </div>
            <div v-if="selectedBaby.birthdate" class="baby-birthdate">
              {{ formatBirthdate(selectedBaby.birthdate) }}
            </div>
          </div>
        </div>

        <!-- Baby Selector -->
        <div v-if="store.babies.length > 1 && selectedBaby" class="baby-selector">
          <div class="baby-selector-buttons">
            <button v-for="baby in store.babies.filter(b => selectedBaby && b.id !== selectedBaby.id)" :key="baby.id"
              class="baby-switch-btn" @click="switchBaby(baby)" :title="`Switch to ${baby.name}`">
              <img
                :src="baby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${baby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`"
                :alt="baby.name" class="baby-switch-photo" />
            </button>
          </div>
        </div>
      </header>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="action-btn breast" @click="openFeedingModal('breast')" title="Record Breast Feeding">
          <img :src="breastIcon" alt="Breast" class="icon" />
          <span>Breast</span>
        </button>
        <button class="action-btn formula" @click="openFeedingModal('formula')" title="Record Formula Feeding">
          <img :src="formulaIcon" alt="Formula" class="icon" />
          <span>Formula</span>
        </button>
        <button class="action-btn solid" @click="openSolidFoodModal()" title="Record Solid Food">
          <img :src="spoonIcon" alt="Solid Food" class="icon" />
          <span>Solid</span>
        </button>
        <button class="action-btn poop" @click="openDiaperModal('dirty')" title="Record Poop Diaper">
          <img :src="poopIcon" alt="Poop" class="icon" />
          <span>Poop</span>
        </button>
        <button class="action-btn pee" @click="openDiaperModal('wet')" title="Record Pee Diaper">
          <img :src="dropletsIcon" alt="Pee" class="icon" />
          <span>Pee</span>
        </button>
      </div>

      <!-- Basic Stats -->
      <div v-if="basicStats" class="stats-section">
        <h3>Last 24 Hours</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ basicStats.totalAmount }}ml</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ basicStats.totalFeeds }}</div>
            <div class="stat-label">Feeds</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ basicStats.avgPerFeed }}ml</div>
            <div class="stat-label">Per feed</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ basicStats.totalPoops }}</div>
            <div class="stat-label">Poops</div>
          </div>
        </div>
      </div>

      <!-- History List -->
      <div class="history-section">
        <h3>Recent Activity</h3>
        <div v-if="combinedHistory.length === 0" class="no-history">
          <p>No activity recorded yet for {{ selectedBaby.name }}.</p>
        </div>
        <div v-else class="history-list">
          <div v-for="item in combinedHistory.slice(0, 20)" :key="item.id" class="history-item">
            <div class="history-icon">
              <img :src="getIcon(item)" :alt="item.event_type" class="icon" />
            </div>
            <div class="history-details">
              <div class="history-description">{{ getEventDescription(item) }}</div>
              <div class="history-time">{{ formatTimestamp(item.event_time) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <CloudflareFeedingModal
      v-if="selectedBaby"
      :is-open="showFeedingModal"
      :baby-id="selectedBaby.id"
      :baby-name="selectedBaby.name"
      :feeding-type="feedingType"
      @close="showFeedingModal = false"
      @saved="handleFeedingSaved"
    />

    <!-- Simple Diaper Modal -->
    <div v-if="showDiaperModal" class="modal-overlay" @click="showDiaperModal = false">
      <div class="modal" @click.stop>
        <h2>Add Diaper Change</h2>
        <form @submit.prevent="handleAddDiaperChange" class="modal-form">
          <div class="form-group">
            <label>Type</label>
            <select v-model="diaperForm.type">
              <option value="wet">Wet</option>
              <option value="dirty">Dirty</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div class="form-group">
            <label>Time</label>
            <input
              v-model="diaperForm.timestamp"
              type="datetime-local"
              required
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="showDiaperModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Add Diaper Change
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Simple Solid Food Modal -->
    <div v-if="showSolidFoodModal" class="modal-overlay" @click="showSolidFoodModal = false">
      <div class="modal" @click.stop>
        <h2>Add Solid Food</h2>
        <form @submit.prevent="handleAddSolidFood" class="modal-form">
          <div class="form-group">
            <label>Food</label>
            <input
              v-model="solidFoodForm.food"
              type="text"
              required
              placeholder="What did they eat?"
            />
          </div>
          <div class="form-group">
            <label>Time</label>
            <input
              v-model="solidFoodForm.timestamp"
              type="datetime-local"
              required
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="showSolidFoodModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Add Solid Food
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  background-color: var(--color-bg-primary);
  min-height: 100vh;
  color: var(--color-text-primary);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-surface-border);
}

.baby-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.baby-photo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.baby-details {
  flex: 1;
}

.baby-name-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.baby-name-section h2 {
  margin: 0;
  font-size: 1.5rem;
}

.baby-birthdate {
  color: var(--color-text-accent);
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

.baby-selector {
  display: flex;
  align-items: center;
}

.baby-selector-buttons {
  display: flex;
  gap: 0.5rem;
}

.baby-switch-btn {
  background: none;
  border: 2px solid var(--color-surface-border);
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  transition: all 0.2s;
}

.baby-switch-btn:hover {
  border-color: var(--color-text-primary);
}

.baby-switch-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border: none;
  border-radius: 1rem;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.2s ease;
  min-width: 80px;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn .icon {
  width: 24px;
  height: 24px;
}

.action-btn.breast {
  background-color: var(--color-feeding-breast);
  color: #2d2d2d;
}

.action-btn.formula {
  background-color: var(--color-feeding-formula);
  color: #2d2d2d;
}

.action-btn.solid {
  background-color: var(--color-feeding-solid);
  color: #ffffff;
}

.action-btn.poop {
  background-color: var(--color-diaper-poop);
  color: #ffffff;
}

.action-btn.pee {
  background-color: var(--color-diaper-pee);
  color: #2d2d2d;
}

.stats-section {
  margin-bottom: 2rem;
}

.stats-section h3 {
  margin-bottom: 1rem;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 1rem;
  padding: 1rem;
  text-align: center;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-accent);
  margin-top: 0.25rem;
}

.history-section h3 {
  margin-bottom: 1rem;
}

.no-history {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-accent);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 0.75rem;
}

.history-icon .icon {
  width: 24px;
  height: 24px;
}

.history-details {
  flex: 1;
}

.history-description {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.history-time {
  font-size: 0.875rem;
  color: var(--color-text-accent);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--color-surface);
  border-radius: 1rem;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  margin: 0 0 1.5rem 0;
  text-align: center;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 1px solid var(--color-surface-border);
  border-radius: 0.5rem;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-text-primary);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  flex: 1;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-surface-border);
}

.btn-secondary:hover {
  background: var(--color-surface-hover);
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .baby-info {
    width: 100%;
  }

  .action-buttons {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>