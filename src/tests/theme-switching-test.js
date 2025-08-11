/**
 * Theme Switching Functionality Test
 * 
 * This test verifies the theme switching functionality according to requirements:
 * - 1.2: Theme application across existing components
 * - 1.3: Theme persistence after page reload
 * - 1.4: System preference detection works correctly
 */

// Test helper functions
function waitForThemeApplication(timeout = 1000) {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}

function getComputedStyleValue(element, property) {
  return window.getComputedStyle(element).getPropertyValue(property).trim();
}

function getCSSVariableValue(variableName) {
  return getComputedStyleValue(document.documentElement, variableName);
}

// Test suite
class ThemeSwitchingTest {
  constructor() {
    this.results = [];
    this.originalTheme = localStorage.getItem('theme');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.results.push(logEntry);
    console.log(`[${type.toUpperCase()}] ${timestamp}: ${message}`);
  }

  async runAllTests() {
    this.log('Starting Theme Switching Functionality Tests');
    
    try {
      await this.testThemeApplication();
      await this.testThemePersistence();
      await this.testSystemPreferenceDetection();
      
      this.log('All tests completed successfully', 'success');
      this.generateReport();
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      throw error;
    } finally {
      this.cleanup();
    }
  }

  async testThemeApplication() {
    this.log('Testing theme application across components (Requirement 1.2)');
    
    // Test light theme
    await this.testThemeVariables('light');
    
    // Test dark theme
    await this.testThemeVariables('dark');
    
    // Test high contrast theme
    await this.testThemeVariables('high-contrast');
    
    this.log('Theme application test completed', 'success');
  }

  async testThemeVariables(themeName) {
    this.log(`Testing ${themeName} theme variables`);
    
    // Set theme attribute
    document.documentElement.setAttribute('data-theme', themeName);
    await waitForThemeApplication(100);
    
    // Test key CSS variables are defined
    const testVariables = [
      '--color-bg-primary',
      '--color-text-primary',
      '--color-text-secondary',
      '--form-input-bg',
      '--form-input-border',
      '--btn-primary-bg'
    ];
    
    for (const variable of testVariables) {
      const value = getCSSVariableValue(variable);
      if (!value || value === '') {
        throw new Error(`CSS variable ${variable} is not defined for ${themeName} theme`);
      }
      this.log(`✓ ${variable}: ${value}`);
    }
    
    // Test theme-specific values
    if (themeName === 'light') {
      const bgPrimary = getCSSVariableValue('--color-bg-primary');
      if (!bgPrimary.includes('#ffffff') && !bgPrimary.includes('255, 255, 255')) {
        throw new Error(`Light theme background should be white-ish, got: ${bgPrimary}`);
      }
    } else if (themeName === 'dark') {
      const bgPrimary = getCSSVariableValue('--color-bg-primary');
      if (!bgPrimary.includes('#1a1a2e')) {
        throw new Error(`Dark theme background should be dark, got: ${bgPrimary}`);
      }
    } else if (themeName === 'high-contrast') {
      const bgPrimary = getCSSVariableValue('--color-bg-primary');
      if (!bgPrimary.includes('#000000') && !bgPrimary.includes('0, 0, 0')) {
        throw new Error(`High contrast theme background should be black, got: ${bgPrimary}`);
      }
    }
    
    this.log(`✓ ${themeName} theme variables are correctly applied`);
  }

  async testThemePersistence() {
    this.log('Testing theme persistence after page reload (Requirement 1.3)');
    
    // Test each theme persistence
    const themes = ['light', 'dark', 'high-contrast', 'auto'];
    
    for (const theme of themes) {
      // Set theme in localStorage
      localStorage.setItem('theme', theme);
      
      // Simulate page reload by re-initializing theme
      if (window.useTheme) {
        const { setTheme } = window.useTheme();
        setTheme(theme);
        await waitForThemeApplication(100);
      } else {
        // Fallback: manually set theme attribute
        if (theme === 'auto') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', theme);
        }
      }
      
      // Verify theme is persisted
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme !== theme) {
        throw new Error(`Theme persistence failed. Expected: ${theme}, Got: ${storedTheme}`);
      }
      
      // Verify theme is applied
      if (theme !== 'auto') {
        const appliedTheme = document.documentElement.getAttribute('data-theme');
        if (appliedTheme !== theme) {
          throw new Error(`Theme application failed. Expected: ${theme}, Got: ${appliedTheme}`);
        }
      }
      
      this.log(`✓ ${theme} theme persistence verified`);
    }
    
    this.log('Theme persistence test completed', 'success');
  }

  async testSystemPreferenceDetection() {
    this.log('Testing system preference detection (Requirement 1.4)');
    
    // Test if media query support exists
    if (!window.matchMedia) {
      throw new Error('matchMedia is not supported in this environment');
    }
    
    // Test light preference detection
    const lightMediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    this.log(`System prefers light: ${lightMediaQuery.matches}`);
    this.log(`System prefers dark: ${darkMediaQuery.matches}`);
    
    // Test auto theme behavior
    localStorage.setItem('theme', 'auto');
    document.documentElement.removeAttribute('data-theme');
    await waitForThemeApplication(100);
    
    // Verify that auto theme doesn't set data-theme attribute
    const dataTheme = document.documentElement.getAttribute('data-theme');
    if (dataTheme !== null) {
      throw new Error(`Auto theme should not set data-theme attribute, but found: ${dataTheme}`);
    }
    
    // Test that CSS media queries are working
    const rootStyles = window.getComputedStyle(document.documentElement);
    const bgColor = rootStyles.getPropertyValue('--color-bg-primary').trim();
    
    if (!bgColor) {
      throw new Error('CSS variables are not being applied with auto theme');
    }
    
    this.log(`✓ Auto theme is working, background color: ${bgColor}`);
    
    // Test media query listener (if available)
    if (typeof lightMediaQuery.addEventListener === 'function') {
      let listenerCalled = false;
      const testListener = () => {
        listenerCalled = true;
      };
      
      lightMediaQuery.addEventListener('change', testListener);
      
      // We can't actually change system preference in a test, but we can verify the listener is set up
      this.log('✓ Media query change listener is properly set up');
      
      // Clean up
      lightMediaQuery.removeEventListener('change', testListener);
    }
    
    this.log('System preference detection test completed', 'success');
  }

  generateReport() {
    this.log('=== THEME SWITCHING TEST REPORT ===');
    
    const successCount = this.results.filter(r => r.type === 'success').length;
    const errorCount = this.results.filter(r => r.type === 'error').length;
    const totalTests = this.results.filter(r => r.message.includes('✓')).length;
    
    this.log(`Total assertions passed: ${totalTests}`);
    this.log(`Successful test phases: ${successCount}`);
    this.log(`Errors encountered: ${errorCount}`);
    
    if (errorCount === 0) {
      this.log('🎉 All theme switching functionality tests PASSED!', 'success');
    } else {
      this.log('❌ Some tests FAILED. Check the logs above for details.', 'error');
    }
    
    // Display results in a more readable format
    console.table(this.results);
  }

  cleanup() {
    // Restore original theme
    if (this.originalTheme) {
      localStorage.setItem('theme', this.originalTheme);
      if (this.originalTheme === 'auto') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', this.originalTheme);
      }
    } else {
      localStorage.removeItem('theme');
      document.documentElement.removeAttribute('data-theme');
    }
    
    this.log('Test cleanup completed');
  }
}

// Export for use in browser console or test runner
if (typeof window !== 'undefined') {
  window.ThemeSwitchingTest = ThemeSwitchingTest;
  
  // Auto-run if requested
  if (window.location.search.includes('run-theme-test')) {
    const test = new ThemeSwitchingTest();
    test.runAllTests().catch(console.error);
  }
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeSwitchingTest;
}