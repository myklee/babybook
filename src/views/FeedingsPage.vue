<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '../stores/babyStore'
import { format } from 'date-fns'
import EditRecord from '../components/EditRecord.vue'

const router = useRouter()
const store = useBabyStore()

// State
const selectedBaby = ref<any>(null)
const showEditModal = ref(false)
const editingRecord = ref<any>(null)
const filterType = ref<'all' | 'breast' | 'formula' | 'solid'>('all')
const filterDateRange = ref<'all' | 'today' | 'week' | 'month'>('all')

// Computed properties
const allFeedings = computed(() => {
  if (!selectedBaby.value) return []
  
  let feedings = store.getBabyFeedings(selectedBaby.value.id)
  
  // Filter by type
  if (filterType.value !== 'all') {
    feedings = feedings.filter(f => f.type === filterType.value)
  }
  
  // Filter by date range
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
  
  if (filterDateRange.value === 'today') {
    feedings = feedings.filter(f => new Date(f.timestamp) >= today)
  } else if (filterDateRange.value === 'week') {
    feedings = feedings.filter(f => new Date(f.timestamp) >= weekAgo)
  } else if (filterDateRange.value === 'month') {
    feedings = feedings.filter(f => new Date(f.timestamp) >= monthAgo)
  }
  
  return feedings
})

const totalAmount = computed(() => {
  return allFeedings.value.reduce((total, feeding) => total + feeding.amount + (feeding.topup_amount || 0), 0)
})

const totalByType = computed(() => {
  const totals = { breast: 0, formula: 0, solid: 0 }
  allFeedings.value.forEach(feeding => {
    if (feeding.type === 'breast') {
      totals.breast += feeding.amount + (feeding.topup_amount || 0)
    } else {
      totals[feeding.type] += feeding.amount
    }
  })
  return totals
})

const averageAmount = computed(() => {
  if (allFeedings.value.length === 0) return 0
  return Math.round(totalAmount.value / allFeedings.value.length)
})

// Initialize
onMounted(() => {
  if (store.babies.length > 0 && !selectedBaby.value) {
    selectedBaby.value = store.babies[0]
  }
})

// Functions
function selectBaby(baby: any) {
  selectedBaby.value = baby
}

function openEditModal(record: any) {
  editingRecord.value = record
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingRecord.value = null
}

function goBack() {
  router.push('/')
}

function formatDateTime(dateString: string) {
  return format(new Date(dateString), 'MMM d, yyyy h:mm a')
}
</script>

<template>
  <div class="feedings-page">
    <div class="header">
      <h1>Feeding History</h1>
      <button @click="goBack" class="btn btn-secondary">← Back to Home</button>
    </div>

    <!-- Baby Selection -->
    <div class="baby-selection">
      <h3>Select Baby</h3>
      <div class="baby-list">
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

    <div v-if="selectedBaby" class="content">
      <!-- Filters -->
      <div class="filters">
        <div class="filter-group">
          <label>Type:</label>
          <select v-model="filterType">
            <option value="all">All Types</option>
            <option value="breast">Breast</option>
            <option value="formula">Formula</option>
            <option value="solid">Solid</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Date Range:</label>
          <select v-model="filterDateRange">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="summary-stats">
        <div class="stat-card">
          <h4>Total Feedings</h4>
          <div class="stat-value">{{ allFeedings.length }}</div>
        </div>
        <div class="stat-card">
          <h4>Total Amount</h4>
          <div class="stat-value">{{ totalAmount }}ml</div>
        </div>
        <div class="stat-card">
          <h4>Average Amount</h4>
          <div class="stat-value">{{ averageAmount }}ml</div>
        </div>
      </div>

      <!-- Breakdown by Type -->
      <div class="type-breakdown">
        <h3>Breakdown by Type</h3>
        <div class="breakdown-cards">
          <div class="breakdown-card breast">
            <h4>🍼 Breast</h4>
            <div class="breakdown-value">{{ totalByType.breast }}ml</div>
          </div>
          <div class="breakdown-card formula">
            <h4>🥛 Formula</h4>
            <div class="breakdown-value">{{ totalByType.formula }}ml</div>
          </div>
          <div class="breakdown-card solid">
            <h4>🥄 Solid</h4>
            <div class="breakdown-value">{{ totalByType.solid }}ml</div>
          </div>
        </div>
      </div>

      <!-- Feeding History -->
      <div class="feeding-history">
        <h3>Feeding History</h3>
        <div v-if="allFeedings.length === 0" class="empty-state">
          <p>No feedings found for the selected filters.</p>
        </div>
        <div v-else class="feeding-list">
          <div v-for="feeding in allFeedings" :key="feeding.id" class="feeding-item">
            <div class="feeding-content">
              <div class="feeding-header">
                <div class="feeding-time">{{ formatDateTime(feeding.timestamp) }}</div>
                <div class="feeding-type" :class="feeding.type">{{ feeding.type }}</div>
              </div>
              <div class="feeding-details">
                <span class="feeding-amount">{{ feeding.amount }}ml</span>
                <span v-if="feeding.notes" class="feeding-notes">{{ feeding.notes }}</span>
              </div>
            </div>
            <button 
              class="edit-btn" 
              @click="openEditModal(feeding)"
              title="Edit feeding"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <EditRecord
      v-if="showEditModal && editingRecord"
      :record="editingRecord"
      type="feeding"
      @close="closeEditModal"
      @saved="closeEditModal"
    />
  </div>
</template>

<style scoped>
.feedings-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 1rem;
}

.header {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.header h1 {
  margin: 0;
  color: #333;
}

.baby-selection {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.baby-list {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.baby-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  background-color: #e0e0e0;
  color: #333;
  cursor: pointer;
  transition: background-color 0.2s;
}

.baby-btn.active {
  background-color: #9c27b0;
  color: white;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filters {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
  align-items: center;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 500;
  color: #333;
}

.filter-group select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-card h4 {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}

.type-breakdown {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.breakdown-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.breakdown-card {
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  color: white;
}

.breakdown-card.breast {
  background-color: #ff9800;
}

.breakdown-card.formula {
  background-color: #2196f3;
}

.breakdown-card.solid {
  background-color: #4caf50;
}

.breakdown-card h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.breakdown-value {
  font-size: 1.5rem;
  font-weight: bold;
}

.feeding-history {
  background-color: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.feeding-list {
  margin-top: 1rem;
}

.feeding-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.feeding-item:hover {
  background-color: #f9f9f9;
}

.feeding-item:last-child {
  border-bottom: none;
}

.feeding-content {
  flex: 1;
}

.feeding-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.feeding-time {
  font-weight: 500;
  color: #333;
}

.feeding-type {
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.feeding-type.breast {
  background-color: #fff3e0;
  color: #e65100;
}

.feeding-type.formula {
  background-color: #e3f2fd;
  color: #1565c0;
}

.feeding-type.solid {
  background-color: #e8f5e8;
  color: #2e7d32;
}

.feeding-details {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.feeding-amount {
  font-weight: 500;
  color: #333;
}

.feeding-notes {
  color: #666;
  font-size: 0.875rem;
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.edit-btn:hover {
  background-color: #f5f5f5;
}

.empty-state {
  text-align: center;
  color: #666;
  padding: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
  display: inline-block;
}

.btn-secondary {
  background-color: #2196f3;
}

.btn-secondary:hover {
  background-color: #1976d2;
}

@media (max-width: 768px) {
  .filters {
    flex-direction: column;
    align-items: stretch;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
  
  .breakdown-cards {
    grid-template-columns: 1fr;
  }
  
  .feeding-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style> 