import { ref, onMounted, onUnmounted } from 'vue'

interface TimerState {
  isActive: boolean
  isPaused: boolean
  startTime: number | null
  pausedDuration: number
  lastPauseStart: number | null
}

interface BackgroundTimerOptions {
  onTick?: (duration: number) => void
  onStateChange?: (state: TimerState) => void
  persistKey?: string
}

export function useBackgroundTimer(options: BackgroundTimerOptions = {}) {
  const { onTick, onStateChange, persistKey } = options
  
  // Timer state
  const state = ref<TimerState>({
    isActive: false,
    isPaused: false,
    startTime: null,
    pausedDuration: 0,
    lastPauseStart: null
  })
  
  const currentDuration = ref(0)
  let intervalId: number | null = null
  let visibilityChangeHandler: (() => void) | null = null
  let beforeUnloadHandler: (() => void) | null = null
  
  // Persistence helpers
  function saveState() {
    if (persistKey) {
      try {
        const stateToSave = {
          ...state.value,
          currentDuration: currentDuration.value,
          timestamp: Date.now()
        }
        
        // Validate state before saving
        if (stateToSave.startTime && isNaN(stateToSave.startTime)) {
          console.warn('Invalid startTime detected, skipping save')
          return
        }
        
        localStorage.setItem(persistKey, JSON.stringify(stateToSave))
      } catch (error) {
        console.warn('Failed to save timer state:', error)
        
        // Try to clear corrupted data
        try {
          localStorage.removeItem(persistKey)
        } catch (clearError) {
          console.warn('Failed to clear corrupted timer state:', clearError)
        }
      }
    }
  }
  
  function loadState(): boolean {
    if (!persistKey) return false
    
    try {
      const saved = localStorage.getItem(persistKey)
      if (!saved) return false
      
      const parsed = JSON.parse(saved)
      const now = Date.now()
      
      // Validate parsed data
      if (typeof parsed !== 'object' || parsed === null) {
        console.warn('Invalid timer state format, clearing')
        clearState()
        return false
      }
      
      // Validate timestamp and prevent future dates
      if (parsed.timestamp && (isNaN(parsed.timestamp) || parsed.timestamp > now)) {
        console.warn('Invalid timestamp in timer state, clearing')
        clearState()
        return false
      }
      
      // Validate durations are reasonable (not negative, not extremely large)
      const maxReasonableDuration = 24 * 60 * 60 // 24 hours in seconds
      if (parsed.pausedDuration && (parsed.pausedDuration < 0 || parsed.pausedDuration > maxReasonableDuration)) {
        console.warn('Invalid paused duration in timer state, clearing')
        clearState()
        return false
      }
      
      // If timer was active when saved, calculate elapsed time
      if (parsed.isActive && !parsed.isPaused && parsed.startTime && parsed.timestamp) {
        const backgroundDuration = Math.floor((now - parsed.timestamp) / 1000)
        
        // Prevent unreasonable background durations (more than 24 hours)
        if (backgroundDuration > maxReasonableDuration) {
          console.warn('Timer was in background too long, resetting')
          clearState()
          return false
        }
        
        parsed.pausedDuration = (parsed.pausedDuration || 0) + backgroundDuration
        parsed.currentDuration = (parsed.currentDuration || 0) + backgroundDuration
      }
      
      // Safely assign state with defaults
      state.value = {
        isActive: Boolean(parsed.isActive),
        isPaused: Boolean(parsed.isPaused),
        startTime: parsed.startTime && !isNaN(parsed.startTime) ? parsed.startTime : null,
        pausedDuration: Math.max(0, parsed.pausedDuration || 0),
        lastPauseStart: parsed.lastPauseStart && !isNaN(parsed.lastPauseStart) ? parsed.lastPauseStart : null
      }
      
      currentDuration.value = Math.max(0, parsed.currentDuration || 0)
      
      return true
    } catch (error) {
      console.warn('Failed to load timer state:', error)
      // Clear potentially corrupted state
      clearState()
      return false
    }
  }
  
  function clearState() {
    if (persistKey) {
      try {
        localStorage.removeItem(persistKey)
      } catch (error) {
        console.warn('Failed to clear timer state:', error)
      }
    }
  }
  
  // Timer calculations
  function calculateCurrentDuration(): number {
    if (!state.value.isActive || !state.value.startTime) {
      return state.value.pausedDuration
    }
    
    const now = Date.now()
    const activeTime = state.value.isPaused && state.value.lastPauseStart
      ? state.value.lastPauseStart - state.value.startTime
      : now - state.value.startTime
    
    return Math.floor(activeTime / 1000) + state.value.pausedDuration
  }
  
  function updateDuration() {
    const newDuration = calculateCurrentDuration()
    if (newDuration !== currentDuration.value) {
      currentDuration.value = newDuration
      onTick?.(newDuration)
    }
  }
  
  function startInterval() {
    if (intervalId) return
    
    intervalId = window.setInterval(() => {
      updateDuration()
      saveState()
    }, 1000)
  }
  
  function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
  
  // Timer controls
  function start() {
    const now = Date.now()
    
    if (!state.value.isActive) {
      // Starting fresh
      state.value.isActive = true
      state.value.isPaused = false
      state.value.startTime = now
      state.value.pausedDuration = 0
      state.value.lastPauseStart = null
      currentDuration.value = 0
    } else if (state.value.isPaused) {
      // Resuming from pause
      if (state.value.lastPauseStart) {
        const pauseDuration = Math.floor((now - state.value.lastPauseStart) / 1000)
        state.value.pausedDuration += pauseDuration
      }
      state.value.isPaused = false
      state.value.lastPauseStart = null
    }
    
    startInterval()
    onStateChange?.(state.value)
    saveState()
  }
  
  function pause() {
    if (!state.value.isActive || state.value.isPaused) return
    
    state.value.isPaused = true
    state.value.lastPauseStart = Date.now()
    
    stopInterval()
    updateDuration() // Final update before pausing
    onStateChange?.(state.value)
    saveState()
  }
  
  function stop() {
    state.value.isActive = false
    state.value.isPaused = false
    state.value.startTime = null
    state.value.pausedDuration = 0
    state.value.lastPauseStart = null
    currentDuration.value = 0
    
    stopInterval()
    onStateChange?.(state.value)
    clearState()
  }
  
  function reset() {
    const wasActive = state.value.isActive && !state.value.isPaused
    
    state.value.startTime = wasActive ? Date.now() : null
    state.value.pausedDuration = 0
    state.value.lastPauseStart = null
    currentDuration.value = 0
    
    onStateChange?.(state.value)
    saveState()
  }
  
  function toggle() {
    if (!state.value.isActive) {
      start()
    } else if (state.value.isPaused) {
      start() // Resume
    } else {
      pause()
    }
  }
  
  // Visibility change handling
  function handleVisibilityChange() {
    if (document.hidden) {
      // App is going to background
      saveState()
    } else {
      // App is coming to foreground
      if (state.value.isActive && !state.value.isPaused) {
        // Recalculate duration after being in background
        updateDuration()
        // Restart interval if it was stopped
        if (!intervalId) {
          startInterval()
        }
      }
    }
  }
  
  // Before unload handling
  function handleBeforeUnload() {
    saveState()
  }
  
  // Lifecycle management
  onMounted(() => {
    // Try to restore previous state
    const restored = loadState()
    
    if (restored && state.value.isActive && !state.value.isPaused) {
      startInterval()
    }
    
    // Set up event listeners for background handling
    visibilityChangeHandler = handleVisibilityChange
    beforeUnloadHandler = handleBeforeUnload
    
    document.addEventListener('visibilitychange', visibilityChangeHandler)
    window.addEventListener('beforeunload', beforeUnloadHandler)
    
    // Handle app state changes (for mobile)
    document.addEventListener('pause', saveState)
    document.addEventListener('resume', () => {
      if (state.value.isActive && !state.value.isPaused) {
        updateDuration()
        startInterval()
      }
    })
  })
  
  onUnmounted(() => {
    // Clean up
    stopInterval()
    saveState()
    
    // Remove event listeners
    if (visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', visibilityChangeHandler)
    }
    if (beforeUnloadHandler) {
      window.removeEventListener('beforeunload', beforeUnloadHandler)
    }
    
    document.removeEventListener('pause', saveState)
    document.removeEventListener('resume', () => {})
  })
  
  return {
    // State - make reactive by returning refs directly
    state,
    currentDuration,
    isActive: () => state.value.isActive,
    isPaused: () => state.value.isPaused,
    
    // Controls
    start,
    pause,
    stop,
    reset,
    toggle,
    
    // Utilities
    saveState,
    loadState,
    clearState,
    calculateCurrentDuration
  }
}