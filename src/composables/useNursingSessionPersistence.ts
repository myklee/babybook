import { ref, onMounted, onUnmounted } from 'vue'
import type { BreastType } from '../types/nursing'

// Types for session persistence
export interface PersistedNursingSession {
  id: string
  baby_id: string
  start_time: string
  current_breast: BreastType
  left_duration: number
  right_duration: number
  notes: string
  last_update: string
  device_id: string
  is_active: boolean
}

export interface SessionRecoveryData {
  session_id: string
  recovery_method: 'local_storage' | 'background_timer' | 'user_input'
  data_integrity: 'complete' | 'partial' | 'corrupted'
  recovered_at: string
}

export interface SessionPersistenceState {
  active_sessions: [string, PersistedNursingSession][]
  recovery_data: SessionRecoveryData[]
  last_sync: string
  device_id: string
}

const STORAGE_KEY = 'baby-app-active-nursing-sessions'
const DEVICE_ID_KEY = 'baby-app-device-id'
const MAX_SESSION_AGE_HOURS = 24
const PERSISTENCE_INTERVAL = 5000 // 5 seconds

export function useNursingSessionPersistence() {
  const activeSessions = ref<Map<string, PersistedNursingSession>>(new Map())
  const recoveryData = ref<SessionRecoveryData[]>([])
  const deviceId = ref<string>(generateDeviceId())
  const lastSync = ref<string>(new Date().toISOString())
  
  let persistenceInterval: ReturnType<typeof setInterval> | null = null
  let backgroundTimerInterval: ReturnType<typeof setInterval> | null = null

  // Generate a unique device ID for session ownership
  function generateDeviceId(): string {
    const stored = localStorage.getItem(DEVICE_ID_KEY)
    if (stored) {
      // Validate stored device ID
      if (typeof stored === 'string' && stored.length > 0 && stored.startsWith('device_')) {
        return stored
      }
    }
    
    const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    try {
      localStorage.setItem(DEVICE_ID_KEY, newId)
    } catch (error) {
      console.warn('Failed to save device ID to localStorage:', error)
    }
    return newId
  }

  // Validate session data integrity
  function validateSessionData(session: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Required fields validation
    if (!session.id || typeof session.id !== 'string') {
      errors.push('Invalid or missing session ID')
    }
    if (!session.baby_id || typeof session.baby_id !== 'string') {
      errors.push('Invalid or missing baby ID')
    }
    if (!session.start_time || typeof session.start_time !== 'string') {
      errors.push('Invalid or missing start time')
    }
    if (!session.device_id || typeof session.device_id !== 'string') {
      errors.push('Invalid or missing device ID')
    }

    // Validate timestamps
    if (session.start_time) {
      const startTime = new Date(session.start_time)
      if (isNaN(startTime.getTime())) {
        errors.push('Invalid start time format')
      } else {
        const now = new Date()
        if (startTime > now) {
          errors.push('Start time cannot be in the future')
        }
        
        const hoursAgo = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)
        if (hoursAgo > MAX_SESSION_AGE_HOURS) {
          errors.push(`Session is too old (${Math.floor(hoursAgo)} hours)`)
        }
      }
    }

    if (session.last_update) {
      const lastUpdate = new Date(session.last_update)
      if (isNaN(lastUpdate.getTime())) {
        errors.push('Invalid last update time format')
      }
    }

    // Validate breast selection
    if (session.current_breast && !['left', 'right', 'both'].includes(session.current_breast)) {
      errors.push('Invalid breast selection')
    }

    // Validate durations
    if (typeof session.left_duration !== 'number' || session.left_duration < 0) {
      errors.push('Invalid left duration')
    }
    if (typeof session.right_duration !== 'number' || session.right_duration < 0) {
      errors.push('Invalid right duration')
    }

    // Validate total duration is reasonable (not more than 24 hours)
    const totalDuration = (session.left_duration || 0) + (session.right_duration || 0)
    if (totalDuration > 24 * 60 * 60) { // 24 hours in seconds
      errors.push('Total session duration is unreasonably long')
    }

    // Validate boolean fields
    if (typeof session.is_active !== 'boolean') {
      errors.push('Invalid is_active field')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Persist active sessions to local storage with error handling
  function persistActiveSessions(): boolean {
    try {
      const sessionsData: SessionPersistenceState = {
        active_sessions: Array.from(activeSessions.value.entries()),
        recovery_data: recoveryData.value,
        device_id: deviceId.value,
        last_sync: new Date().toISOString()
      }
      
      // Validate data before saving
      const serializedData = JSON.stringify(sessionsData)
      if (serializedData.length > 5 * 1024 * 1024) { // 5MB limit
        console.warn('Session data too large, skipping persistence')
        return false
      }

      localStorage.setItem(STORAGE_KEY, serializedData)
      lastSync.value = sessionsData.last_sync
      return true
    } catch (error) {
      console.error('Failed to persist active nursing sessions:', error)
      
      // Try to clear potentially corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (clearError) {
        console.warn('Failed to clear corrupted session data:', clearError)
      }
      
      return false
    }
  }

  // Recover active sessions from local storage with comprehensive validation
  function recoverActiveSessions(): { recovered: number; errors: string[] } {
    const errors: string[] = []
    let recoveredCount = 0

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return { recovered: 0, errors: [] }
      }

      const sessionsData = JSON.parse(stored) as SessionPersistenceState
      
      // Validate data structure
      if (!sessionsData || typeof sessionsData !== 'object') {
        errors.push('Invalid session data format')
        localStorage.removeItem(STORAGE_KEY)
        return { recovered: 0, errors }
      }

      if (!Array.isArray(sessionsData.active_sessions)) {
        errors.push('Invalid active sessions format')
        localStorage.removeItem(STORAGE_KEY)
        return { recovered: 0, errors }
      }

      const now = new Date()
      const recoveredSessions = new Map<string, PersistedNursingSession>()

      // Process each session
      for (const [babyId, session] of sessionsData.active_sessions) {
        if (typeof babyId !== 'string' || !session) {
          errors.push(`Invalid session entry for baby ${babyId}`)
          continue
        }

        // Validate session data
        const validation = validateSessionData(session)
        if (!validation.isValid) {
          errors.push(`Session ${session.id || 'unknown'}: ${validation.errors.join(', ')}`)
          
          // Record recovery failure
          recoveryData.value.push({
            session_id: session.id || 'unknown',
            recovery_method: 'local_storage',
            data_integrity: 'corrupted',
            recovered_at: now.toISOString()
          })
          continue
        }

        // Check session age
        const sessionStart = new Date(session.start_time)
        const hoursSinceStart = (now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60)
        
        if (hoursSinceStart > MAX_SESSION_AGE_HOURS) {
          errors.push(`Session ${session.id} is too old (${Math.floor(hoursSinceStart)} hours)`)
          
          recoveryData.value.push({
            session_id: session.id,
            recovery_method: 'local_storage',
            data_integrity: 'corrupted',
            recovered_at: now.toISOString()
          })
          continue
        }

        // Update session with current device ID and timestamp
        const recoveredSession: PersistedNursingSession = {
          ...session,
          device_id: deviceId.value,
          last_update: now.toISOString()
        }

        recoveredSessions.set(babyId, recoveredSession)
        recoveredCount++

        // Record successful recovery
        recoveryData.value.push({
          session_id: session.id,
          recovery_method: 'local_storage',
          data_integrity: 'complete',
          recovered_at: now.toISOString()
        })
      }

      activeSessions.value = recoveredSessions
      
      // Restore previous recovery data if available
      if (Array.isArray(sessionsData.recovery_data)) {
        recoveryData.value = [
          ...recoveryData.value,
          ...sessionsData.recovery_data.filter(rd => 
            rd && typeof rd === 'object' && rd.session_id && rd.recovery_method
          )
        ]
      }

      if (recoveredCount > 0) {
        console.log(`Successfully recovered ${recoveredCount} active nursing sessions`)
        startBackgroundTimer()
      }

      return { recovered: recoveredCount, errors }

    } catch (error) {
      const errorMsg = `Failed to recover active nursing sessions: ${error}`
      errors.push(errorMsg)
      console.error(errorMsg)
      
      // Clear potentially corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (clearError) {
        console.warn('Failed to clear corrupted session data:', clearError)
      }
      
      return { recovered: 0, errors }
    }
  }

  // Clear expired sessions from storage
  function clearExpiredSessions(): number {
    const now = new Date()
    let clearedCount = 0

    activeSessions.value.forEach((session, babyId) => {
      const sessionStart = new Date(session.start_time)
      const hoursSinceStart = (now.getTime() - sessionStart.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceStart > MAX_SESSION_AGE_HOURS) {
        activeSessions.value.delete(babyId)
        clearedCount++
        
        // Record expiration
        recoveryData.value.push({
          session_id: session.id,
          recovery_method: 'local_storage',
          data_integrity: 'corrupted',
          recovered_at: now.toISOString()
        })
        
        console.warn(`Removed expired session: ${session.id} (${Math.floor(hoursSinceStart)} hours old)`)
      }
    })

    if (clearedCount > 0) {
      persistActiveSessions()
    }

    return clearedCount
  }

  // Start background timer for active sessions
  function startBackgroundTimer(): void {
    if (backgroundTimerInterval) return // Already running
    
    backgroundTimerInterval = setInterval(() => {
      updateActiveSessionDurations()
    }, 1000) // Update every second
  }

  // Stop background timer
  function stopBackgroundTimer(): void {
    if (backgroundTimerInterval) {
      clearInterval(backgroundTimerInterval)
      backgroundTimerInterval = null
    }
  }

  // Update durations for all active sessions
  function updateActiveSessionDurations(): void {
    const now = new Date()
    let hasUpdates = false
    
    activeSessions.value.forEach((session) => {
      if (session.is_active) {
        // Update the session's last_update timestamp
        session.last_update = now.toISOString()
        hasUpdates = true
      }
    })

    // Persist updates periodically (not every second to avoid performance issues)
    if (hasUpdates && Date.now() % PERSISTENCE_INTERVAL < 1000) {
      persistActiveSessions()
    }
  }

  // Start periodic persistence
  function startPeriodicPersistence(): void {
    if (persistenceInterval) return // Already running
    
    persistenceInterval = setInterval(() => {
      if (activeSessions.value.size > 0) {
        persistActiveSessions()
      }
    }, PERSISTENCE_INTERVAL)
  }

  // Stop periodic persistence
  function stopPeriodicPersistence(): void {
    if (persistenceInterval) {
      clearInterval(persistenceInterval)
      persistenceInterval = null
    }
  }

  // Add a new active session
  function addActiveSession(session: PersistedNursingSession): boolean {
    // Validate session before adding
    const validation = validateSessionData(session)
    if (!validation.isValid) {
      console.error('Cannot add invalid session:', validation.errors)
      return false
    }

    activeSessions.value.set(session.baby_id, session)
    
    // Start timers if this is the first session
    if (activeSessions.value.size === 1) {
      startBackgroundTimer()
      startPeriodicPersistence()
    }

    persistActiveSessions()
    return true
  }

  // Remove an active session
  function removeActiveSession(babyId: string): boolean {
    const removed = activeSessions.value.delete(babyId)
    
    if (removed) {
      // Stop timers if no more sessions
      if (activeSessions.value.size === 0) {
        stopBackgroundTimer()
        stopPeriodicPersistence()
      }
      
      persistActiveSessions()
    }
    
    return removed
  }

  // Update an active session
  function updateActiveSession(babyId: string, updates: Partial<PersistedNursingSession>): boolean {
    const session = activeSessions.value.get(babyId)
    if (!session) {
      return false
    }

    // Apply updates
    const updatedSession = { ...session, ...updates, last_update: new Date().toISOString() }
    
    // Validate updated session
    const validation = validateSessionData(updatedSession)
    if (!validation.isValid) {
      console.error('Cannot update session with invalid data:', validation.errors)
      return false
    }

    activeSessions.value.set(babyId, updatedSession)
    return true
  }

  // Get active session for a baby
  function getActiveSession(babyId: string): PersistedNursingSession | null {
    return activeSessions.value.get(babyId) || null
  }

  // Get all active sessions
  function getAllActiveSessions(): Map<string, PersistedNursingSession> {
    return new Map(activeSessions.value)
  }

  // Check if there are any active sessions
  function hasActiveSessions(): boolean {
    return activeSessions.value.size > 0
  }

  // Get recovery data for debugging
  function getRecoveryData(): SessionRecoveryData[] {
    return [...recoveryData.value]
  }

  // Clear all data (for logout/reset)
  function clearAllData(): void {
    activeSessions.value.clear()
    recoveryData.value = []
    stopBackgroundTimer()
    stopPeriodicPersistence()
    
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear session storage:', error)
    }
  }

  // Initialize the persistence system
  function initialize(): { recovered: number; errors: string[] } {
    // Generate or load device ID
    deviceId.value = generateDeviceId()
    
    // Recover existing sessions
    const recovery = recoverActiveSessions()
    
    // Clean up expired sessions
    const expired = clearExpiredSessions()
    if (expired > 0) {
      console.log(`Cleared ${expired} expired sessions`)
    }
    
    // Start periodic persistence if we have active sessions
    if (activeSessions.value.size > 0) {
      startPeriodicPersistence()
    }
    
    return recovery
  }

  // Cleanup function
  function cleanup(): void {
    stopBackgroundTimer()
    stopPeriodicPersistence()
    
    // Final persistence before cleanup
    if (activeSessions.value.size > 0) {
      persistActiveSessions()
    }
  }

  // Setup lifecycle hooks
  onMounted(() => {
    initialize()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    activeSessions: activeSessions.value,
    recoveryData: recoveryData.value,
    deviceId: deviceId.value,
    lastSync: lastSync.value,

    // Session management
    addActiveSession,
    removeActiveSession,
    updateActiveSession,
    getActiveSession,
    getAllActiveSessions,
    hasActiveSessions,

    // Persistence
    persistActiveSessions,
    recoverActiveSessions,
    clearExpiredSessions,

    // Background processing
    startBackgroundTimer,
    stopBackgroundTimer,
    updateActiveSessionDurations,

    // Utilities
    validateSessionData,
    getRecoveryData,
    clearAllData,
    initialize,
    cleanup
  }
}