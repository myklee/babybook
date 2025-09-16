// Clean Baby Tracker Store - Built for Cloudflare
import { ref, computed, reactive } from 'vue';
import { api, type User, type Baby, type Feeding, type DiaperChange, type SleepSession } from '../lib/cloudflare-api';

// Global reactive state
const user = ref<User | null>(null);
const babies = ref<Baby[]>([]);
const feedings = ref<Feeding[]>([]);
const diaperChanges = ref<DiaperChange[]>([]);
const sleepSessions = ref<SleepSession[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Initialize store
function initialize() {
  user.value = api.getCurrentUser();
  if (user.value) {
    loadData();
  }
}

// Auth functions
async function login(email: string, password: string) {
  try {
    loading.value = true;
    error.value = null;
    
    const loggedInUser = await api.login(email, password);
    user.value = loggedInUser;
    
    await loadData();
    return loggedInUser;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed';
    throw err;
  } finally {
    loading.value = false;
  }
}

async function register(email: string, password: string) {
  try {
    loading.value = true;
    error.value = null;
    
    const newUser = await api.register(email, password);
    user.value = newUser;
    
    await loadData();
    return newUser;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Registration failed';
    throw err;
  } finally {
    loading.value = false;
  }
}

async function logout() {
  await api.logout();
  user.value = null;
  babies.value = [];
  feedings.value = [];
  diaperChanges.value = [];
  sleepSessions.value = [];
}

// Data loading
async function loadData() {
  if (!user.value) return;
  
  try {
    loading.value = true;
    error.value = null;
    
    const [babiesData, feedingsData, diaperData, sleepData] = await Promise.all([
      api.getBabies(),
      api.getFeedings(),
      api.getDiaperChanges(),
      api.getSleepSessions()
    ]);
    
    babies.value = babiesData;
    feedings.value = feedingsData;
    diaperChanges.value = diaperData;
    sleepSessions.value = sleepData;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data';
    console.error('Failed to load data:', err);
  } finally {
    loading.value = false;
  }
}

// Baby functions
async function createBaby(name: string, birthdate: string) {
  try {
    const baby = await api.createBaby(name, birthdate);
    babies.value.push(baby);
    return baby;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create baby';
    throw err;
  }
}

async function updateBaby(id: string, updates: Partial<Baby>) {
  try {
    const updatedBaby = await api.updateBaby(id, updates);
    const index = babies.value.findIndex(b => b.id === id);
    if (index !== -1) {
      babies.value[index] = updatedBaby;
    }
    return updatedBaby;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update baby';
    throw err;
  }
}

async function deleteBaby(id: string) {
  try {
    await api.deleteBaby(id);
    babies.value = babies.value.filter(b => b.id !== id);
    // Also remove related data
    feedings.value = feedings.value.filter(f => f.baby_id !== id);
    diaperChanges.value = diaperChanges.value.filter(d => d.baby_id !== id);
    sleepSessions.value = sleepSessions.value.filter(s => s.baby_id !== id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete baby';
    throw err;
  }
}

// Feeding functions
async function createFeeding(feeding: Omit<Feeding, 'id' | 'user_id' | 'created_at'>) {
  try {
    const newFeeding = await api.createFeeding(feeding);
    feedings.value.unshift(newFeeding); // Add to beginning for chronological order
    return newFeeding;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create feeding';
    throw err;
  }
}

async function updateFeeding(id: string, updates: Partial<Feeding>) {
  try {
    const updatedFeeding = await api.updateFeeding(id, updates);
    const index = feedings.value.findIndex(f => f.id === id);
    if (index !== -1) {
      feedings.value[index] = updatedFeeding;
    }
    return updatedFeeding;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update feeding';
    throw err;
  }
}

async function deleteFeeding(id: string) {
  try {
    await api.deleteFeeding(id);
    feedings.value = feedings.value.filter(f => f.id !== id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete feeding';
    throw err;
  }
}

// Diaper functions
async function createDiaperChange(change: Omit<DiaperChange, 'id' | 'user_id' | 'created_at'>) {
  try {
    const newChange = await api.createDiaperChange(change);
    diaperChanges.value.unshift(newChange);
    return newChange;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create diaper change';
    throw err;
  }
}

async function updateDiaperChange(id: string, updates: Partial<DiaperChange>) {
  try {
    const updatedChange = await api.updateDiaperChange(id, updates);
    const index = diaperChanges.value.findIndex(d => d.id === id);
    if (index !== -1) {
      diaperChanges.value[index] = updatedChange;
    }
    return updatedChange;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update diaper change';
    throw err;
  }
}

async function deleteDiaperChange(id: string) {
  try {
    await api.deleteDiaperChange(id);
    diaperChanges.value = diaperChanges.value.filter(d => d.id !== id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete diaper change';
    throw err;
  }
}

// Sleep functions
async function createSleepSession(session: Omit<SleepSession, 'id' | 'user_id' | 'created_at'>) {
  try {
    const newSession = await api.createSleepSession(session);
    sleepSessions.value.unshift(newSession);
    return newSession;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to create sleep session';
    throw err;
  }
}

async function updateSleepSession(id: string, updates: Partial<SleepSession>) {
  try {
    const updatedSession = await api.updateSleepSession(id, updates);
    const index = sleepSessions.value.findIndex(s => s.id === id);
    if (index !== -1) {
      sleepSessions.value[index] = updatedSession;
    }
    return updatedSession;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to update sleep session';
    throw err;
  }
}

async function deleteSleepSession(id: string) {
  try {
    await api.deleteSleepSession(id);
    sleepSessions.value = sleepSessions.value.filter(s => s.id !== id);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete sleep session';
    throw err;
  }
}

// Computed values
const isAuthenticated = computed(() => !!user.value);
const activeBaby = computed(() => babies.value[0] || null); // For now, use first baby

// Helper functions
function getBabyFeedings(babyId: string) {
  return feedings.value.filter(f => f.baby_id === babyId);
}

function getBabyDiaperChanges(babyId: string) {
  return diaperChanges.value.filter(d => d.baby_id === babyId);
}

function getBabySleepSessions(babyId: string) {
  return sleepSessions.value.filter(s => s.baby_id === babyId);
}

// Export the store
export const useStore = () => ({
  // State
  user: readonly(user),
  babies: readonly(babies),
  feedings: readonly(feedings),
  diaperChanges: readonly(diaperChanges),
  sleepSessions: readonly(sleepSessions),
  loading: readonly(loading),
  error: readonly(error),
  
  // Computed
  isAuthenticated,
  activeBaby,
  
  // Auth functions
  initialize,
  login,
  register,
  logout,
  
  // Data functions
  loadData,
  
  // Baby functions
  createBaby,
  updateBaby,
  deleteBaby,
  
  // Feeding functions
  createFeeding,
  updateFeeding,
  deleteFeeding,
  
  // Diaper functions
  createDiaperChange,
  updateDiaperChange,
  deleteDiaperChange,
  
  // Sleep functions
  createSleepSession,
  updateSleepSession,
  deleteSleepSession,
  
  // Helper functions
  getBabyFeedings,
  getBabyDiaperChanges,
  getBabySleepSessions
});

// Import readonly from vue
import { readonly } from 'vue';