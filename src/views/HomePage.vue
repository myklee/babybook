<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '../stores/babyStore'
import FeedingModal from '../components/FeedingModal.vue'
import DiaperModal from '../components/DiaperModal.vue'
import HistoryList from '../components/HistoryList.vue'
import IconButton from '../components/IconButton.vue'
import breastIcon from '../assets/icons/lucide-lab_bottle-baby.svg'
import formulaIcon from '../assets/icons/flask-conical.svg'
import logOutIcon from '../assets/icons/log-out.svg'
import { format } from 'date-fns'

const store = useBabyStore()
const router = useRouter()

// State
const selectedBaby = ref<any>(null)
const showFeedingModal = ref(false)
const showDiaperModal = ref(false)
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast')
const diaperType = ref<'pee' | 'poop' | 'both'>('pee')

// Auth state
const isAuthenticated = computed(() => !!store.currentUser)

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
function openFeedingModal(type: 'breast' | 'formula' | 'solid') {
  feedingType.value = type
  showFeedingModal.value = true
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

// Sign in
async function signIn() {
  const email = prompt('Enter your email:')
  const password = prompt('Enter your password:')
  
  if (email && password) {
    try {
      await store.signIn(email, password)
      // The store will automatically handle loading data via the auth state change listener
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

// Sign out
async function signOut() {
  try {
    await store.signOut()
  } catch (error) {
    console.error('Sign out error:', error)
    alert('Failed to sign out. Please try again.')
  }
}

// Get last feeding time for a specific baby
function getLastFeedingTime(babyId: string) {
  try {
    const feedings = store.getBabyFeedings(babyId)
    if (feedings.length === 0) return null
    
    const lastFeeding = feedings[0]
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
  } catch (error) {
    console.error('Error getting last feeding time:', error)
    return null
  }
}

// Get feeding icon based on type
function getFeedingIcon(type: string | undefined) {
  if (type === 'breast') {
    return breastIcon
  } else if (type === 'formula') {
    return formulaIcon
  }
  return breastIcon // default
}

// Get next feeding time based on baby settings
function getNextFeedingTime(babyId: string) {
  try {
    const settings = store.getBabySettings(babyId)
    if (!settings || settings.feeding_interval_hours <= 0) return null
    
    const feedings = store.getBabyFeedings(babyId)
    if (feedings.length === 0) return null
    
    const lastFeeding = feedings[0]
    const lastFeedingTime = new Date(lastFeeding.timestamp)
    const nextFeedingTime = new Date(lastFeedingTime.getTime() + (settings.feeding_interval_hours * 60 * 60 * 1000))
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
</script>

<template>
  <div class="home-page">
    <div v-if="isAuthenticated" class="app-content">
      <div class="header">
        <IconButton
          :icon="logOutIcon"
          alt="Sign Out"
          title="Sign Out"
          @click="signOut"
        />
      </div>

      <div class="baby-selectors">
        <div
          v-for="baby in store.babies"
          :key="baby.id"
          class="baby-selector"
          :class="{ 'selected': selectedBaby?.id === baby.id }"
          @click="selectBaby(baby)"
        >
          <img 
            :src="baby.image_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${baby.name}`" 
            :alt="baby.name" 
            class="baby-photo" 
          />
          <div class="baby-name-container">
            <span class="baby-name">{{ baby.name }}</span>
            <div class="baby-actions">
              <button class="history-icon-btn" @click.stop="goToBabyHistory(baby)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="9,6 15,12 9,18"/>
                </svg>
              </button>
            </div>
          </div>
          <div v-if="store.babies.length > 0 && getLastFeedingTime(baby.id)" class="baby-last-feeding">
            <img :src="getFeedingIcon(getLastFeedingTime(baby.id)?.type)" class="feeding-icon" alt="Feeding type" />
            <span class="feeding-time">{{ getLastFeedingTime(baby.id)?.time }}</span>
          </div>
          <div v-if="getNextFeedingTime(baby.id)" class="baby-next-feeding" :class="getNextFeedingTime(baby.id)?.status">
            <span class="next-feeding-time">{{ getNextFeedingTime(baby.id)?.time }}</span>
            <span class="next-feeding-actual-time">at {{ getNextFeedingTime(baby.id)?.actualTime }}</span>
          </div>
        </div>
      </div>

      <div v-if="selectedBaby" class="full-history-link-container">
        <button @click="goToHistory" class="btn-link">
          View full history for {{ selectedBaby.name }} &rarr;
        </button>
      </div>

      <div class="action-grid">
        <button class="action-btn breast" @click="openFeedingModal('breast')">
          <img src="../assets/icons/lucide-lab_bottle-baby.svg" class="icon" alt="Breast" />
          <span>Breast</span>
        </button>
        <button class="action-btn formula" @click="openFeedingModal('formula')">
          <img src="../assets/icons/flask-conical.svg" class="icon" alt="Formula" />
          <span>Formula</span>
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

    <FeedingModal
      v-if="showFeedingModal && selectedBaby"
      :babyId="selectedBaby.id"
      :babyName="selectedBaby.name"
      :feedingType="feedingType"
      @close="showFeedingModal = false"
    />

    <DiaperModal
      v-if="showDiaperModal && selectedBaby"
      :babyId="selectedBaby.id"
      :babyName="selectedBaby.name"
      :diaperType="diaperType"
      @close="showDiaperModal = false"
    />

    <!-- Hidden original content for reference or later use -->
    <div style="display: none;">
      <!-- ... (original content can be kept here if needed) ... -->
    </div>
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
  max-width: 600px;
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

.history-icon-btn svg {
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
  color: #a0a0e0;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(0.5rem, 2vw, 1rem);
  width: 100%;
  max-width: 500px;
}

.action-btn {
  padding: clamp(1rem, 3vw, 1.5rem);
  border-radius: 1.5rem;
  border: none;
  font-size: clamp(1rem, 3vw, 1.5rem);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(0.5rem, 2vw, 1rem);
  height: clamp(100px, 25vw, 150px);
  color: black;
  transition: transform 0.2s ease;
}

.action-btn:hover {
  transform: scale(1.05);
}

.icon {
  width: clamp(32px, 8vw, 48px);
  height: clamp(32px, 8vw, 48px);
  stroke-width: 1;
  flex-shrink: 0;
}

.action-btn.breast {
  background-color: #f5f5dc; /* beige */
}

.action-btn.formula {
  background-color: #7fffd4; /* aquamarine */
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
  background-color: #ffd700; /* gold */
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
    padding: 1rem;
    height: 100px;
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
  color: #a0a0e0;
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
  color: #a0a0e0;
  margin-left: 0.5rem;
}

.settings-svg {
  width: 1.5rem;
  height: 1.5rem;
  display: block;
  filter: brightness(0) invert(1);
}
</style> 