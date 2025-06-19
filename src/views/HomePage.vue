<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '../stores/babyStore'
import RecordModal from '../components/RecordModal.vue'
import HistoryList from '../components/HistoryList.vue'

const router = useRouter()
const store = useBabyStore()

// State
const newBabyName = ref('')
const selectedBaby = ref<any>(null)
const showRecordModal = ref(false)
const recordType = ref<'feeding' | 'diaper' | 'sleep'>('feeding')
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast')
const diaperType = ref<'wet' | 'dirty' | 'both'>('wet')
const showAddBabyForm = ref(false)

// Auth state
const isAuthenticated = computed(() => !!store.currentUser)
const isLoading = computed(() => {
  const loading = store.isLoading
  console.log('isLoading computed:', loading)
  return loading
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
})

// Add a new baby
async function addBaby() {
  if (!newBabyName.value.trim()) return
  
  try {
    await store.addBaby(newBabyName.value.trim())
    newBabyName.value = ''
    showAddBabyForm.value = false
  } catch (error) {
    console.error('Error adding baby:', error)
    alert('Failed to add baby. Please try again.')
  }
}

// Toggle add baby form
function toggleAddBabyForm() {
  showAddBabyForm.value = !showAddBabyForm.value
  if (!showAddBabyForm.value) {
    newBabyName.value = ''
  }
}

// Select a baby
function selectBaby(baby: any) {
  selectedBaby.value = baby
}

// Open record modal
function openRecordModal(type: 'feeding' | 'diaper' | 'sleep', feedingTypeParam?: 'breast' | 'formula' | 'solid', diaperTypeParam?: 'wet' | 'dirty' | 'both') {
  if (!selectedBaby.value) {
    alert('Please select a baby first')
    return
  }
  
  recordType.value = type
  if (type === 'feeding' && feedingTypeParam) {
    feedingType.value = feedingTypeParam
  }
  if (type === 'diaper' && diaperTypeParam) {
    diaperType.value = diaperTypeParam
  }
  showRecordModal.value = true
}

// Close record modal
function closeRecordModal() {
  showRecordModal.value = false
}

// Handle record saved
function handleRecordSaved() {
  closeRecordModal()
}

// Navigation functions
function goToFeedings() {
  router.push('/feedings')
}

function goToHistory() {
  router.push('/history')
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

// Sign out
async function signOut() {
  try {
    await store.signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }
}
</script>

<template>
  <div class="home-page">
    <!-- Authentication Section -->
    <div v-if="!isAuthenticated" class="auth-section">
      <h2>Welcome to BabyBook</h2>
      <p>Please sign in to start tracking your baby's activities.</p>
      <div class="auth-buttons">
        <button @click="signIn" class="btn btn-primary">Sign In</button>
        <button @click="signUp" class="btn btn-secondary">Sign Up</button>
      </div>
    </div>

    <!-- Main App Content -->
    <div v-else class="app-content">
      <!-- Header -->
      <div class="header">
        <h1>BabyBook</h1>
        <div class="user-info">
          <button @click="goToHistory" class="btn btn-secondary">📊 Baby History</button>
          <button @click="goToFeedings" class="btn btn-secondary">🍼 Feeding History</button>
          <span>{{ store.currentUser?.email }}</span>
          <button @click="signOut" class="btn btn-small">Sign Out</button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && store.babies.length === 0" class="loading">
        Loading...
      </div>

      <!-- Main Content -->
      <div v-if="!isLoading || store.babies.length > 0" class="main-content">
        <!-- Baby Selection -->
        <div class="baby-selection">
          <div class="baby-selection-header">
            <h3>Select a Baby</h3>
            <button v-if="store.babies.length > 0" @click="toggleAddBabyForm" class="btn btn-add-baby">
              {{ showAddBabyForm ? '✕' : '+' }}
            </button>
          </div>
          <div v-if="store.babies.length === 0" class="empty-state">
            <p>No babies added yet. Add your first baby below.</p>
          </div>
          <div v-else class="baby-list">
            <button
              v-for="baby in store.babies"
              :key="baby.id"
              @click="selectBaby(baby)"
              :class="['baby-btn', { active: selectedBaby?.id === baby.id }]"
            >
              {{ baby.name }}
            </button>
          </div>
        </div>

        <!-- Selected Baby Actions -->
        <div v-if="selectedBaby" class="baby-actions">
          <h3>{{ selectedBaby.name }}'s Activities</h3>
          
          <!-- Quick Action Buttons -->
          <div class="quick-actions">
            <div class="feeding-actions">
              <h4>Feedings</h4>
              <button @click="openRecordModal('feeding', 'breast')" class="btn btn-feeding breast">
                🍼 Breast
              </button>
              <button @click="openRecordModal('feeding', 'formula')" class="btn btn-feeding formula">
                🥛 Formula
              </button>
            </div>
            
            <div class="diaper-actions">
              <h4>Diaper Changes</h4>
              <button @click="openRecordModal('diaper', undefined, 'wet')" class="btn btn-diaper wet">
                💧 Pee
              </button>
              <button @click="openRecordModal('diaper', undefined, 'dirty')" class="btn btn-diaper dirty">
                💩 Poop
              </button>
            </div>
            <div class="sleep-actions">
              <h4>Sleep</h4>
              <button @click="openRecordModal('sleep')" class="btn btn-sleep">
                😴 Record Sleep
              </button>
            </div>
          </div>

          <!-- History -->
          <HistoryList :baby-id="selectedBaby.id" />
        </div>
        <!-- Add Baby Form (show if no babies OR if explicitly toggled) -->
        <div v-if="store.babies.length === 0 || showAddBabyForm" class="add-baby-section">
          <h3 v-if="store.babies.length === 0">Add New Baby</h3>
          <h3 v-else>Add Another Baby</h3>
          <div class="add-baby-form">
            <input
              v-model="newBabyName"
              @keyup.enter="addBaby"
              placeholder="Baby's name"
              class="baby-name-input"
            >
            <button @click="addBaby" class="btn btn-primary">Add Baby</button>
            <button v-if="store.babies.length > 0" @click="toggleAddBabyForm" class="btn btn-cancel">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Record Modal -->
    <RecordModal
      v-if="showRecordModal && selectedBaby"
      :type="recordType"
      :feeding-type="feedingType"
      :diaper-type="diaperType"
      :baby-id="selectedBaby.id"
      @close="closeRecordModal"
      @saved="handleRecordSaved"
    />
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background-color: white;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}

.user-info {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.auth-section {
  margin-bottom: 2rem;
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.auth-buttons {
  display: flex;
  gap: 0.5rem;
}

.app-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.baby-selection {
  margin-bottom: 1rem;
}

.baby-list {
  display: flex;
  gap: 0.5rem;
}

.baby-btn {
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.baby-btn.active {
  background-color: #9c27b0;
}

.add-baby-section {
  margin-bottom: 1rem;
}

.add-baby-form {
  display: flex;
  gap: 0.5rem;
}

.baby-name-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.quick-actions {
  display: flex;
  gap: 0.5rem;
}

.feeding-actions {
  display: flex;
  gap: 0.5rem;
}

.diaper-actions {
  display: flex;
  gap: 0.5rem;
}

.sleep-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn {
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #9c27b0;
}

.btn-primary:hover {
  background-color: #7b1fa2;
}

.btn-secondary {
  background-color: #2196f3;
}

.btn-secondary:hover {
  background-color: #1976d2;
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-add-baby {
  background-color: #4caf50;
  padding: 0.5rem;
  min-width: 40px;
}

.btn-cancel {
  background-color: #666;
}

.btn-cancel:hover {
  background-color: #555;
}

.btn-feeding {
  background-color: #ff9800;
}

.btn-feeding:hover {
  background-color: #f57c00;
}

.btn-feeding.breast {
  background-color: #ff9800;
}

.btn-feeding.formula {
  background-color: #2196f3;
}

.btn-diaper {
  background-color: #4caf50;
}

.btn-diaper:hover {
  background-color: #388e3c;
}

.btn-diaper.wet {
  background-color: #00bcd4;
}

.btn-diaper.dirty {
  background-color: #795548;
}

.btn-sleep {
  background-color: #9c27b0;
}

.btn-sleep:hover {
  background-color: #7b1fa2;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.baby-selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.baby-selection-header h3 {
  margin: 0;
  color: #333;
}

.baby-actions {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.baby-actions h3 {
  margin: 0 0 1rem 0;
  color: #333;
}

.baby-actions h4 {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .user-info {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .feeding-actions,
  .diaper-actions {
    flex-direction: column;
  }
  
  .add-baby-form {
    flex-direction: column;
  }
}
</style> 