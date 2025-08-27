import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'high-contrast' | 'auto'

// Performance monitoring utilities
const performanceMetrics = {
  themeChangeCount: 0,
  lastThemeChangeTime: 0,
  averageThemeChangeTime: 0
}

// Measure theme change performance
const measureThemeChange = (callback: () => void) => {
  const startTime = performance.now()
  
  callback()
  
  requestAnimationFrame(() => {
    const endTime = performance.now()
    const duration = endTime - startTime
    
    performanceMetrics.themeChangeCount++
    performanceMetrics.lastThemeChangeTime = duration
    performanceMetrics.averageThemeChangeTime = 
      (performanceMetrics.averageThemeChangeTime * (performanceMetrics.themeChangeCount - 1) + duration) / 
      performanceMetrics.themeChangeCount
    
    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Theme change took ${duration.toFixed(2)}ms (avg: ${performanceMetrics.averageThemeChangeTime.toFixed(2)}ms)`)
    }
  })
}

// Reactive theme state
const currentTheme = ref<Theme>('dark')

// Get theme from localStorage or default to 'dark'
const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark'
  
  const stored = localStorage.getItem('theme') as Theme
  return stored && ['light', 'dark', 'high-contrast', 'auto'].includes(stored) 
    ? stored 
    : 'dark'
}

// Apply theme to document with performance optimizations
const applyTheme = (theme: Theme) => {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  
  // Add transitioning class to prevent flicker during theme change
  root.classList.add('theme-transitioning')
  
  // Use requestAnimationFrame to batch DOM updates
  requestAnimationFrame(() => {
    // Remove existing theme attributes
    root.removeAttribute('data-theme')
    
    if (theme === 'auto') {
      // Let CSS media queries handle auto theme
      // The design-system.css has @media (prefers-color-scheme) rules
    } else {
      // Set explicit theme
      root.setAttribute('data-theme', theme)
    }
    
    // Remove transitioning class after a short delay to allow CSS variables to update
    requestAnimationFrame(() => {
      setTimeout(() => {
        root.classList.remove('theme-transitioning')
      }, 50) // Small delay to ensure CSS variables are updated
    })
  })
}

// Initialize theme
const initializeTheme = () => {
  const stored = getStoredTheme()
  currentTheme.value = stored
  applyTheme(stored)
}

// Theme composable
export const useTheme = () => {
  // Initialize on first use
  if (typeof window !== 'undefined' && !document.documentElement.hasAttribute('data-theme-initialized')) {
    initializeTheme()
    document.documentElement.setAttribute('data-theme-initialized', 'true')
  }

  // Watch for theme changes and apply them with performance monitoring
  watch(currentTheme, (newTheme) => {
    if (typeof window !== 'undefined') {
      measureThemeChange(() => {
        localStorage.setItem('theme', newTheme)
        applyTheme(newTheme)
      })
    }
  })

  // Set theme function
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme
  }

  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme = currentTheme.value === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // Get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }

  // Get effective theme (resolves 'auto' to actual theme)
  const getEffectiveTheme = (): 'light' | 'dark' | 'high-contrast' => {
    if (currentTheme.value === 'auto') {
      return getSystemTheme()
    }
    return currentTheme.value as 'light' | 'dark' | 'high-contrast'
  }

  // Check if dark theme is active
  const isDark = () => {
    const effective = getEffectiveTheme()
    return effective === 'dark' || effective === 'high-contrast'
  }

  // Check if light theme is active
  const isLight = () => {
    return getEffectiveTheme() === 'light'
  }

  // Check if high contrast is active
  const isHighContrast = () => {
    return getEffectiveTheme() === 'high-contrast'
  }

  // Get performance metrics
  const getPerformanceMetrics = () => ({
    ...performanceMetrics
  })

  return {
    currentTheme,
    setTheme,
    toggleTheme,
    getSystemTheme,
    getEffectiveTheme,
    isDark,
    isLight,
    isHighContrast,
    getPerformanceMetrics
  }
}

// Listen for system theme changes with debouncing for performance
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  
  const handleSystemThemeChange = () => {
    // Debounce system theme changes to prevent excessive updates
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    
    debounceTimer = setTimeout(() => {
      // Only update if current theme is 'auto'
      if (currentTheme.value === 'auto') {
        applyTheme('auto')
      }
      debounceTimer = null
    }, 100) // 100ms debounce
  }
  
  mediaQuery.addEventListener('change', handleSystemThemeChange)
}