// Compatibility layer that makes existing Supabase components work with Cloudflare
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cloudflareAPI, type User, type Baby, type Feeding } from '../lib/cloudflare-client'

export const useBabyStore = defineStore('babyCompat', () => {
  // State that matches the old Supabase store interface
  const currentUser = ref<User | null>(null)
  const babies = ref<Baby[]>([])
  const feedings = ref<Feeding[]>([])
  const diaperChanges = ref<any[]>([])
  const sleepSessions = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties that match old interface
  const isAuthenticated = computed(() => !!currentUser.value)

  // Methods that match the old Supabase store interface
  async function initializeStore() {
    try {
      isLoading.value = true
      currentUser.value = cloudflareAPI.getCurrentUser()
      
      if (currentUser.value) {
        await loadData()
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize'
    } finally {
      isLoading.value = false
    }
  }

  async function loadData() {
    try {
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
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load data'
    }
  }

  async function signIn(email: string, password: string) {
    try {
      isLoading.value = true
      currentUser.value = await cloudflareAPI.login(email, password)
      await loadData()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function signUp(email: string, password: string) {
    try {
      isLoading.value = true
      currentUser.value = await cloudflareAPI.register(email, password)
      await loadData()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Registration failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function addBaby(name: string) {
    try {
      const baby = await cloudflareAPI.createBaby(name, new Date().toISOString().split('T')[0])
      babies.value.push(baby)
      return baby
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add baby'
      throw err
    }
  }

  // Add other methods as needed to match the old interface...
  
  return {
    // State
    currentUser,
    babies,
    feedings,
    diaperChanges,
    sleepSessions,
    isLoading,
    error,
    
    // Computed
    isAuthenticated,
    
    // Methods
    initializeStore,
    loadData,
    signIn,
    signUp,
    addBaby
  }
})