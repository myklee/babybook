<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import FeedingModal from '../components/FeedingModal.vue'
import DiaperModal from '../components/DiaperModal.vue'
import HistoryList from '../components/HistoryList.vue'

const store = useBabyStore()

// State
const selectedBaby = ref<any>(null)
const showFeedingModal = ref(false)
const showDiaperModal = ref(false)
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast')
const diaperType = ref<'wet' | 'dirty' | 'both'>('wet')

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

function openDiaperModal(type: 'wet' | 'dirty' | 'both') {
  diaperType.value = type
  showDiaperModal.value = true
}

// Sign in
async function signIn() {
  const email = prompt('Enter your email:')
  const password = prompt('Enter your password:')
  
  if (email && password) {
    try {
      await store.signIn(email, password)
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
</script>

<template>
  <div class="home-page">
    <div v-if="isAuthenticated" class="app-content">
      <h1 class="main-title">Baby Book</h1>

      <div class="baby-selectors">
        <div
          v-for="baby in store.babies"
          :key="baby.id"
          class="baby-selector"
          :class="{ 'selected': selectedBaby?.id === baby.id }"
          @click="selectBaby(baby)"
        >
          <img :src="`/${encodeURIComponent(baby.name.toLowerCase())}.png`" :alt="baby.name" class="baby-photo" />
          <span class="baby-name">{{ baby.name }}</span>
        </div>
      </div>

      <div class="action-grid">
        <button class="action-btn breast" @click="openFeedingModal('breast')">
          <img src="../assets/icons/flask-conical.svg" class="icon" alt="Breast" />
          <span>Breast</span>
        </button>
        <button class="action-btn formula" @click="openFeedingModal('formula')">
          <img src="../assets/icons/lucide-lab_bottle-baby.svg" class="icon" alt="Formula" />
          <span>Formula</span>
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
  padding: 2rem;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-content {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.main-title {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 2rem;
}

.baby-selectors {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.baby-selector {
  padding: 1rem;
  border-radius: 1.5rem;
  cursor: pointer;
  text-align: center;
  background-color: black;
  border: 2px solid transparent;
  transition: all 0.2s ease-in-out;
}

.baby-selector.selected {
  background-color: #e0e0e0;
  color: #1a1a2e;
}

.baby-photo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 0.5rem;
}

.baby-name {
  font-size: 1.25rem;
  font-weight: 500;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  width: 100%;
}

.action-btn {
  padding: 1.5rem;
  border-radius: 1.5rem;
  border: none;
  font-size: 1.5rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 150px;
  color: black;
}

.icon {
  width: 48px;
  height: 48px;
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

:deep(.history-section h3) {
  color: #a0a0e0;
}

:deep(.history-item) {
  border-bottom-color: #3a3a5e;
}

:deep(.time),
:deep(.amount),
:deep(.notes),
:deep(.empty-state) {
  color: #c0c0ff;
}

:deep(.type) {
  color: white;
}

:deep(.edit-btn) {
  color: white;
  opacity: 0.6;
}
:deep(.edit-btn:hover) {
  background-color: #3a3a5e;
  opacity: 1;
}

/* Fallback for auth section if needed */
.auth-section {
  text-align: center;
}
.auth-buttons {
  margin-top: 1rem;
}
.btn {
  margin: 0 0.5rem;
}
</style> 