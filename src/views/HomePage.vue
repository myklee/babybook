<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '../stores/babyStore'
import FeedingModal from '../components/FeedingModal.vue'
import DiaperModal from '../components/DiaperModal.vue'
import SolidFoodModal from '../components/SolidFoodModal.vue'
import BabySettingsModal from '../components/BabySettingsModal.vue'
import HistoryList from '../components/HistoryList.vue'
import IconButton from '../components/IconButton.vue'
import SleepingAnimation from '../components/SleepingAnimation.vue'
import NursingTimerModal from '../components/NursingTimerModal.vue'
import PumpingTimerModal from '../components/PumpingTimerModal.vue'
import PersistentNursingIndicator from '../components/PersistentNursingIndicator.vue'
import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import spoonIcon from '../assets/icons/spoon.svg'
import historyIcon from '../assets/icons/history.svg'
import addBabyIcon from '../assets/icons/add-baby.svg'
import userRoundIcon from '../assets/icons/circle-user-round.svg'
import settingsIcon from '../assets/icons/settings-2.svg'
import { format } from 'date-fns'

const store = useBabyStore()
const router = useRouter()

// State
const selectedBaby = ref<any>(null)
const showFeedingModal = ref(false)
const showDiaperModal = ref(false)
const showNursingTimerModal = ref(false)
const showPumpingTimerModal = ref(false)
const showSolidFoodModal = ref(false)
const showBabySettingsModal = ref(false)
const feedingType = ref<'breast' | 'formula'>('breast')
const diaperType = ref<'pee' | 'poop' | 'both'>('pee')

// Auth state
const isAuthenticated = computed(() => {
  const authenticated = !!store.currentUser
  console.log('Authentication state changed:', authenticated, store.currentUser?.email)
  return authenticated
})

// Login form state
const isSigningIn = ref(false)
const isSigningUp = ref(false)
const showSignUp = ref(false)
const loginForm = ref({
  email: '',
  password: '',
  confirmPassword: ''
})
const loginError = ref('')

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

// Open baby settings modal
function openBabySettingsModal() {
  if (!selectedBaby.value) return
  showBabySettingsModal.value = true
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

// Open pumping timer modal
function openPumpingTimerModal() {
  // No baby selection required for pumping - it's account-level
  showPumpingTimerModal.value = true
}

// Close pumping timer modal
function closePumpingTimerModal() {
  showPumpingTimerModal.value = false
}

// Handle pumping session save
function handlePumpingSave(session: any) {
  console.log('Pumping session saved:', session)
  closePumpingTimerModal()
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

// Clear login error when switching between forms
function clearError() {
  loginError.value = ''
}

// Toggle between sign in and sign up
function toggleSignUp() {
  showSignUp.value = !showSignUp.value
  clearError()
  loginForm.value.confirmPassword = ''
}

// Sign in
async function signIn() {
  if (!loginForm.value.email || !loginForm.value.password) {
    loginError.value = 'Please enter both email and password'
    return
  }

  isSigningIn.value = true
  loginError.value = ''

  try {
    await store.signIn(loginForm.value.email, loginForm.value.password)
    
    // Wait a moment for the authentication state to update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Force a router navigation to refresh the page state
    await router.push('/')
  } catch (error) {
    console.error('Sign in error:', error)
    loginError.value = 'Failed to sign in. Please check your credentials.'
  } finally {
    isSigningIn.value = false
  }
}

// Sign up
async function signUp() {
  if (!loginForm.value.email || !loginForm.value.password) {
    loginError.value = 'Please enter both email and password'
    return
  }

  if (loginForm.value.password !== loginForm.value.confirmPassword) {
    loginError.value = 'Passwords do not match'
    return
  }

  if (loginForm.value.password.length < 6) {
    loginError.value = 'Password must be at least 6 characters long'
    return
  }

  isSigningUp.value = true
  loginError.value = ''

  try {
    await store.signUp(loginForm.value.email, loginForm.value.password)
    loginError.value = ''
    // Show success message and switch to sign in
    showSignUp.value = false
    loginForm.value.password = ''
    loginForm.value.confirmPassword = ''
    // Use a positive message instead of alert
    loginError.value = 'Account created! Please check your email to verify your account, then sign in.'
  } catch (error) {
    console.error('Sign up error:', error)
    loginError.value = 'Failed to create account. Please try again.'
  } finally {
    isSigningUp.value = false
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

// Get next feeding time based on baby settings (respects schedule configuration)
function getNextFeedingTime(babyId: string) {
  try {
    // Use the store's getNextFeedingTime method which respects schedule settings
    const nextFeedingTime = store.getNextFeedingTime(babyId)
    if (!nextFeedingTime) return null

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
          <SleepingAnimation :is-sleeping="store.isBabySleeping(baby.id)" :size="80">
            <img :src="baby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${baby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`" :alt="baby.name"
              class="baby-photo" />
          </SleepingAnimation>
          <div class="baby-info">
            <div class="baby-name-container">
              <span class="baby-name">{{ baby.name }}</span>
              <div class="baby-actions">
                <button 
                  v-if="selectedBaby?.id === baby.id" 
                  class="settings-icon-btn" 
                  title="Baby Settings" 
                  @click.stop="openBabySettingsModal()"
                >
                  <img :src="settingsIcon" alt="Baby Settings" class="settings-icon" />
                </button>
                <button class="history-icon-btn" title="View History" @click.stop="goToBabyHistory(baby)">
                  <img :src="historyIcon" alt="View History" class="history-icon" />
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
        <button 
          class="action-btn pump" 
          @click="openPumpingTimerModal()"
          aria-label="Start pumping timer to track breast milk pumping session"
        >
          <img src="../assets/icons/droplets.svg" class="icon" alt="" aria-hidden="true" />
          <span>Pump</span>
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
      <div class="auth-container">
        <h2>Welcome to BabyBook</h2>
        <p v-if="!showSignUp">Please sign in to start tracking your baby's activities.</p>
        <p v-else>Create your account to get started with BabyBook.</p>
        
        <form @submit.prevent="showSignUp ? signUp() : signIn()" class="auth-form">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              type="email"
              v-model="loginForm.email"
              placeholder="Enter your email"
              required
              :disabled="isSigningIn || isSigningUp"
              @input="clearError"
            />
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              v-model="loginForm.password"
              placeholder="Enter your password"
              required
              :disabled="isSigningIn || isSigningUp"
              @input="clearError"
            />
          </div>
          
          <div v-if="showSignUp" class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              v-model="loginForm.confirmPassword"
              placeholder="Confirm your password"
              required
              :disabled="isSigningIn || isSigningUp"
              @input="clearError"
            />
          </div>
          
          <div v-if="loginError" class="error-message" :class="{ 'success-message': loginError.includes('Account created') }">
            {{ loginError }}
          </div>
          
          <div class="auth-buttons">
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="isSigningIn || isSigningUp"
            >
              <span v-if="showSignUp">
                {{ isSigningUp ? 'Creating Account...' : 'Create Account' }}
              </span>
              <span v-else>
                {{ isSigningIn ? 'Signing In...' : 'Sign In' }}
              </span>
            </button>
            
            <button 
              type="button" 
              class="btn btn-secondary" 
              @click="toggleSignUp"
              :disabled="isSigningIn || isSigningUp"
            >
              {{ showSignUp ? 'Back to Sign In' : 'Create Account' }}
            </button>
          </div>
        </form>
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

    <PumpingTimerModal 
      :is-open="showPumpingTimerModal" 
      :baby-id="selectedBaby?.id || null"
      @close="closePumpingTimerModal"
      @save="handlePumpingSave"
    />

    <SolidFoodModal v-if="showSolidFoodModal && selectedBaby" :babyId="selectedBaby.id" :babyName="selectedBaby.name"
      @close="showSolidFoodModal = false" @saved="showSolidFoodModal = false" />

    <BabySettingsModal 
      v-if="showBabySettingsModal && selectedBaby"
      :baby-id="selectedBaby.id"
      :baby-name="selectedBaby.name"
      @close="showBabySettingsModal = false"
      @saved="showBabySettingsModal = false"
    />
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
  padding:1rem;
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

.history-icon-btn,
.settings-icon-btn {
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

.history-icon-btn:hover,
.settings-icon-btn:hover {
  opacity: 1;
}

.history-icon,
.settings-icon {
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

.action-btn.nursing {
  background-color: var(--color-feeding-nursing);
  color: #2d2d2d;
}

.action-btn.pump {
  background-color: var(--color-feeding-pump);
  color: #ffffff;
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

.action-btn.wake {
  background-color: var(--color-sleep-wake);
  color: #ffffff;
}

.action-btn.sleep {
  background-color: var(--color-sleep-sleep);
  color: #ffffff;
}

/* Icon color adjustments for better contrast */
.action-btn.breast .icon,
.action-btn.nursing .icon,
.action-btn.formula .icon,
.action-btn.pee .icon {
  filter: brightness(0) saturate(100%) invert(0%);
}

.action-btn.pump .icon,
.action-btn.solid .icon,
.action-btn.poop .icon,
.action-btn.wake .icon,
.action-btn.sleep .icon {
  filter: brightness(0) invert(1);
}

.action-btn.sleep .icon {
  margin-right: 0.5rem;
}

.full-history-link-container {
  margin-bottom: 2rem;
  width: 100%;
  text-align: center;
}

.btn-link {
  background: none;
  border: 1px solid var(--color-surface-border);
  color: var(--color-text-accent);
  text-decoration: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  transition: all 0.2s;
}

.btn-link:hover {
  color: var(--color-text-primary);
  background-color: var(--color-surface-hover);
  border-color: var(--color-surface-border-hover);
}

/* Auth section styling */
.auth-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem 1rem;
}

.auth-container {
  background: var(--color-surface);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid var(--color-surface-border);
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.auth-container h2 {
  margin: 0 0 1rem 0;
  color: var(--color-text-secondary);
  font-size: 1.75rem;
  font-weight: 600;
}

.auth-container p {
  color: var(--color-text-accent);
  margin-bottom: 2rem;
  font-size: 1rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.75rem;
  color: var(--form-label-text);
  font-weight: 500;
  font-size: 0.95rem;
}

.form-group input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid var(--form-input-border);
  border-radius: 15px;
  background-color: var(--form-input-bg);
  color: var(--form-input-text);
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--form-input-border-focus);
  background-color: var(--form-input-bg-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.form-group input::placeholder {
  color: var(--form-input-placeholder);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  text-align: center;
  background: var(--color-error-bg);
  color: var(--color-error);
  border: 1px solid var(--color-error-border);
}

.success-message {
  background: var(--color-success-bg);
  color: var(--color-success);
  border-color: var(--color-success-border);
}

.auth-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.btn {
  margin: 0;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
  width: 100%;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  box-shadow: 0 4px 12px var(--btn-primary-shadow);
}

.btn-primary:hover:not(:disabled) {
  background: var(--btn-primary-bg-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--btn-primary-shadow-hover);
}

.btn-secondary {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  border: 2px solid var(--btn-secondary-border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--btn-secondary-bg-hover);
  color: var(--btn-secondary-text-hover);
  border-color: var(--btn-secondary-border-hover);
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

.last-feeding-time {
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  text-align: center;
  border: 1px solid var(--color-surface-border);
}

.time-label {
  font-size: 0.9rem;
  color: var(--color-text-accent);
  margin-right: 0.5rem;
}

.time-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-warning);
}

.baby-next-feeding {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  text-align: center;
}

.baby-next-feeding.upcoming {
  background-color: var(--color-success-bg);
  color: var(--color-success);
}

.baby-next-feeding.overdue {
  background-color: var(--color-error-bg);
  color: var(--color-error);
}

.next-feeding-time {
  font-weight: 500;
}

.next-feeding-actual-time {
  font-size: 0.75rem;
  color: var(--color-text-accent);
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