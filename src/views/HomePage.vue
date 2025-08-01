<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '../stores/babyStore'
import FeedingModal from '../components/FeedingModal.vue'
import DiaperModal from '../components/DiaperModal.vue'
import SolidFoodModal from '../components/SolidFoodModal.vue'
import HistoryList from '../components/HistoryList.vue'
import IconButton from '../components/IconButton.vue'
import SleepingAnimation from '../components/SleepingAnimation.vue'
import NursingTimerModal from '../components/NursingTimerModal.vue'
import PersistentNursingIndicator from '../components/PersistentNursingIndicator.vue'
import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import spoonIcon from '../assets/icons/spoon.svg'
import bookUserIcon from '../assets/icons/book-user.svg'
import addBabyIcon from '../assets/icons/add-baby.svg'
import userRoundIcon from '../assets/icons/circle-user-round.svg'
import { format } from 'date-fns'

const store = useBabyStore()
const router = useRouter()

// State
const selectedBaby = ref<any>(null)
const showFeedingModal = ref(false)
const showDiaperModal = ref(false)
const showNursingTimerModal = ref(false)
const showSolidFoodModal = ref(false)
const feedingType = ref<'breast' | 'formula'>('breast')
const diaperType = ref<'pee' | 'poop' | 'both'>('pee')

// Auth state
const isAuthenticated = computed(() => {
  const authenticated = !!store.currentUser
  console.log('Authentication state changed:', authenticated, store.currentUser?.email)
  return authenticated
})

// Watch for when data is loaded but loading state might be stuck
watch(() => store.babies, (newBabies) => {
  if (newBabies.length > 0 && store.isLoading) {
    console.log('Data loaded but loading still true, forcing to false')
    // This will trigger a reactivity update
  }
}, { immediate: true })

// Initialize store on mount
onMounted(async () => {
  console.log('HomePage mounted, checking store...')
  if (!store.currentUser) {
    console.log('No user in store, initializing...')
    await store.initializeStore()
  } else {
    console.log('User already in store:', store.currentUser.email)
  }
  if (store.babies.length > 0) {
    selectBaby(store.babies[0])
  }
})

watch(() => store.babies, (newBabies) => {
  if (newBabies.length > 0 && !selectedBaby.value) {
    selectBaby(newBabies[0]);
  }
});

// Select a baby
function selectBaby(baby: any) {
  selectedBaby.value = baby
}

// Functions
function openFeedingModal(type: 'breast' | 'formula') {
  feedingType.value = type
  showFeedingModal.value = true
}

// Open solid food modal
function openSolidFoodModal() {
  if (!selectedBaby.value) return
  showSolidFoodModal.value = true
}

// Open nursing timer modal
function openNursingTimerModal() {
  if (!selectedBaby.value) return
  showNursingTimerModal.value = true
}

// Close nursing timer modal
function closeNursingTimerModal() {
  showNursingTimerModal.value = false
}

// Handle nursing session save (with automatic time handling)
function handleNursingSave(leftDuration: number, rightDuration: number, notes?: string, startTime?: Date) {
  console.log('Nursing session saved:', { leftDuration, rightDuration, notes, startTime })
  // The modal will close automatically after successful save
}

// Get active nursing session for selected baby
const activeNursingSession = computed(() => {
  if (!selectedBaby.value) return null
  return store.getActiveNursingSession(selectedBaby.value.id)
})

// Show persistent indicator when there's an active session and modal is closed
const showPersistentIndicator = computed(() => {
  return activeNursingSession.value && !showNursingTimerModal.value
})

// Handle tap on persistent indicator to reopen modal
function handleIndicatorTap() {
  if (activeNursingSession.value) {
    showNursingTimerModal.value = true
  }
}

function openDiaperModal(type: 'pee' | 'poop' | 'both') {
  diaperType.value = type
  showDiaperModal.value = true
}

function goToHistory() {
  if (selectedBaby.value) {
    router.push(`/baby/${selectedBaby.value.id}`)
  }
}

function goToBabyHistory(baby: any) {
  router.push(`/baby/${baby.id}`)
}

function goToProfile() {
  router.push('/profile')
}

// Sign in
async function signIn() {
  const email = prompt('Enter your email:')
  const password = prompt('Enter your password:')

  if (email && password) {
    try {
      await store.signIn(email, password)
      
      // Wait a moment for the authentication state to update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force a router navigation to refresh the page state
      await router.push('/')
    } catch (error) {
      console.error('Sign in error:', error)
      alert('Failed to sign in. Please check your credentials.')
    }
  }
}

// Sign up
async function signUp() {
  const email = prompt('Enter your email:')
  const password = prompt('Enter your password:')

  if (email && password) {
    try {
      await store.signUp(email, password)
      alert('Account created! Please check your email to verify your account.')
    } catch (error) {
      console.error('Sign up error:', error)
      alert('Failed to create account. Please try again.')
    }
  }
}

// Add baby
async function addBaby() {
  const name = prompt('Enter baby name:')
  if (name && name.trim()) {
    try {
      await store.addBaby(name.trim())
    } catch (error) {
      console.error('Error adding baby:', error)
      alert('Failed to add baby. Please try again.')
    }
  }
}

// Get last feeding time for a specific baby (including solid foods)
function getLastFeedingTime(babyId: string) {
  try {
    const feedings = store.getBabyFeedings(babyId)
    const solidFoods = store.getBabySolidFoods(babyId)
    
    // Combine feedings and solid foods with their timestamps
    const allFeedingEvents = [
      ...feedings.map(f => ({ ...f, event_time: f.timestamp, event_type: 'feeding' })),
      ...solidFoods.map(sf => ({ ...sf, event_time: sf.last_tried_date, event_type: 'solid', type: 'solid' }))
    ]
    
    if (allFeedingEvents.length === 0) return null

    // Sort by most recent
    allFeedingEvents.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
    
    const lastEvent = allFeedingEvents[0]
    const lastEventTime = new Date(lastEvent.event_time)
    const now = new Date()
    const diffMs = now.getTime() - lastEventTime.getTime()

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
      type: lastEvent.type
    }
  } catch (error) {
    console.error('Error getting last feeding time:', error)
    return null
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

// Get next feeding time based on baby settings (including solid foods)
function getNextFeedingTime(babyId: string) {
  try {
    const settings = store.getBabySettings(babyId)
    if (!settings || settings.feeding_interval_hours <= 0) return null

    const feedings = store.getBabyFeedings(babyId)
    const solidFoods = store.getBabySolidFoods(babyId)
    
    // Combine feedings and solid foods with their timestamps
    const allFeedingEvents = [
      ...feedings.map(f => ({ timestamp: f.timestamp })),
      ...solidFoods.map(sf => ({ timestamp: sf.last_tried_date }))
    ]
    
    if (allFeedingEvents.length === 0) return null

    // Sort by most recent
    allFeedingEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    const lastEvent = allFeedingEvents[0]
    const lastEventTime = new Date(lastEvent.timestamp)
    const nextFeedingTime = new Date(lastEventTime.getTime() + (settings.feeding_interval_hours * 60 * 60 * 1000))
    const now = new Date()

    if (nextFeedingTime <= now) {
      return {
        status: 'overdue',
        time: 'Overdue',
        actualTime: format(nextFeedingTime, 'h:mm a')
      }
    }

    const diffMs = nextFeedingTime.getTime() - now.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    let timeString
    if (hours > 0) {
      timeString = `in ${hours}h ${minutes}m`
    } else {
      timeString = `in ${minutes}m`
    }

    return {
      status: 'upcoming',
      time: timeString,
      actualTime: format(nextFeedingTime, 'h:mm a')
    }
  } catch (error) {
    console.error('Error getting next feeding time:', error)
    return null
  }
}

function handleSleepClick() {
  if (!selectedBaby.value) return
  if (store.isBabySleeping(selectedBaby.value.id)) {
    store.endSleepSession(selectedBaby.value.id)
  } else {
    store.startSleepSession(selectedBaby.value.id)
  }
}


</script>

<template>
  <div class="home-page">
    <!-- Persistent Nursing Indicator -->
    <PersistentNursingIndicator
      v-if="showPersistentIndicator && selectedBaby"
      :baby-id="selectedBaby.id"
      :baby-name="selectedBaby.name"
      :active-session="activeNursingSession"
      @tap="handleIndicatorTap"
    />
    
    <div v-if="isAuthenticated" class="app-content">
      <div class="header">
        <IconButton v-if="store.babies.length === 0" :icon="addBabyIcon" alt="Add Baby" title="Add Baby"
          @click="addBaby" />
        <div class="header-spacer"></div>
        <IconButton :icon="userRoundIcon" alt="Profile" title="Profile" @click="goToProfile" />
      </div>

      <div class="baby-selectors">
        <div v-for="baby in store.babies" :key="baby.id" class="baby-selector"
          :class="{ 'selected': selectedBaby?.id === baby.id }" @click="selectBaby(baby)">
          <SleepingAnimation :is-sleeping="store.isBabySleeping(baby.id)" :size="100">
            <img :src="baby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${baby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`" :alt="baby.name"
              class="baby-photo" />
          </SleepingAnimation>
          <div class="baby-name-container">
            <span class="baby-name">{{ baby.name }}</span>
            <div class="baby-actions">
              <button class="history-icon-btn" @click.stop="goToBabyHistory(baby)">
                <img :src="bookUserIcon" alt="View History" class="history-icon" />
              </button>
            </div>
          </div>
          <div v-if="store.babies.length > 0 && getLastFeedingTime(baby.id)" class="baby-last-feeding">
            <img :src="getFeedingIcon(getLastFeedingTime(baby.id)?.type)" class="feeding-icon" alt="Feeding type" />
            <span class="feeding-time">{{ getLastFeedingTime(baby.id)?.time }}</span>
          </div>
          <div v-if="getNextFeedingTime(baby.id)" class="baby-next-feeding"
            :class="getNextFeedingTime(baby.id)?.status">
            <span class="next-feeding-time">{{ getNextFeedingTime(baby.id)?.time }}</span>
            <span class="next-feeding-actual-time">at {{ getNextFeedingTime(baby.id)?.actualTime }}</span>
          </div>
        </div>
      </div>



      <div v-if="selectedBaby" class="full-history-link-container">
        <button @click="goToHistory" class="btn-link">
          View full history for {{ selectedBaby.name }}
        </button>
      </div>

      <div class="action-grid">
        <button v-if="store.isBabySleeping(selectedBaby?.id)" class="action-btn wake" @click="handleSleepClick()">
          <span>Wake</span>
        </button>
        <button v-else class="action-btn sleep" @click="handleSleepClick()">
          <span>Sleep</span>
        </button>
        <button class="action-btn breast" @click="openFeedingModal('breast')">
          <img src="../assets/icons/lucide-lab_bottle-baby.svg" class="icon" alt="Breast" />
          <span>Breast</span>
        </button>
        <button class="action-btn nursing" @click="openNursingTimerModal()">
          <img src="../assets/icons/lucide-lab_bottle-baby.svg" class="icon" alt="Nursing" />
          <span>Nursing</span>
        </button>
        <button class="action-btn formula" @click="openFeedingModal('formula')">
          <img src="../assets/icons/flask-conical.svg" class="icon" alt="Formula" />
          <span>Formula</span>
        </button>
        <button class="action-btn solid" @click="openSolidFoodModal()">
          <img src="../assets/icons/spoon.svg" class="icon" alt="Solid Food" />
          <span>Solid</span>
        </button>
        <button class="action-btn poop" @click="openDiaperModal('poop')">
          <img src="../assets/icons/hugeicons_poop.svg" class="icon" alt="Poop" />
          <span>Poop</span>
        </button>
        <button class="action-btn pee" @click="openDiaperModal('pee')">
          <img src="../assets/icons/droplets.svg" class="icon" alt="Pee" />
          <span>Pee</span>
        </button>
      </div>

      <HistoryList v-if="selectedBaby" :baby-id="selectedBaby.id" class="mt-8 w-full" />
    </div>
    <div v-else class="auth-section">
      <h2>Welcome to BabyBook</h2>
      <p>Please sign in to start tracking your baby's activities.</p>
      <div class="auth-buttons">
        <button @click="signIn" class="btn btn-primary">Sign In</button>
        <button @click="signUp" class="btn btn-secondary">Sign Up</button>
      </div>
    </div>

    <FeedingModal v-if="showFeedingModal && selectedBaby" :babyId="selectedBaby.id" :babyName="selectedBaby.name"
      :feedingType="feedingType" @close="showFeedingModal = false" />

    <DiaperModal v-if="showDiaperModal && selectedBaby" :babyId="selectedBaby.id" :babyName="selectedBaby.name"
      :diaperType="diaperType" @close="showDiaperModal = false" />

    <NursingTimerModal 
      v-if="selectedBaby"
      :is-open="showNursingTimerModal" 
      :baby-id="selectedBaby.id" 
      :baby-name="selectedBaby.name"
      @close="closeNursingTimerModal"
      @save="handleNursingSave"
    />
    <SolidFoodModal v-if="showSolidFoodModal && selectedBaby" :babyId="selectedBaby.id" :babyName="selectedBaby.name"
      @close="showSolidFoodModal = false" @saved="showSolidFoodModal = false" />
  </div>
</template>

<style scoped>
.home-page {
  background-color: #1a1a2e;
  min-height: 100vh;
  padding: 1rem;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 1rem;
}

.header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-spacer {
  flex: 1;
}

.main-title {
  font-size: clamp(1rem, 2.5vw, 1.5rem);
  font-weight: bold;
  margin: 0;
  text-align: left;
  flex: 1;
}

.baby-selectors {
  display: flex;
  justify-content: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.baby-selector {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding: 1rem;
  border-radius: 1.5rem;
  cursor: pointer;
  background-color: transparent;
  border: 2px solid transparent;
  transition: all 0.2s ease-in-out;
  min-width: 120px;
}

.baby-selector.selected {
  background-color: black;
  border-color: white;
}

.baby-photo {
  width: clamp(80px, 15vw, 100px);
  height: clamp(80px, 15vw, 100px);
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 0.5rem;
}

.baby-name-container {
  display: flex;
  align-items: center;
  justify-content: center;
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
  color: white;
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
  margin-top: 0.5rem;
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
  color: var(--color-periwinkle);
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
  color: black;
  transition: transform 0.2s ease;
  flex: 0 0 auto;
}

.action-btn:hover {
  transform: scale(1.05) translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.icon {
  width: clamp(21px, 5.33vw, 32px);
  height: clamp(21px, 5.33vw, 32px);
  stroke-width: 1;
  flex-shrink: 0;
}

.action-btn.breast {
  background-color: #f5f5dc;
  /* beige */
}

.action-btn.nursing {
  background-color: #dda0dd;
  /* plum */
}

.action-btn.formula {
  background-color: #7fffd4;
  /* aquamarine */
}

.action-btn.solid {
  background-color: #ff6b6b;
  /* coral/red for solid foods */
}

.action-btn.poop {
  background-color: saddlebrown;
  color: white;
}

.action-btn.poop .icon {
  stroke-width: 0;
  fill: white;
}

.action-btn.pee {
  background-color: #ffd700;
  /* gold */
}

.action-btn.wake,
.action-btn.sleep {
  color: white;
}

.action-btn.wake {
  background-color: #05409e;
}

.action-btn.sleep {
  background-color: #090524;
}

.action-btn.sleep .icon {
  filter: brightness(0) invert(1);
  margin-right: 0.5rem;
}

.full-history-link-container {
  margin-bottom: 2rem;
  width: 100%;
  text-align: center;
}

.btn-link {
  background: none;
  border: 1px solid #4a4a7a;
  color: #c0c0ff;
  text-decoration: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  transition: all 0.2s;
}

.btn-link:hover {
  color: white;
  background-color: #4a4a7a;
  border-color: #6a6aff;
}

/* Fallback for auth section if needed */
.auth-section {
  text-align: center;
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.auth-buttons {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  margin: 0;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #9c27b0;
  color: white;
}

.btn-primary:hover {
  background-color: #7b1fa2;
}

.btn-secondary {
  background-color: #9e9e9e;
  color: white;
}

.btn-secondary:hover {
  background-color: #757575;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .home-page {
    padding: 0.5rem;
  }

  .app-content {
    padding: 0 0.5rem;
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
  .home-page {
    padding: 2rem;
  }

  .app-content {
    padding: 0 2rem;
  }

  .baby-selectors {
    gap: 1.5rem;
  }

  .action-grid {
    gap: 1.5rem;
  }
}

.last-feeding-time {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.time-label {
  font-size: 0.9rem;
  color: var(--color-periwinkle);
  margin-right: 0.5rem;
}

.time-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffd700;
}

.baby-next-feeding {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  text-align: center;
}

.baby-next-feeding.upcoming {
  background-color: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.baby-next-feeding.overdue {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.next-feeding-time {
  font-weight: 500;
}

.next-feeding-actual-time {
  font-size: 0.75rem;
  color: var(--color-periwinkle);
  margin-left: 0.5rem;
}

.settings-svg {
  width: 1.5rem;
  height: 1.5rem;
  display: block;
  filter: brightness(0) invert(1);
}

.sleep-indicator {
  margin-left: 0.5rem;
  font-size: 1.2rem;
  vertical-align: middle;
}


</style>