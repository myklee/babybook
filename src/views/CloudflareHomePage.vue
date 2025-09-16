<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useCloudflareStore } from '../stores/cloudflareStore'
import CloudflareFeedingModal from '../components/CloudflareFeedingModal.vue'
// Note: Using simple modals for Cloudflare version to avoid Supabase dependencies
// import DiaperModal from '../components/DiaperModal.vue'
// import SolidFoodModal from '../components/SolidFoodModal.vue'
import IconButton from '../components/IconButton.vue'
import SleepingAnimation from '../components/SleepingAnimation.vue'
import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import spoonIcon from '../assets/icons/spoon.svg'
import historyIcon from '../assets/icons/history.svg'
import addBabyIcon from '../assets/icons/add-baby.svg'
import userRoundIcon from '../assets/icons/circle-user-round.svg'


const store = useCloudflareStore()

// State
const selectedBaby = ref<any>(null)
const showAddBabyModal = ref(false)
const showFeedingModal = ref(false)
const showDiaperModal = ref(false)
const showSleepModal = ref(false)
const showSolidFoodModal = ref(false)
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast')
const diaperType = ref<'wet' | 'dirty' | 'both'>('wet')

// Forms
const babyForm = ref({ name: '', birthdate: '' })
const diaperForm = ref({
  type: 'wet' as 'wet' | 'dirty' | 'both',
  timestamp: new Date().toISOString().slice(0, 16)
})
const solidFoodForm = ref({
  food: '',
  timestamp: new Date().toISOString().slice(0, 16)
})
const feedingForm = ref({ 
  type: 'breast' as 'breast' | 'formula' | 'solid', 
  amount: null as number | null, 
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

function openSolidFoodModal() {
  if (!selectedBaby.value) return
  showSolidFoodModal.value = true
}

function addBaby() {
  showAddBabyModal.value = true
}

function goToProfile() {
  // For now, just logout since we don't have a profile page in Cloudflare version
  store.logout()
}

function handleSleepClick() {
  if (!selectedBaby.value) return
  // For now, just open sleep modal - we'd need to implement sleep tracking in the store
  openSleepModal()
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

function handleFeedingSaved() {
  showFeedingModal.value = false
  // The modal handles the actual saving, we just need to close it
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

// Get feeding icon based on type
function getFeedingIcon(type: string | undefined) {
  if (type === 'breast') {
    return breastIcon
  } else if (type === 'nursing') {
    return breastIcon
  } else if (type === 'formula') {
    return formulaIcon
  } else if (type === 'solid') {
    return spoonIcon
  }
  return breastIcon // default
}
</script>

<template>
  <div class="home-page">
    <div class="app-content">
      <div class="header">
        <IconButton v-if="store.babies.length === 0" :icon="addBabyIcon" alt="Add Baby" title="Add Baby"
          @click="addBaby" />
        <div class="header-spacer"></div>
        <IconButton :icon="userRoundIcon" alt="Profile" title="Profile" @click="goToProfile" />
      </div>

      <div class="baby-selectors">
        <div v-for="baby in store.babies" :key="baby.id" class="baby-selector"
          :class="{ 'selected': selectedBaby?.id === baby.id }" @click="selectBaby(baby)">
          <SleepingAnimation :is-sleeping="false" :size="80">
            <img :src="baby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${baby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`" :alt="baby.name"
              class="baby-photo" />
          </SleepingAnimation>
          <div class="baby-info">
            <div class="baby-name-container">
              <span class="baby-name">{{ baby.name }}</span>
              <div class="baby-actions">
                <button class="history-icon-btn" title="View History" @click.stop="">
                  <img :src="historyIcon" alt="View History" class="history-icon" />
                </button>
              </div>
            </div>
            <div v-if="store.babies.length > 0 && getLastFeedingTime(baby.id)" class="baby-last-feeding">
              <img :src="getFeedingIcon(getLastFeedingTime(baby.id)?.type)" class="feeding-icon" alt="Feeding type" />
              <span class="feeding-time">{{ getLastFeedingTime(baby.id)?.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="action-grid">
        <button class="action-btn sleep" @click="handleSleepClick()">
          <span>Sleep</span>
        </button>
        <button class="action-btn breast" @click="openFeedingModal('breast')">
          <img src="../assets/icons/lucide-lab_bottle-baby.svg" class="icon" alt="Breast" />
          <span>Breast</span>
        </button>
        <button class="action-btn formula" @click="openFeedingModal('formula')">
          <img src="../assets/icons/flask-conical.svg" class="icon" alt="Formula" />
          <span>Formula</span>
        </button>
        <button class="action-btn solid" @click="openSolidFoodModal()">
          <img src="../assets/icons/spoon.svg" class="icon" alt="Solid Food" />
          <span>Solid</span>
        </button>
        <button class="action-btn poop" @click="openDiaperModal('dirty')">
          <img src="../assets/icons/hugeicons_poop.svg" class="icon" alt="Poop" />
          <span>Poop</span>
        </button>
        <button class="action-btn pee" @click="openDiaperModal('wet')">
          <img src="../assets/icons/droplets.svg" class="icon" alt="Pee" />
          <span>Pee</span>
        </button>
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

    <CloudflareFeedingModal
      v-if="selectedBaby"
      :is-open="showFeedingModal"
      :baby-id="selectedBaby.id"
      :baby-name="selectedBaby.name"
      :feeding-type="feedingType"
      @close="showFeedingModal = false"
      @saved="handleFeedingSaved"
    />

    <!-- Simple Diaper Modal for Cloudflare version -->
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

    <!-- Simple Solid Food Modal for Cloudflare version -->
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
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1rem;
}

.header-spacer {
  flex: 1;
}

.baby-selectors {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.baby-selector {
  display: flex;
  flex-direction: row;
  align-items: center;
  position: relative;
  padding: 1rem;
  border-radius: 1.5rem;
  cursor: pointer;
  background-color: transparent;
  border: 2px solid transparent;
  transition: all 0.2s ease-in-out;
  min-width: 200px;
  gap: 1rem;
}

.baby-selector.selected {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-text-primary);
}

.baby-photo {
  width: clamp(60px, 12vw, 80px);
  height: clamp(60px, 12vw, 80px);
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.baby-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0.5rem;
}

.baby-name-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
}

.baby-name {
  font-size: clamp(0.875rem, 2.5vw, 1.25rem);
  font-weight: 500;
}

.baby-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.history-icon-btn {
  background: none;
  border: none;
  padding: 0;
  margin-left: 0.5rem;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.2s;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
}

.history-icon-btn:hover {
  opacity: 1;
}

.history-icon {
  width: clamp(0.875rem, 2.5vw, 1.25rem);
  height: clamp(0.875rem, 2.5vw, 1.25rem);
  filter: brightness(0) invert(1);
}

.baby-last-feeding {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.8;
}

.feeding-icon {
  width: 12px;
  height: 12px;
  filter: brightness(0) invert(1) opacity(0.8);
}

.feeding-time {
  font-size: 0.75rem;
  color: var(--color-text-accent);
}

.action-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  width: 100%;
  max-width: 600px;
}

.action-btn {
  padding: clamp(0.67rem, 2vw, 1rem);
  border-radius: 1.5rem;
  border: none;
  font-size: clamp(0.87rem, 2.5vw, 1.25rem);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.33rem, 1.33vw, 0.67rem);
  height: clamp(67px, 17vw, 100px);
  width: clamp(80px, 20vw, 107px);
  color: var(--color-text-primary);
  transition: transform 0.2s ease;
  flex: 0 0 auto;
}

.action-btn:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: var(--shadow-md);
}

.icon {
  width: clamp(21px, 5.33vw, 32px);
  height: clamp(21px, 5.33vw, 32px);
  stroke-width: 1;
  flex-shrink: 0;
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

.action-btn.poop .icon {
  stroke-width: 0;
  fill: #ffffff;
}

.action-btn.pee {
  background-color: var(--color-diaper-pee);
  color: #2d2d2d;
}

.action-btn.sleep {
  background-color: var(--color-sleep-sleep);
  color: #ffffff;
}

/* Icon color adjustments for better contrast */
.action-btn.breast .icon,
.action-btn.formula .icon,
.action-btn.pee .icon {
  filter: brightness(0) saturate(100%) invert(0%);
}

.action-btn.solid .icon,
.action-btn.poop .icon,
.action-btn.sleep .icon {
  filter: brightness(0) invert(1);
}

.recent-activity {
  width: 100%;
  max-width: 600px;
  margin-top: 2rem;
}

.recent-activity h3 {
  margin-bottom: 1rem;
  text-align: center;
}

.activity-list {
  background: var(--color-surface);
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid var(--color-surface-border);
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

/* Responsive adjustments */
@media (max-width: 480px) {
  .home-page {
    padding: 0.5rem;
  }

  .baby-selectors {
    gap: 0.5rem;
  }

  .action-grid {
    gap: 0.5rem;
  }

  .action-btn {
    padding: 0.67rem;
    height: 67px;
  }
}

@media (min-width: 768px) {
  .baby-selectors {
    gap: 1.5rem;
  }

  .action-grid {
    gap: 1.5rem;
  }
}

/* Add Baby Modal */
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
</style>