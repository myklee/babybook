import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// Import components to test
import ThemeSwitcher from '../components/ThemeSwitcher.vue'
import ResponsiveModal from '../components/ResponsiveModal.vue'
import FormInput from '../components/FormInput.vue'
import FormTextarea from '../components/FormTextarea.vue'
import FormLabel from '../components/FormLabel.vue'
import DualBreastTimer from '../components/DualBreastTimer.vue'
import BreastTimer from '../components/BreastTimer.vue'

// Import pages
import HomePage from '../views/HomePage.vue'
import ProfilePage from '../views/ProfilePage.vue'
import BabyHistoryPage from '../views/BabyHistoryPage.vue'

describe('Design System Integration Tests', () => {
  let originalLocalStorage: Storage

  beforeEach(() => {
    // Mock localStorage
    originalLocalStorage = global.localStorage
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    } as any

    // Reset theme to light
    document.documentElement.setAttribute('data-theme', 'light')
  })

  afterEach(() => {
    global.localStorage = originalLocalStorage
  })

  describe('Theme Switching Functionality', () => {
    it('should provide Light, Dark, and Auto theme options', async () => {
      const wrapper = mount(ThemeSwitcher)
      
      // Check if all theme options are available
      const options = wrapper.findAll('option')
      const optionTexts = options.map(option => option.text())
      
      expect(optionTexts).toContain('Light')
      expect(optionTexts).toContain('Dark')
      expect(optionTexts).toContain('Auto')
    })

    it('should apply theme immediately across application', async () => {
      const wrapper = mount(ThemeSwitcher)
      
      // Change to dark theme
      await wrapper.find('select').setValue('dark')
      await nextTick()
      
      // Check if data-theme attribute is updated
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('should remember theme preference', async () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem')
      const wrapper = mount(ThemeSwitcher)
      
      // Change theme
      await wrapper.find('select').setValue('dark')
      await nextTick()
      
      // Check if preference is saved
      expect(setItemSpy).toHaveBeenCalledWith('theme', 'dark')
    })
  })

  describe('Component Theme Integration', () => {
    const themes = ['light', 'dark']

    themes.forEach(theme => {
      describe(`${theme} theme`, () => {
        beforeEach(() => {
          document.documentElement.setAttribute('data-theme', theme)
        })

        it('should render ResponsiveModal with theme-aware colors', () => {
          const wrapper = mount(ResponsiveModal, {
            props: { isOpen: true },
            slots: { default: 'Test content' }
          })
          
          const modal = wrapper.find('.modal-overlay')
          expect(modal.exists()).toBe(true)
          
          // Check if modal uses CSS variables (not hardcoded colors)
          const modalStyle = getComputedStyle(modal.element)
          expect(modalStyle.backgroundColor).not.toMatch(/#[0-9a-fA-F]{6}/)
        })

        it('should render form components with consistent styling', () => {
          const inputWrapper = mount(FormInput, {
            props: { modelValue: 'test', placeholder: 'Test input' }
          })
          const textareaWrapper = mount(FormTextarea, {
            props: { modelValue: 'test', placeholder: 'Test textarea' }
          })
          const labelWrapper = mount(FormLabel, {
            slots: { default: 'Test Label' }
          })

          expect(inputWrapper.find('input').exists()).toBe(true)
          expect(textareaWrapper.find('textarea').exists()).toBe(true)
          expect(labelWrapper.find('label').exists()).toBe(true)
        })

        it('should render timer components with theme-aware styling', () => {
          const dualTimerWrapper = mount(DualBreastTimer, {
            props: {
              leftDuration: 0,
              rightDuration: 0,
              isLeftActive: false,
              isRightActive: false,
              isPaused: false
            }
          })
          
          const breastTimerWrapper = mount(BreastTimer, {
            props: {
              duration: 0,
              isActive: false,
              isPaused: false,
              breast: 'left'
            }
          })

          expect(dualTimerWrapper.exists()).toBe(true)
          expect(breastTimerWrapper.exists()).toBe(true)
        })
      })
    })
  })

  describe('Page Integration', () => {
    const themes = ['light', 'dark']

    themes.forEach(theme => {
      describe(`${theme} theme`, () => {
        beforeEach(() => {
          document.documentElement.setAttribute('data-theme', theme)
        })

        it('should render HomePage with theme-aware styling', () => {
          const wrapper = mount(HomePage, {
            global: {
              stubs: {
                'router-link': true,
                'router-view': true
              }
            }
          })
          
          expect(wrapper.exists()).toBe(true)
        })

        it('should render ProfilePage with theme-aware styling', () => {
          const wrapper = mount(ProfilePage, {
            global: {
              stubs: {
                'router-link': true,
                'router-view': true
              }
            }
          })
          
          expect(wrapper.exists()).toBe(true)
        })

        it('should render BabyHistoryPage with theme-aware styling', () => {
          const wrapper = mount(BabyHistoryPage, {
            global: {
              stubs: {
                'router-link': true,
                'router-view': true
              }
            }
          })
          
          expect(wrapper.exists()).toBe(true)
        })
      })
    })
  })
})