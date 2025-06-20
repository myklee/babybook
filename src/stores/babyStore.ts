import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Baby = Database['public']['Tables']['babies']['Row']
type Feeding = Database['public']['Tables']['feedings']['Row']
type DiaperChange = Database['public']['Tables']['diaper_changes']['Row']
type SleepSession = Database['public']['Tables']['sleep_sessions']['Row']

export const useBabyStore = defineStore('baby', () => {
  const babies = ref<Baby[]>([])
  const feedings = ref<Feeding[]>([])
  const diaperChanges = ref<DiaperChange[]>([])
  const sleepSessions = ref<SleepSession[]>([])
  const isLoading = ref(false)
  const currentUser = ref<any>(null)
  const isDataLoading = ref(false) // Guard to prevent multiple simultaneous loads

  // Initialize store and load data
  async function initializeStore() {
    console.log('Initializing store...')
    try {
      await loadUser()
      if (currentUser.value) {
        console.log('User authenticated, loading data...')
        await loadData()
      } else {
        console.log('No user found, clearing data...')
        babies.value = []
        feedings.value = []
        diaperChanges.value = []
        sleepSessions.value = []
      }
    } catch (error) {
      console.error('Error initializing store:', error)
    }
  }

  // Load current user
  async function loadUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error getting user:', error)
        currentUser.value = null
        return
      }
      
      currentUser.value = user
      console.log('User loaded:', user?.email)
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        currentUser.value = session?.user || null
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Only load data if not already loading
          if (!isDataLoading.value) {
            await loadData()
          }
        } else if (event === 'SIGNED_OUT') {
          babies.value = []
          feedings.value = []
          diaperChanges.value = []
          sleepSessions.value = []
        }
      })
    } catch (error) {
      console.error('Error in loadUser:', error)
      currentUser.value = null
    }
  }

  // Load all data from Supabase
  async function loadData() {
    if (!currentUser.value) {
      console.log('No current user, skipping data load')
      return
    }
    
    // Prevent multiple simultaneous loads
    if (isDataLoading.value) {
      console.log('Data already loading, skipping...')
      return
    }
    
    console.log('Loading data for user:', currentUser.value.email)
    isLoading.value = true
    isDataLoading.value = true
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Data loading timeout, forcing loading state to false')
      isLoading.value = false
      isDataLoading.value = false
    }, 10000) // 10 second timeout
    
    try {
      // Load babies
      console.log('Loading babies...')
      const { data: babiesData, error: babiesError } = await supabase
        .from('babies')
        .select('*')
        .eq('user_id', currentUser.value.id)
        .order('created_at', { ascending: true })

      if (babiesError) {
        console.error('Error loading babies:', babiesError)
        throw babiesError
      }
      babies.value = babiesData || []
      console.log('Loaded babies:', babies.value.length)

      // Load feedings
      console.log('Loading feedings...')
      const { data: feedingsData, error: feedingsError } = await supabase
        .from('feedings')
        .select('*')
        .eq('user_id', currentUser.value.id)
        .order('timestamp', { ascending: false })

      if (feedingsError) {
        console.error('Error loading feedings:', feedingsError)
        throw feedingsError
      }
      feedings.value = feedingsData || []
      console.log('Loaded feedings:', feedings.value.length)

      // Load diaper changes
      console.log('Loading diaper changes...')
      const { data: diaperChangesData, error: diaperChangesError } = await supabase
        .from('diaper_changes')
        .select('*')
        .eq('user_id', currentUser.value.id)
        .order('timestamp', { ascending: false })

      if (diaperChangesError) {
        console.error('Error loading diaper changes:', diaperChangesError)
        throw diaperChangesError
      }
      diaperChanges.value = diaperChangesData || []
      console.log('Loaded diaper changes:', diaperChanges.value.length)

      // Load sleep sessions
      console.log('Loading sleep sessions...')
      try {
        const { data: sleepData, error: sleepError } = await supabase
          .from('sleep_sessions')
          .select('*')
          .eq('user_id', currentUser.value.id)
          .order('start_time', { ascending: false })

        if (sleepError) {
          console.error('Error loading sleep sessions:', sleepError)
          // If table doesn't exist, just skip it
          if (sleepError.message.includes('relation "sleep_sessions" does not exist')) {
            console.log('Sleep sessions table does not exist, skipping...')
            sleepSessions.value = []
          } else {
            throw sleepError
          }
        } else {
          sleepSessions.value = sleepData || []
          console.log('Loaded sleep sessions:', sleepSessions.value.length)
        }
      } catch (sleepTableError) {
        console.error('Sleep sessions table error:', sleepTableError)
        sleepSessions.value = []
      }

      console.log('Data loading complete')
    } catch (error) {
      console.error('Error loading data:', error)
      // Don't clear existing data on error, just log it
    } finally {
      clearTimeout(timeoutId)
      isLoading.value = false
      isDataLoading.value = false
      console.log('Loading state set to false')
    }
  }

  // Add a new baby
  async function addBaby(name: string) {
    if (!currentUser.value) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('babies')
      .insert({
        name,
        user_id: currentUser.value.id
      })
      .select()
      .single()

    if (error) throw error
    
    babies.value.push(data)
    return data
  }

  // Add a new feeding
  async function addFeeding(babyId: string, amount: number, type: Feeding['type'], notes?: string, timestamp?: Date) {
    if (!currentUser.value) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('feedings')
      .insert({
        baby_id: babyId,
        amount,
        type,
        notes: notes || null,
        timestamp: timestamp?.toISOString() || new Date().toISOString(),
        user_id: currentUser.value.id
      })
      .select()
      .single()

    if (error) throw error
    
    feedings.value.unshift(data)
    return data
  }

  // Add a new diaper change
  async function addDiaperChange(babyId: string, type: DiaperChange['type'], notes?: string, timestamp?: Date) {
    if (!currentUser.value) throw new Error('User not authenticated')

    const newChange = {
      baby_id: babyId,
      type,
      notes,
      user_id: currentUser.value.id,
      timestamp: timestamp ? timestamp.toISOString() : new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('diaper_changes')
      .insert([newChange])
      .select()

    if (error) throw error
    
    if (data) {
      diaperChanges.value.push(data[0])
    }
  }

  // Add a new sleep session
  async function addSleepSession(babyId: string, startTime: Date, endTime?: Date, notes?: string) {
    if (!currentUser.value) throw new Error('User not authenticated')
    const { data, error } = await supabase
      .from('sleep_sessions')
      .insert({
        baby_id: babyId,
        start_time: startTime.toISOString(),
        end_time: endTime ? endTime.toISOString() : null,
        notes: notes || null,
        user_id: currentUser.value.id
      })
      .select()
      .single()
    if (error) throw error
    sleepSessions.value.unshift(data)
    return data
  }

  // Update a feeding
  async function updateFeeding(id: string, updates: Partial<Omit<Feeding, 'id' | 'baby_id' | 'user_id' | 'created_at'>>) {
    if (!currentUser.value) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('feedings')
      .update(updates)
      .eq('id', id)
      .eq('user_id', currentUser.value.id)
      .select()
      .single()

    if (error) throw error
    
    const index = feedings.value.findIndex(f => f.id === id)
    if (index !== -1) {
      feedings.value[index] = data
    }
    
    return data
  }

  // Update a diaper change
  async function updateDiaperChange(id: string, updates: Partial<Omit<DiaperChange, 'id' | 'baby_id' | 'user_id' | 'created_at'>>) {
    if (!currentUser.value) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('diaper_changes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', currentUser.value.id)
      .select()
      .single()

    if (error) throw error
    
    const index = diaperChanges.value.findIndex(d => d.id === id)
    if (index !== -1) {
      diaperChanges.value[index] = data
    }
    
    return data
  }

  // Update a sleep session
  async function updateSleepSession(id: string, updates: Partial<Omit<SleepSession, 'id' | 'baby_id' | 'user_id' | 'created_at'>>) {
    if (!currentUser.value) throw new Error('User not authenticated')
    const { data, error } = await supabase
      .from('sleep_sessions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', currentUser.value.id)
      .select()
      .single()
    if (error) throw error
    const index = sleepSessions.value.findIndex(s => s.id === id)
    if (index !== -1) {
      sleepSessions.value[index] = data
    }
    return data
  }

  // Delete a feeding
  async function deleteFeeding(id: string) {
    if (!currentUser.value) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('feedings')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.value.id)

    if (error) throw error
    
    const index = feedings.value.findIndex(f => f.id === id)
    if (index !== -1) {
      feedings.value.splice(index, 1)
    }
    
    return true
  }

  // Delete a diaper change
  async function deleteDiaperChange(id: string) {
    if (!currentUser.value) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('diaper_changes')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.value.id)

    if (error) throw error
    
    const index = diaperChanges.value.findIndex(d => d.id === id)
    if (index !== -1) {
      diaperChanges.value.splice(index, 1)
    }
    
    return true
  }

  // Delete a sleep session
  async function deleteSleepSession(id: string) {
    if (!currentUser.value) throw new Error('User not authenticated')
    const { error } = await supabase
      .from('sleep_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.value.id)
    if (error) throw error
    const index = sleepSessions.value.findIndex(s => s.id === id)
    if (index !== -1) {
      sleepSessions.value.splice(index, 1)
    }
    return true
  }

  // Get feedings for a specific baby
  function getBabyFeedings(babyId: string) {
    return feedings.value
      .filter(f => f.baby_id === babyId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  // Get diaper changes for a specific baby
  function getBabyDiaperChanges(babyId: string) {
    return diaperChanges.value
      .filter(d => d.baby_id === babyId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  // Get sleep sessions for a specific baby
  function getBabySleepSessions(babyId: string) {
    return sleepSessions.value
      .filter(s => s.baby_id === babyId)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
  }

  // Sign in with email/password
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
  }

  // Sign up with email/password
  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password
    })
    if (error) throw error
  }

  // Sign out
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    // State
    babies,
    feedings,
    diaperChanges,
    sleepSessions,
    isLoading,
    currentUser,
    
    // Actions
    initializeStore,
    addBaby,
    addFeeding,
    addDiaperChange,
    addSleepSession,
    updateFeeding,
    updateDiaperChange,
    updateSleepSession,
    deleteFeeding,
    deleteDiaperChange,
    deleteSleepSession,
    getBabyFeedings,
    getBabyDiaperChanges,
    getBabySleepSessions,
    
    // Auth
    signIn,
    signUp,
    signOut
  }
}) 