<script setup lang="ts">
import { useBabyStore } from '../stores/babyStore'
import { ref } from 'vue'
import RecordModal from '../components/RecordModal.vue'
import HistoryList from '../components/HistoryList.vue'
import DataManager from '../components/DataManager.vue'

const store = useBabyStore()
const showAddBabyForm = ref(false)
const showDataManager = ref(false)
const newBabyName = ref('')

// Modal state
const showRecordModal = ref(false)
const recordModalType = ref<'feeding' | 'diaper'>('feeding')
const recordModalBabyId = ref('')

function addBaby() {
  if (newBabyName.value.trim()) {
    store.addBaby(newBabyName.value.trim())
    newBabyName.value = ''
    showAddBabyForm.value = false
  }
}

function openRecordModal(babyId: string, type: 'feeding' | 'diaper') {
  recordModalBabyId.value = babyId
  recordModalType.value = type
  showRecordModal.value = true
}

function closeRecordModal() {
  showRecordModal.value = false
}
</script>

<template>
  <div class="homepage">
    <header class="header">
      <h1>Baby Book</h1>
      <div class="header-actions">
        <button 
          class="btn btn-data" 
          @click="showDataManager = !showDataManager"
        >
          {{ showDataManager ? 'Hide' : 'Show' }} Data Manager
        </button>
      </div>
    </header>

    <main class="main">
      <!-- Data Manager Section -->
      <div v-if="showDataManager" class="data-manager-section">
        <DataManager />
      </div>

      <div class="babies-grid">
        <div v-for="baby in store.babies" :key="baby.id" class="baby-card">
          <h2>{{ baby.name }}</h2>
          <div class="actions">
            <button 
              class="btn btn-feeding" 
              @click="openRecordModal(baby.id, 'feeding')"
            >
              Record Feeding
            </button>
            <button 
              class="btn btn-diaper" 
              @click="openRecordModal(baby.id, 'diaper')"
            >
              Record Diaper Change
            </button>
          </div>
          <HistoryList :baby-id="baby.id" />
        </div>
      </div>

      <div class="add-baby">
        <button 
          v-if="!showAddBabyForm" 
          class="btn btn-add" 
          @click="showAddBabyForm = true"
        >
          Add Baby
        </button>
        <div v-else class="add-baby-form">
          <input 
            v-model="newBabyName" 
            type="text" 
            placeholder="Enter baby's name"
            @keyup.enter="addBaby"
          >
          <div class="form-actions">
            <button class="btn btn-add" @click="addBaby">Add</button>
            <button class="btn btn-cancel" @click="showAddBabyForm = false">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Record Modal -->
      <RecordModal
        v-if="showRecordModal"
        :baby-id="recordModalBabyId"
        :type="recordModalType"
        :is-open="showRecordModal"
        @close="closeRecordModal"
        @saved="closeRecordModal"
      />
    </main>
  </div>
</template>

<style scoped>
.homepage {
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

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.data-manager-section {
  margin-bottom: 2rem;
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.add-baby {
  margin-bottom: 1rem;
}

.add-baby-form {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.add-baby-form input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.babies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.baby-card {
  background-color: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.baby-card h2 {
  margin: 0 0 1rem 0;
  color: #333;
}

.actions {
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

.btn-add {
  background-color: #9c27b0;
}

.btn-add:hover {
  background-color: #7b1fa2;
}

.btn-feeding {
  background-color: #2196f3;
}

.btn-feeding:hover {
  background-color: #1976d2;
}

.btn-diaper {
  background-color: #4caf50;
}

.btn-diaper:hover {
  background-color: #388e3c;
}

.btn-cancel {
  background-color: #9e9e9e;
}

.btn-cancel:hover {
  background-color: #757575;
}

.btn-data {
  background-color: #ff9800;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}

.btn-data:hover {
  background-color: #f57c00;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 600px) {
  .header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .babies-grid {
    grid-template-columns: 1fr;
  }
}
</style> 