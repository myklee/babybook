<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useCloudflareStore } from '../stores/cloudflareStore'
import { format } from 'date-fns'

const store = useCloudflareStore()

// State
const selectedBaby = ref<any>(null)
const showAddBabyModal = ref(false)
const showFeedingModal = ref(false)
const showDiaperModal = ref(false)
const showSleepModal = ref(false)
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast')
const diaperType = ref<'wet' | 'dirty' | 'both'>('wet')

// Forms
const babyForm = ref({ name: '', birthdate: '' })
const feedingForm = ref({ 
  type: 'breast' as 'breast' | 'formula' | 'solid', 
  amount: null as number | null, 
  timestamp: new Date().toISOString().slice(0, 16) 
})
const diaperForm = ref({
  type: 'wet' as 'wet' | 'dirty' | 'both',
  timestamp: new Date().toISOString().slice(0, 16)
})
const sleepForm = ref({
  start_time: new Date().toISOString().slice(0, 16),
  end_time: null as string | null
})

// Initialize on mount
onMounted(async () => {
  console.log('CloudflareHomePage mounted')
  if (store.babies.length > 0 && !selectedBaby.value) {
    selectedBaby.value = store.babies[0]
  }
})

// Watch for babies changes
watch(() => store.babies, (newBabies) => {
  if (newBabies.length > 0 && !selectedBaby.value) {
    selectedBaby.value = newBabies[0]
  }
}, { immediate: true })

// Select a baby
function selectBaby(baby: any) {
  selectedBaby.value = baby
  store.selectBaby(baby.id)
}

// Modal handlers
function openFeedingModal(type: 'breast' | 'formula' | 'solid') {
  feedingType.value = type
  feedingForm.value.type = type
  feedingForm.value.timestamp = new Date().toISOString().slice(0, 16)
  showFeedingModal.value = true
}

function openDiaperModal(type: 'wet' | 'dirty' | 'both') {
  diaperType.value = type
  diaperForm.value.type = type
  diaperForm.value.timestamp = new Date().toISOString().slice(0, 16)
  showDiaperModal.value = true
}

function openSleepModal() {
  sleepForm.value.start_time = new Date().toISOString().slice(0, 16)
  sleepForm.value.end_time = null
  showSleepModal.value = true
}

// Form handlers
async function handleAddBaby() {
  try {
    await store.addBaby(babyForm.value.name, babyForm.value.birthdate)
    showAddBabyModal.value = false
    babyForm.value = { name: '', birthdate: '' }
  } catch (error) {
    console.error('Failed to add baby:', error)
  }
}

async function handleAddFeeding() {
  if (!selectedBaby.value) return
  
  try {
    await store.addFeeding({
      baby_id: selectedBaby.value.id,
      type: feedingForm.value.type,
      amount: feedingForm.value.amount,
      timestamp: feedingForm.value.timestamp
    })
    showFeedingModal.value = false
    feedingForm.value = { 
      type: 'breast', 
      amount: null, 
      timestamp: new Date().toISOString().slice(0, 16) 
    }
  } catch (error) {
    console.error('Failed to add feeding:', error)
  }
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

async function handleAddSleepSession() {
  if (!selectedBaby.value) return
  
  try {
    await store.addSleepSession({
      baby_id: selectedBaby.value.id,
      start_time: sleepForm.value.start_time,
      end_time: sleepForm.value.end_time || undefined
    })
    showSleepModal.value = false
    sleepForm.value = {
      start_time: new Date().toISOString().slice(0, 16),
      end_time: null
    }
  } catch (error) {
    console.error('Failed to add sleep session:', error)
  }
}

// Utility functions
function getAgeString(birthdate: string) {
  const birth = new Date(birthdate)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - birth.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 30) {
    return `${diffDays} days old`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} month${months > 1 ? 's' : ''} old`
  } else {
    const years = Math.floor(diffDays / 365)
    const remainingMonths = Math.floor((diffDays % 365) / 30)
    return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} old`
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleString()
}

function getLastFeedingTime(babyId: string) {
  const babyFeedings = store.feedings.filter(f => f.baby_id === babyId)
  if (babyFeedings.length === 0) return null

  const lastFeeding = babyFeedings.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0]

  const lastFeedingTime = new Date(lastFeeding.timestamp)
  const now = new Date()
  const diffMs = now.getTime() - lastFeedingTime.getTime()

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  let timeString
  if (hours > 0) {
    timeString = `${hours}h ${minutes}m ago`
  } else {
    timeString = `${minutes}m ago`
  }

  return {
    time: timeString,
    type: lastFeeding.type
  }
}
</script>

<template>
  <div class="home-page">
    <div class="app-content">
      <!-- Header -->
      <div class="header">
        <h1 class="main-title">Baby Tracker</h1>
        <div class="header-actions">
          <button 
            v-if="store.babies.length === 0" 
            @click="showAddBabyModal = true"
            class="btn btn-primary"
          >
            Add Baby
          </button>
          <button @click="store.logout" class="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <!-- No Babies State -->
      <div v-if="store.babies.length === 0" class="no-babies-state">
        <h2>Welcome to Baby Tracker!</h2>
        <p>Let's start by adding your baby.</p>
        <button @click="showAddBabyModal = true" class="btn btn-primary btn-large">
          Add Your First Baby
        </button>
      </div>

      <!-- Baby Dashboard -->
      <div v-else class="baby-dashboard">
        <!-- Baby Selectors -->
        <div class="baby-selectors">
          <div class="baby-selectors-header">
            <h2>Your Babies</h2>
            <button @click="showAddBabyModal = true" class="btn btn-sm">
              Add Baby
            </button>
          </div>
          
          <div class="baby-cards">
            <div
              v-for="baby in store.babies"
              :key="baby.id"
              @click="selectBaby(baby)"
              :class="[
                'baby-card',
                { 'selected': selectedBaby?.id === baby.id }
              ]"
            >
              <div class="baby-avatar">
                <img 
                  :src="`https://api.dicebear.com/8.x/thumbs/svg?seed=${baby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`" 
                  :alt="baby.name"
                  class="baby-photo" 
                />
              </div>
              <div class="baby-info">
                <h3 class="baby-name">{{ baby.name }}</h3>
                <p class="baby-age">{{ getAgeString(baby.birthdate) }}</p>
                <div v-if="getLastFeedingTime(baby.id)" class="baby-last-feeding">
                  <span class="feeding-time">{{ getLastFeedingTime(baby.id)?.time }}</span>
                  <span class="feeding-type">({{ getLastFeedingTime(baby.id)?.type }})</span>
                </div>
                <div class="baby-stats">
                  <span>{{ store.getBabyStats(baby.id).feedings }} feedings</span>
                  <span>{{ store.getBabyStats(baby.id).diapers }} diapers</span>
                  <span>{{ store.getBabyStats(baby.id).sleeps }} sleeps</span>
                </div>
              </div>
              <div v-if="selectedBaby?.id === baby.id" class="selected-indicator">
                ✓ Selected
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div v-if="selectedBaby" class="quick-actions">
          <h3>Quick Actions for {{ selectedBaby.name }}</h3>
          <div class="action-grid">
            <button @click="openFeedingModal('breast')" class="action-btn breast">
              <span>🍼</span>
              <span>Breast</span>
            </button>
            <button @click="openFeedingModal('formula')" class="action-btn formula">
              <span>🍼</span>
              <span>Formula</span>
            </button>
            <button @click="openFeedingModal('solid')" class="action-btn solid">
              <span>🥄</span>
              <span>Solid</span>
            </button>
            <button @click="openDiaperModal('wet')" class="action-btn diaper-wet">
              <span>💧</span>
              <span>Wet</span>
            </button>
            <button @click="openDiaperModal('dirty')" class="action-btn diaper-dirty">
              <span>💩</span>
              <span>Dirty</span>
            </button>
            <button @click="openSleepModal()" class="action-btn sleep">
              <span>😴</span>
              <span>Sleep</span>
            </button>
          </div>
        </div>

        <!-- Recent Activity -->
        <div v-if="selectedBaby && store.selectedBabyActivity.length > 0" class="recent-activity">
          <h3>Recent Activity for {{ selectedBaby.name }}</h3>
          <div class="activity-list">
            <div
              v-for="activity in store.selectedBabyActivity"
              :key="activity.id"
              class="activity-item"
            >
              <div class="activity-info">
                <span class="activity-type">{{ activity.type }}</span>
                <span class="activity-details">{{ activity.details }}</span>
              </div>
              <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
            </div>
          </div>
        </div>

        <!-- No Activity State -->
        <div v-if="selectedBaby && store.selectedBabyActivity.length === 0" class="no-activity">
          <p>No activity yet for {{ selectedBaby.name }}. Add your first activity above!</p>
        </div>
      </div>
    </div>

    <!-- Add Baby Modal -->
    <div v-if="showAddBabyModal" class="modal-overlay" @click="showAddBabyModal = false">
      <div class="modal" @click.stop>
        <h2>Add Baby</h2>
        <form @submit.prevent="handleAddBaby" class="modal-form">
          <div class="form-group">
            <label>Baby's Name</label>
            <input
              v-model="babyForm.name"
              type="text"
              required
              placeholder="Enter baby's name"
            />
          </div>
          <div class="form-group">
            <label>Birth Date</label>
            <input
              v-model="babyForm.birthdate"
              type="date"
              required
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="showAddBabyModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Add Baby
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Feeding Modal -->
    <div v-if="showFeedingModal" class="modal-overlay" @click="showFeedingModal = false">
      <div class="modal" @click.stop>
        <h2>Add Feeding</h2>
        <form @submit.prevent="handleAddFeeding" class="modal-form">
          <div class="form-group">
            <label>Type</label>
            <select v-model="feedingForm.type">
              <option value="breast">Breast</option>
              <option value="formula">Formula</option>
              <option value="solid">Solid Food</option>
            </select>
          </div>
          <div v-if="feedingForm.type === 'formula'" class="form-group">
            <label>Amount (ml)</label>
            <input
              v-model.number="feedingForm.amount"
              type="number"
              placeholder="Amount in ml"
            />
          </div>
          <div class="form-group">
            <label>Time</label>
            <input
              v-model="feedingForm.timestamp"
              type="datetime-local"
              required
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="showFeedingModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Add Feeding
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Diaper Modal -->
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

    <!-- Add Sleep Modal -->
    <div v-if="showSleepModal" class="modal-overlay" @click="showSleepModal = false">
      <div class="modal" @click.stop>
        <h2>Add Sleep Session</h2>
        <form @submit.prevent="handleAddSleepSession" class="modal-form">
          <div class="form-group">
            <label>Start Time</label>
            <input
              v-model="sleepForm.start_time"
              type="datetime-local"
              required
            />
          </div>
          <div class="form-group">
            <label>End Time (optional)</label>
            <input
              v-model="sleepForm.end_time"
              type="datetime-local"
            />
          </div>
          <div class="modal-actions">
            <button type="button" @click="showSleepModal = false" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              Add Sleep Session
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  background-color: var(--color-bg-primary);
  min-height: 100vh;
  color: var(--color-text-primary);
}

.app-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-surface-border);
}

.main-title {
  font-size: 2rem;
  font-weight: bold;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.no-babies-state {
  text-align: center;
  padding: 4rem 2rem;
}

.no-babies-state h2 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.no-babies-state p {
  color: var(--color-text-accent);
  margin-bottom: 2rem;
}

.baby-dashboard {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.baby-selectors-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.baby-selectors-header h2 {
  margin: 0;
}

.baby-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.baby-card {
  background: var(--color-surface);
  border: 2px solid var(--color-surface-border);
  border-radius: 1rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.baby-card:hover {
  border-color: var(--color-text-accent);
}

.baby-card.selected {
  border-color: var(--color-text-primary);
  background: var(--color-bg-secondary);
}

.baby-avatar {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.baby-photo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.baby-info {
  text-align: center;
}

.baby-name {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.baby-age {
  color: var(--color-text-accent);
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
}

.baby-last-feeding {
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.feeding-time {
  font-weight: 500;
}

.feeding-type {
  color: var(--color-text-accent);
  margin-left: 0.5rem;
}

.baby-stats {
  display: flex;
  justify-content: space-around;
  font-size: 0.8rem;
  color: var(--color-text-accent);
}

.selected-indicator {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: var(--color-text-primary);
  color: var(--color-bg-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
}

.quick-actions h3 {
  margin-bottom: 1rem;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  max-width: 600px;
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
  min-height: 80px;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn span:first-child {
  font-size: 1.5rem;
}

.action-btn.breast {
  background: #e8f5e8;
  color: #2d5a2d;
}

.action-btn.formula {
  background: #fff3cd;
  color: #856404;
}

.action-btn.solid {
  background: #f8d7da;
  color: #721c24;
}

.action-btn.diaper-wet {
  background: #cce7ff;
  color: #004085;
}

.action-btn.diaper-dirty {
  background: #d4a574;
  color: #5d2e00;
}

.action-btn.sleep {
  background: #e2e3ff;
  color: #3730a3;
}

.recent-activity h3 {
  margin-bottom: 1rem;
}

.activity-list {
  background: var(--color-surface);
  border-radius: 1rem;
  overflow: hidden;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-surface-border);
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.activity-type {
  font-weight: 600;
}

.activity-details {
  color: var(--color-text-accent);
  font-size: 0.9rem;
}

.activity-time {
  color: var(--color-text-accent);
  font-size: 0.8rem;
}

.no-activity {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-accent);
}

/* Modal Styles */
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

/* Button Styles */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

.modal-actions .btn {
  flex: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .baby-cards {
    grid-template-columns: 1fr;
  }

  .action-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>