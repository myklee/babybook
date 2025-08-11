/**
 * Theme Performance Testing Utilities
 * 
 * This module provides utilities to test and measure theme switching performance
 * across different devices and scenarios.
 */

export interface PerformanceMetrics {
  themeChangeTime: number
  cssVariableUpdateTime: number
  repaintTime: number
  totalTime: number
  memoryUsage?: number
}

export interface DeviceInfo {
  userAgent: string
  devicePixelRatio: number
  screenWidth: number
  screenHeight: number
  hardwareConcurrency: number
  connection?: {
    effectiveType: string
    downlink: number
  }
}

/**
 * Measure theme switching performance
 */
export const measureThemePerformance = async (
  themeChangeCallback: () => void
): Promise<PerformanceMetrics> => {
  const startTime = performance.now()
  let cssUpdateTime = 0
  let repaintTime = 0

  // Measure CSS variable update time
  const cssStartTime = performance.now()
  themeChangeCallback()
  cssUpdateTime = performance.now() - cssStartTime

  // Wait for repaint and measure
  const repaintStartTime = performance.now()
  await new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        repaintTime = performance.now() - repaintStartTime
        resolve(void 0)
      })
    })
  })

  const totalTime = performance.now() - startTime

  // Get memory usage if available
  let memoryUsage: number | undefined
  if ('memory' in performance) {
    memoryUsage = (performance as any).memory.usedJSHeapSize
  }

  return {
    themeChangeTime: cssUpdateTime,
    cssVariableUpdateTime: cssUpdateTime,
    repaintTime,
    totalTime,
    memoryUsage
  }
}

/**
 * Get device information for performance context
 */
export const getDeviceInfo = (): DeviceInfo => {
  const info: DeviceInfo = {
    userAgent: navigator.userAgent,
    devicePixelRatio: window.devicePixelRatio,
    screenWidth: screen.width,
    screenHeight: screen.height,
    hardwareConcurrency: navigator.hardwareConcurrency
  }

  // Add connection info if available
  if ('connection' in navigator) {
    const connection = (navigator as any).connection
    info.connection = {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink
    }
  }

  return info
}

/**
 * Run comprehensive theme performance tests
 */
export const runThemePerformanceTests = async (
  setTheme: (theme: string) => void
): Promise<{
  deviceInfo: DeviceInfo
  results: Record<string, PerformanceMetrics[]>
}> => {
  const deviceInfo = getDeviceInfo()
  const themes = ['light', 'dark', 'auto']
  const results: Record<string, PerformanceMetrics[]> = {}

  console.log('🚀 Starting theme performance tests...')
  console.log('Device Info:', deviceInfo)

  for (const theme of themes) {
    console.log(`Testing theme: ${theme}`)
    results[theme] = []

    // Run multiple iterations for each theme
    for (let i = 0; i < 5; i++) {
      const metrics = await measureThemePerformance(() => {
        setTheme(theme)
      })
      
      results[theme].push(metrics)
      
      // Wait between tests to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  // Calculate averages
  const averages: Record<string, PerformanceMetrics> = {}
  for (const [theme, measurements] of Object.entries(results)) {
    const avg = measurements.reduce((acc, curr) => ({
      themeChangeTime: acc.themeChangeTime + curr.themeChangeTime,
      cssVariableUpdateTime: acc.cssVariableUpdateTime + curr.cssVariableUpdateTime,
      repaintTime: acc.repaintTime + curr.repaintTime,
      totalTime: acc.totalTime + curr.totalTime,
      memoryUsage: (acc.memoryUsage || 0) + (curr.memoryUsage || 0)
    }), {
      themeChangeTime: 0,
      cssVariableUpdateTime: 0,
      repaintTime: 0,
      totalTime: 0,
      memoryUsage: 0
    })

    const count = measurements.length
    averages[theme] = {
      themeChangeTime: avg.themeChangeTime / count,
      cssVariableUpdateTime: avg.cssVariableUpdateTime / count,
      repaintTime: avg.repaintTime / count,
      totalTime: avg.totalTime / count,
      memoryUsage: avg.memoryUsage ? avg.memoryUsage / count : undefined
    }
  }

  console.log('📊 Performance Test Results:')
  console.table(averages)

  return { deviceInfo, results }
}

/**
 * Check if performance is acceptable
 */
export const isPerformanceAcceptable = (metrics: PerformanceMetrics): boolean => {
  // Theme changes should complete within 100ms for good UX
  const ACCEPTABLE_TOTAL_TIME = 100
  
  // CSS updates should be very fast
  const ACCEPTABLE_CSS_TIME = 50
  
  return (
    metrics.totalTime <= ACCEPTABLE_TOTAL_TIME &&
    metrics.cssVariableUpdateTime <= ACCEPTABLE_CSS_TIME
  )
}

/**
 * Generate performance report
 */
export const generatePerformanceReport = (
  deviceInfo: DeviceInfo,
  results: Record<string, PerformanceMetrics[]>
): string => {
  let report = '# Theme Performance Report\n\n'
  
  report += '## Device Information\n'
  report += `- User Agent: ${deviceInfo.userAgent}\n`
  report += `- Screen: ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}\n`
  report += `- Device Pixel Ratio: ${deviceInfo.devicePixelRatio}\n`
  report += `- CPU Cores: ${deviceInfo.hardwareConcurrency}\n`
  
  if (deviceInfo.connection) {
    report += `- Connection: ${deviceInfo.connection.effectiveType} (${deviceInfo.connection.downlink} Mbps)\n`
  }
  
  report += '\n## Performance Results\n\n'
  
  for (const [theme, measurements] of Object.entries(results)) {
    const avg = measurements.reduce((acc, curr) => ({
      themeChangeTime: acc.themeChangeTime + curr.themeChangeTime,
      cssVariableUpdateTime: acc.cssVariableUpdateTime + curr.cssVariableUpdateTime,
      repaintTime: acc.repaintTime + curr.repaintTime,
      totalTime: acc.totalTime + curr.totalTime
    }), {
      themeChangeTime: 0,
      cssVariableUpdateTime: 0,
      repaintTime: 0,
      totalTime: 0
    })

    const count = measurements.length
    const avgMetrics = {
      themeChangeTime: avg.themeChangeTime / count,
      cssVariableUpdateTime: avg.cssVariableUpdateTime / count,
      repaintTime: avg.repaintTime / count,
      totalTime: avg.totalTime / count
    }
    
    const isAcceptable = isPerformanceAcceptable(avgMetrics)
    const status = isAcceptable ? '✅' : '❌'
    
    report += `### ${theme.charAt(0).toUpperCase() + theme.slice(1)} Theme ${status}\n`
    report += `- Average Total Time: ${avgMetrics.totalTime.toFixed(2)}ms\n`
    report += `- CSS Update Time: ${avgMetrics.cssVariableUpdateTime.toFixed(2)}ms\n`
    report += `- Repaint Time: ${avgMetrics.repaintTime.toFixed(2)}ms\n`
    report += `- Performance: ${isAcceptable ? 'Acceptable' : 'Needs Optimization'}\n\n`
  }
  
  return report
}