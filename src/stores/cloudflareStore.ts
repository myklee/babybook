import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cloudflareAPI, type User, type Baby, type Feeding, type DiaperChange, type SleepSession } from '../lib/cloudflare-client'

export const useCloudflareStore = defineStore('cloudflare', () => {
  // State
  const user = ref<User | null>(null)
  const babies = ref<Baby[]>([])
  const feedings = ref<Feeding[]>([])
  const diaperChanges = ref<DiaperChange[]>([])
  const sleepSessions = ref<SleepSession[]>([])
  const selectedBabyId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const selectedBaby = computed(() => {
    if (!selectedBabyId.value) return null
    return babies.value.find(b => b.id === selectedBabyId.value) || null
  })

  const selectedBabyActivity = computed(() => {
    if (!selectedBaby.value) return []
    
    const activities: Array<{
      id: string
      type: string
      details: string
      timestamp: string
    }> = []
    
    // Add feedings
    feedings.value
      .filter(f => f.baby_id === selectedBaby.value!.id)
      .forEach(f => {
        activities.push({
          id: f.id,
          type: 'Feeding',
          details: `${f.type}${f.amount ? ` - ${f.amount}ml` : ''}${f.topup_amount ? ` + ${f.topup_amount}ml topup` : ''}`,
          timestamp: f.timestamp
        })
      })
    
    // Add diaper changes
    diaperChanges.value
      .filter(d => d.baby_id === selectedBaby.value!.id)
      .forEach(d => {
        activities.push({
          id: d.id,
          type: 'Diaper',
          details: d.type,
          timestamp: d.timestamp
        })
      })
    
    // Add sleep sessions
    sleepSessions.value
      .filter(s => s.baby_id === selectedBaby.value!.id)
      .forEach(s => {
        activities.push({
          id: s.id,
          type: 'Sleep',
          details: s.end_time ? 'Completed' : 'In progress',
          timestamp: s.start_time
        })
      })
    
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20)
  })

  // Actions
  async function initializeStore() {
    try {
      loading.value = true
      error.value = null
      
      // Check if user is already authenticated
      user.value = cloudflareAPI.getCurrentUser()
      
      if (user.value) {
        await loadData()
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize store'
      console.error('Store initialization error:', err)
    } finally {
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    try {
      loading.value = true
      error.value = null
      
      user.value = await cloudflareAPI.login(email, password)
      await loadData()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, password: string) {
    try {
      loading.value = true
      error.value = null
      
      user.value = await cloudflareAPI.register(email, password)
      await loadData()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Registration failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    cloudflareAPI.logout()
    user.value = null
    babies.value = []
    feedings.value = []
    diaperChanges.value = []
    sleepSessions.value = []
    selectedBabyId.value = null
    error.value = null
  }

  async function loadData() {
    try {
      loading.value = true
      const [babiesData, feedingsData, diaperData, sleepData] = await Promise.all([
        cloudflareAPI.getBabies(),
        cloudflareAPI.getFeedings(),
        cloudflareAPI.getDiaperChanges(),
        cloudflareAPI.getSleepSessions()
      ])
      
      babies.value = babiesData
      feedings.value = feedingsData
      diaperChanges.value = diaperData
      sleepSessions.value = sleepData
      
      // Auto-select first baby if none selected
      if (babies.value.length > 0 && !selectedBabyId.value) {
        selectedBabyId.value = babies.value[0].id
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load data'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addBaby(name: string, birthdate: string) {
    try {
      const baby = await cloudflareAPI.createBaby(name, birthdate)
      babies.value.push(baby)
      
      // Auto-select the new baby
      selectedBabyId.value = baby.id
      
      return baby
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add baby'
      throw err
    }
  }

  async function addFeeding(feeding: Omit<Feeding, 'id'>) {
    try {
      const newFeeding = await cloudflareAPI.createFeeding(feeding)
      feedings.value.unshift(newFeeding)
      return newFeeding
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add feeding'
      throw err
    }
  }

  async function addDiaperChange(diaperChange: Omit<DiaperChange, 'id'>) {
    try {
      const newDiaperChange = await cloudflareAPI.createDiaperChange(diaperChange)
      diaperChanges.value.unshift(newDiaperChange)
      return newDiaperChange
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add diaper change'
      throw err
    }
  }

  async function addSleepSession(sleepSession: Omit<SleepSession, 'id'>) {
    try {
      const newSleepSession = await cloudflareAPI.createSleepSession(sleepSession)
      sleepSessions.value.unshift(newSleepSession)
      return newSleepSession
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add sleep session'
      throw err
    }
  }

  function getBabyStats(babyId: string) {
    return {
      feedings: feedings.value.filter(f => f.baby_id === babyId).length,
      diapers: diaperChanges.value.filter(d => d.baby_id === babyId).length,
      sleeps: sleepSessions.value.filter(s => s.baby_id === babyId).length
    }
  }

  function selectBaby(babyId: string) {
    selectedBabyId.value = babyId
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    user,
    babies,
    feedings,
    diaperChanges,
    sleepSessions,
    selectedBabyId,
    loading,
    error,
    
    // Computed
    selectedBaby,
    selectedBabyActivity,
    
    // Actions
    initializeStore,
    login,
    register,
    logout,
    loadData,
    addBaby,
    addFeeding,
    addDiaperChange,
    addSleepSession,
    getBabyStats,
    selectBaby,
    clearError
  }
})