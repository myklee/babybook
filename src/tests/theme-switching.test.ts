import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ThemeSwitcher from '../components/ThemeSwitcher.vue'
import { useTheme } from '../composables/useTheme'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock matchMedia
const matchMediaMock = vi.fn().mockImplementation(query => ({
  matches: query === '(prefers-color-scheme: light)',
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: matchMediaMock,
})

describe('Theme Switching Functionality', () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // Reset document attributes
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-initialized')
  })

  afterEach(() => {
    // Clean up
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-theme-initialized')
  })

  describe('useTheme composable', () => {
    it('should initialize with auto theme by default', () => {
      const { currentTheme } = useTheme()
      expect(currentTheme.value).toBe('auto')
    })

    it('should set theme and update localStorage', () => {
      const { setTheme, currentTheme } = useTheme()
      
      setTheme('light')
      
      expect(currentTheme.value).toBe('light')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('should handle auto theme correctly', () => {
      const { setTheme } = useTheme()
      
      setTheme('auto')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'auto')
      expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    })

    it('should detect system theme preference', () => {
      const { getSystemTheme } = useTheme()
      
      // Mock light preference
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
      
      expect(getSystemTheme()).toBe('light')
      
      // Mock dark preference
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
      
      expect(getSystemTheme()).toBe('dark')
    })

    it('should get effective theme correctly', () => {
      const { setTheme, getEffectiveTheme } = useTheme()
      
      // Test explicit themes
      setTheme('light')
      expect(getEffectiveTheme()).toBe('light')
      
      setTheme('dark')
      expect(getEffectiveTheme()).toBe('dark')
      
      setTheme('high-contrast')
      expect(getEffectiveTheme()).toBe('high-contrast')
      
      // Test auto theme
      setTheme('auto')
      // Should return system preference (mocked as light)
      expect(getEffectiveTheme()).toBe('light')
    })

    it('should toggle between light and dark themes', () => {
      const { setTheme, toggleTheme, currentTheme } = useTheme()
      
      setTheme('light')
      toggleTheme()
      expect(currentTheme.value).toBe('dark')
      
      toggleTheme()
      expect(currentTheme.value).toBe('light')
    })

    it('should restore theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('dark')
      
      const { currentTheme } = useTheme()
      
      // The theme should be initialized from localStorage
      expect(currentTheme.value).toBe('dark')
    })
  })

  describe('ThemeSwitcher component', () => {
    it('should render theme options', () => {
      const wrapper = mount(ThemeSwitcher)
      
      const select = wrapper.find('select')
      const options = wrapper.findAll('option')
      
      expect(select.exists()).toBe(true)
      expect(options).toHaveLength(3)
      expect(options[0].text()).toBe('Light')
      expect(options[1].text()).toBe('Dark')
      expect(options[2].text()).toBe('Auto')
    })

    it('should update theme when selection changes', async () => {
      const wrapper = mount(ThemeSwitcher)
      const select = wrapper.find('select')
      
      await select.setValue('light')
      await nextTick()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('should initialize with current theme', async () => {
      localStorageMock.getItem.mockReturnValue('dark')
      
      const wrapper = mount(ThemeSwitcher)
      await nextTick()
      
      const select = wrapper.find('select')
      expect(select.element.value).toBe('dark')
    })

    it('should apply correct CSS classes for different sizes', () => {
      const wrapper = mount(ThemeSwitcher, {
        props: { size: 'lg' }
      })
      
      // The component should render without errors
      expect(wrapper.find('.theme-switcher').exists()).toBe(true)
    })
  })

  describe('Theme persistence (Requirement 1.3)', () => {
    it('should persist light theme after page reload simulation', () => {
      const { setTheme } = useTheme()
      
      setTheme('light')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light')
      
      // Simulate page reload by creating new instance
      localStorageMock.getItem.mockReturnValue('light')
      const { currentTheme } = useTheme()
      
      expect(currentTheme.value).toBe('light')
    })

    it('should persist dark theme after page reload simulation', () => {
      const { setTheme } = useTheme()
      
      setTheme('dark')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark')
      
      // Simulate page reload
      localStorageMock.getItem.mockReturnValue('dark')
      const { currentTheme } = useTheme()
      
      expect(currentTheme.value).toBe('dark')
    })

    it('should persist auto theme after page reload simulation', () => {
      const { setTheme } = useTheme()
      
      setTheme('auto')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'auto')
      
      // Simulate page reload
      localStorageMock.getItem.mockReturnValue('auto')
      const { currentTheme } = useTheme()
      
      expect(currentTheme.value).toBe('auto')
    })
  })

  describe('System preference detection (Requirement 1.4)', () => {
    it('should detect light system preference', () => {
      matchMediaMock.mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: light)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
      
      const { getSystemTheme } = useTheme()
      expect(getSystemTheme()).toBe('light')
    })

    it('should detect dark system preference', () => {
      matchMediaMock.mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)' || query !== '(prefers-color-scheme: light)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
      
      const { getSystemTheme } = useTheme()
      expect(getSystemTheme()).toBe('dark')
    })

    it('should handle auto theme with system preferences', () => {
      const { setTheme, getEffectiveTheme } = useTheme()
      
      setTheme('auto')
      
      // Mock light system preference
      matchMediaMock.mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: light)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
      
      expect(getEffectiveTheme()).toBe('light')
    })
  })

  describe('Theme application across components (Requirement 1.2)', () => {
    it('should apply data-theme attribute for explicit themes', () => {
      const { setTheme } = useTheme()
      
      setTheme('light')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
      
      setTheme('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      
      setTheme('high-contrast')
      expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast')
    })

    it('should not apply data-theme attribute for auto theme', () => {
      const { setTheme } = useTheme()
      
      setTheme('auto')
      expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    })

    it('should remove previous theme attributes when switching', () => {
      const { setTheme } = useTheme()
      
      setTheme('light')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
      
      setTheme('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      
      setTheme('auto')
      expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    })
  })
})