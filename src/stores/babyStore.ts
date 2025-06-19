import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Baby = Database['public']['Tables']['babies']['Row']
type Feeding = Database['public']['Tables']['feedings']['Row']
type DiaperChange = Database['public']['Tables']['diaper_changes']['Row']

export const useBabyStore = defineStore('baby', () => {
  const babies = ref<Baby[]>([])
  const feedings = ref<Feeding[]>([])
  const diaperChanges = ref<DiaperChange[]>([])
  const isLoading = ref(false)
  const currentUser = ref<any>(null)

  // Initialize store and load data
  async function initializeStore() {
    await loadUser()
    if (currentUser.value) {
      await loadData()
    }
  }

  // Load current user
  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    currentUser.value = user
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      currentUser.value = session?.user || null
      if (event === 'SIGNED_IN') {
        await loadData()
      } else if (event === 'SIGNED_OUT') {
        babies.value = []
        feedings.value = []
        diaperChanges.value = []
      }
    })
  }

  // Load all data from Supabase
  async function loadData() {
    if (!currentUser.value) return
    
    isLoading.value = true
    try {
      // Load babies
      const { data: babiesData, error: babiesError } = await supabase
        .from('babies')
        .select('*')
        .eq('user_id', currentUser.value.id)
        .order('created_at', { ascending: true })

      if (babiesError) throw babiesError
      babies.value = babiesData || []

      // Load feedings
      const { data: feedingsData, error: feedingsError } = await supabase
        .from('feedings')
        .select('*')
        .eq('user_id', currentUser.value.id)
        .order('timestamp', { ascending: false })

      if (feedingsError) throw feedingsError
      feedings.value = feedingsData || []

      // Load diaper changes
      const { data: diaperChangesData, error: diaperChangesError } = await supabase
        .from('diaper_changes')
        .select('*')
        .eq('user_id', currentUser.value.id)
        .order('timestamp', { ascending: false })

      if (diaperChangesError) throw diaperChangesError
      diaperChanges.value = diaperChangesData || []

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      isLoading.value = false
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
  async function addDiaperChange(babyId: string, type: DiaperChange['type'], notes?: string) {
    if (!currentUser.value) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('diaper_changes')
      .insert({
        baby_id: babyId,
        type,
        notes: notes || null,
        timestamp: new Date().toISOString(),
        user_id: currentUser.value.id
      })
      .select()
      .single()

    if (error) throw error
    
    diaperChanges.value.unshift(data)
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
    isLoading,
    currentUser,
    
    // Actions
    initializeStore,
    addBaby,
    addFeeding,
    addDiaperChange,
    updateFeeding,
    updateDiaperChange,
    deleteFeeding,
    deleteDiaperChange,
    getBabyFeedings,
    getBabyDiaperChanges,
    
    // Auth
    signIn,
    signUp,
    signOut
  }
}) 