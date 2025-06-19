<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import RecordModal from '../components/RecordModal.vue'
import HistoryList from '../components/HistoryList.vue'

const store = useBabyStore()

// State
const newBabyName = ref('')
const selectedBaby = ref<any>(null)
const showRecordModal = ref(false)
const recordType = ref<'feeding' | 'diaper'>('feeding')
const feedingType = ref<'breast' | 'formula' | 'solid'>('breast')
const diaperType = ref<'wet' | 'dirty' | 'both'>('wet')

// Auth state
const isAuthenticated = computed(() => !!store.currentUser)
const isLoading = computed(() => store.isLoading)

// Initialize store on mount
onMounted(async () => {
  await store.initializeStore()
})

// Add a new baby
async function addBaby() {
  if (!newBabyName.value.trim()) return
  
  try {
    await store.addBaby(newBabyName.value.trim())
    newBabyName.value = ''
  } catch (error) {
    console.error('Error adding baby:', error)
    alert('Failed to add baby. Please try again.')
  }
}

// Select a baby
function selectBaby(baby: any) {
  selectedBaby.value = baby
}

// Open record modal
function openRecordModal(type: 'feeding' | 'diaper', feedingTypeParam?: 'breast' | 'formula' | 'solid', diaperTypeParam?: 'wet' | 'dirty' | 'both') {
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
          <span>{{ store.currentUser?.email }}</span>
          <button @click="signOut" class="btn btn-small">Sign Out</button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading">
        Loading...
      </div>

      <!-- Main Content -->
      <div v-else class="main-content">
        <!-- Baby Selection -->
        <div class="baby-selection">
          <h3>Select a Baby</h3>
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

        <!-- Add Baby Form -->
        <div class="add-baby-section">
          <h3>Add New Baby</h3>
          <div class="add-baby-form">
            <input
              v-model="newBabyName"
              @keyup.enter="addBaby"
              placeholder="Baby's name"
              class="baby-name-input"
            >
            <button @click="addBaby" class="btn btn-primary">Add Baby</button>
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
          </div>

          <!-- History -->
          <HistoryList :baby-id="selectedBaby.id" />
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
  background-color: #ff9800;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}

.btn-small:hover {
  background-color: #f57c00;
}

.loading {
  margin-top: 1rem;
  text-align: center;
}
</style> 