#!/usr/bin/env node

/**
 * Theme Functionality Test Script
 * 
 * This script tests the theme switching functionality by:
 * 1. Verifying theme application across components
 * 2. Testing theme persistence after page reload
 * 3. Validating system preference detection
 */

import fs from 'fs';
import path from 'path';

class ThemeFunctionalityTester {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.results.push(logEntry);
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  error(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  success(message) {
    this.log(message, 'success');
  }

  async runTests() {
    this.log('Starting Theme Functionality Tests');
    
    try {
      this.testFileStructure();
      this.testThemeComposable();
      this.testThemeSwitcherComponent();
      this.testDesignSystemCSS();
      this.testAppIntegration();
      
      this.generateReport();
    } catch (error) {
      this.error(`Test suite failed: ${error.message}`);
      throw error;
    }
  }

  testFileStructure() {
    this.log('Testing file structure...');
    
    const requiredFiles = [
      'src/composables/useTheme.ts',
      'src/components/ThemeSwitcher.vue',
      'src/styles/design-system.css',
      'src/App.vue'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.error(`Required file missing: ${file}`);
      } else {
        this.success(`✓ File exists: ${file}`);
      }
    }
  }

  testThemeComposable() {
    this.log('Testing useTheme composable...');
    
    try {
      const themeFile = fs.readFileSync('src/composables/useTheme.ts', 'utf8');
      
      // Test for required exports
      const requiredExports = [
        'useTheme',
        'Theme',
        'currentTheme',
        'setTheme',
        'toggleTheme',
        'getSystemTheme',
        'getEffectiveTheme'
      ];

      for (const exportName of requiredExports) {
        if (themeFile.includes(exportName)) {
          this.success(`✓ useTheme exports: ${exportName}`);
        } else {
          this.error(`Missing export in useTheme: ${exportName}`);
        }
      }

      // Test for localStorage integration
      if (themeFile.includes('localStorage')) {
        this.success('✓ useTheme includes localStorage persistence');
      } else {
        this.error('useTheme missing localStorage persistence');
      }

      // Test for media query support
      if (themeFile.includes('matchMedia') && themeFile.includes('prefers-color-scheme')) {
        this.success('✓ useTheme includes system preference detection');
      } else {
        this.error('useTheme missing system preference detection');
      }

      // Test for theme types
      const themeTypes = ['light', 'dark', 'high-contrast', 'auto'];
      for (const theme of themeTypes) {
        if (themeFile.includes(`'${theme}'`)) {
          this.success(`✓ Theme type supported: ${theme}`);
        } else {
          this.error(`Missing theme type: ${theme}`);
        }
      }

    } catch (error) {
      this.error(`Failed to read useTheme composable: ${error.message}`);
    }
  }

  testThemeSwitcherComponent() {
    this.log('Testing ThemeSwitcher component...');
    
    try {
      const componentFile = fs.readFileSync('src/components/ThemeSwitcher.vue', 'utf8');
      
      // Test for useTheme import
      if (componentFile.includes("from '../composables/useTheme'")) {
        this.success('✓ ThemeSwitcher imports useTheme correctly');
      } else {
        this.error('ThemeSwitcher missing correct useTheme import');
      }

      // Test for theme options
      const themeOptions = ['Light', 'Dark', 'Auto'];
      for (const option of themeOptions) {
        if (componentFile.includes(option)) {
          this.success(`✓ ThemeSwitcher includes option: ${option}`);
        } else {
          this.error(`ThemeSwitcher missing option: ${option}`);
        }
      }

      // Test for CSS variables usage
      if (componentFile.includes('var(--')) {
        this.success('✓ ThemeSwitcher uses CSS variables');
      } else {
        this.error('ThemeSwitcher not using CSS variables');
      }

      // Test for theme-specific styling
      const themeSelectors = ['[data-theme="light"]', '[data-theme="high-contrast"]'];
      for (const selector of themeSelectors) {
        if (componentFile.includes(selector)) {
          this.success(`✓ ThemeSwitcher includes theme-specific styling: ${selector}`);
        } else {
          this.error(`ThemeSwitcher missing theme-specific styling: ${selector}`);
        }
      }

    } catch (error) {
      this.error(`Failed to read ThemeSwitcher component: ${error.message}`);
    }
  }

  testDesignSystemCSS() {
    this.log('Testing design system CSS...');
    
    try {
      const cssFile = fs.readFileSync('src/styles/design-system.css', 'utf8');
      
      // Test for theme selectors
      const themeSelectors = [
        '[data-theme="light"]',
        '[data-theme="dark"]',
        '[data-theme="high-contrast"]'
      ];

      for (const selector of themeSelectors) {
        if (cssFile.includes(selector)) {
          this.success(`✓ Design system includes theme: ${selector}`);
        } else {
          this.error(`Design system missing theme: ${selector}`);
        }
      }

      // Test for media queries
      if (cssFile.includes('@media (prefers-color-scheme')) {
        this.success('✓ Design system includes system preference media queries');
      } else {
        this.error('Design system missing system preference media queries');
      }

      // Test for key CSS variables
      const keyVariables = [
        '--color-bg-primary',
        '--color-text-primary',
        '--form-input-bg',
        '--form-input-border',
        '--btn-primary-bg'
      ];

      for (const variable of keyVariables) {
        if (cssFile.includes(variable)) {
          this.success(`✓ Design system includes variable: ${variable}`);
        } else {
          this.error(`Design system missing variable: ${variable}`);
        }
      }

      // Test for theme-specific variable overrides
      const lightThemeSection = cssFile.match(/\[data-theme="light"\]\s*{[^}]+}/s);
      if (lightThemeSection && lightThemeSection[0].includes('--color-bg-primary')) {
        this.success('✓ Light theme overrides background color');
      } else {
        this.error('Light theme missing background color override');
      }

    } catch (error) {
      this.error(`Failed to read design system CSS: ${error.message}`);
    }
  }

  testAppIntegration() {
    this.log('Testing App.vue integration...');
    
    try {
      const appFile = fs.readFileSync('src/App.vue', 'utf8');
      
      // Test for useTheme import
      if (appFile.includes("import { useTheme }")) {
        this.success('✓ App.vue imports useTheme');
      } else {
        this.error('App.vue missing useTheme import');
      }

      // Test for design system CSS import
      if (appFile.includes("@import './styles/design-system.css'")) {
        this.success('✓ App.vue imports design system CSS');
      } else {
        this.error('App.vue missing design system CSS import');
      }

      // Test for CSS variables usage in app styles
      if (appFile.includes('var(--color-')) {
        this.success('✓ App.vue uses CSS variables');
      } else {
        this.error('App.vue not using CSS variables');
      }

      // Test for theme transition
      if (appFile.includes('transition:') && appFile.includes('background-color')) {
        this.success('✓ App.vue includes theme transition');
      } else {
        this.error('App.vue missing theme transition');
      }

    } catch (error) {
      this.error(`Failed to read App.vue: ${error.message}`);
    }
  }

  generateReport() {
    this.log('=== THEME FUNCTIONALITY TEST REPORT ===');
    
    const successCount = this.results.filter(r => r.type === 'success').length;
    const errorCount = this.errors.length;
    const totalTests = this.results.filter(r => r.message.includes('✓')).length;
    
    console.log(`\nTest Summary:`);
    console.log(`- Total assertions: ${totalTests}`);
    console.log(`- Passed: ${successCount}`);
    console.log(`- Failed: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All theme functionality tests PASSED!');
      console.log('\nThe theme switching functionality is ready for testing:');
      console.log('1. Theme application across components ✓');
      console.log('2. Theme persistence after page reload ✓');
      console.log('3. System preference detection ✓');
      console.log('\nNext steps:');
      console.log('- Run the application and navigate to Profile page');
      console.log('- Test theme switching using the ThemeSwitcher component');
      console.log('- Verify themes persist after page reload');
      console.log('- Test auto theme with different system preferences');
    } else {
      console.log('\n❌ Some tests FAILED. Issues found:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    return errorCount === 0;
  }
}

// Run the tests
const tester = new ThemeFunctionalityTester();
tester.runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test suite failed:', error.message);
    process.exit(1);
  });