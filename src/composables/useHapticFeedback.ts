import { ref } from 'vue'

interface HapticOptions {
  style?: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid'
  duration?: number
}

export function useHapticFeedback() {
  const isSupported = ref(false)
  
  // Check if haptic feedback is supported
  function checkSupport() {
    // Check for iOS haptic feedback
    if ('navigator' in window && 'vibrate' in navigator) {
      isSupported.value = true
      return true
    }
    
    // Check for Android haptic feedback
    if ('navigator' in window && 'vibrate' in navigator) {
      isSupported.value = true
      return true
    }
    
    // Check for Capacitor haptic feedback
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
      isSupported.value = true
      return true
    }
    
    return false
  }
  
  // Trigger haptic feedback
  async function triggerHaptic(options: HapticOptions = {}) {
    if (!isSupported.value && !checkSupport()) {
      return
    }
    
    try {
      // Try Capacitor haptic feedback first (for mobile apps)
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
        const { Haptics } = window.Capacitor.Plugins
        
        let impactStyle = 'medium'
        switch (options.style) {
          case 'light':
            impactStyle = 'light'
            break
          case 'heavy':
            impactStyle = 'heavy'
            break
          case 'medium':
          default:
            impactStyle = 'medium'
            break
        }
        
        await Haptics.impact({ style: impactStyle })
        return
      }
      
      // Fallback to web vibration API
      if ('navigator' in window && 'vibrate' in navigator) {
        let duration = 50 // Default duration
        
        switch (options.style) {
          case 'light':
            duration = 25
            break
          case 'medium':
            duration = 50
            break
          case 'heavy':
            duration = 100
            break
          default:
            duration = options.duration || 50
            break
        }
        
        navigator.vibrate(duration)
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error)
    }
  }
  
  // Specific haptic patterns for different actions
  function lightTap() {
    return triggerHaptic({ style: 'light' })
  }
  
  function mediumTap() {
    return triggerHaptic({ style: 'medium' })
  }
  
  function heavyTap() {
    return triggerHaptic({ style: 'heavy' })
  }
  
  function success() {
    return triggerHaptic({ style: 'light' })
  }
  
  function error() {
    return triggerHaptic({ style: 'heavy' })
  }
  
  function timerStart() {
    return triggerHaptic({ style: 'medium' })
  }
  
  function timerStop() {
    return triggerHaptic({ style: 'light' })
  }
  
  // Initialize support check
  checkSupport()
  
  return {
    isSupported,
    triggerHaptic,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    error,
    timerStart,
    timerStop,
    checkSupport
  }
}

// Global type declarations for Capacitor
declare global {
  interface Window {
    Capacitor?: {
      Plugins?: {
        Haptics?: {
          impact: (options: { style: any }) => Promise<void>
        }
      }
    }
  }
}