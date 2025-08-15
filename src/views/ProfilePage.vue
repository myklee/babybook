<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBabyStore } from '../stores/babyStore'
import IconButton from '../components/IconButton.vue'
import EditBabyModal from '../components/EditBabyModal.vue'
import BabySettingsModal from '../components/BabySettingsModal.vue'
import ThemeSwitcher from '../components/ThemeSwitcher.vue'
import arrowBigLeftIcon from '../assets/icons/arrow-big-left.svg'
import addBabyIcon from '../assets/icons/add-baby.svg'
import pencilIcon from '../assets/icons/lucide_pencil.svg'
import settingsIcon from '../assets/icons/settings-2.svg'

const router = useRouter()
const store = useBabyStore()

// State
const email = ref('')
const newEmail = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isUpdatingEmail = ref(false)
const isUpdatingPassword = ref(false)
const showEditBabyModal = ref(false)
const showBabySettingsModal = ref(false)
const editingBaby = ref<any>(null)
const settingsBaby = ref<any>(null)
const isUpdatingMeasurementUnit = ref(false)

onMounted(() => {
  if (store.currentUser) {
    email.value = store.currentUser.email || ''
    newEmail.value = email.value
  }
})

function goHome() {
  router.push('/')
}

function openEditBabyModal(baby: any) {
  editingBaby.value = baby
  showEditBabyModal.value = true
}

function onModalSaved() {
  showEditBabyModal.value = false
  editingBaby.value = null
}

function openBabySettingsModal(baby: any) {
  settingsBaby.value = baby
  showBabySettingsModal.value = true
}

function onSettingsSaved() {
  showBabySettingsModal.value = false
  settingsBaby.value = null
}

async function addBaby() {
  const name = prompt('Enter baby name:')
  if (name && name.trim()) {
    try {
      await store.addBaby(name.trim())
    } catch (error) {
      console.error('Error adding baby:', error)
      alert('Failed to add baby. Please try again.')
    }
  }
}

async function updateEmail() {
  if (!newEmail.value.trim() || newEmail.value === email.value) return
  
  isUpdatingEmail.value = true
  try {
    // Note: This would require implementing email update in the store
    // For now, we'll just show a placeholder
    alert('Email update functionality would be implemented here')
    email.value = newEmail.value
  } catch (error) {
    console.error('Error updating email:', error)
    alert('Failed to update email. Please try again.')
  } finally {
    isUpdatingEmail.value = false
  }
}

async function updatePassword() {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    alert('Please fill in all password fields.')
    return
  }
  
  if (newPassword.value !== confirmPassword.value) {
    alert('New passwords do not match.')
    return
  }
  
  if (newPassword.value.length < 6) {
    alert('Password must be at least 6 characters long.')
    return
  }
  
  isUpdatingPassword.value = true
  try {
    // Note: This would require implementing password update in the store
    // For now, we'll just show a placeholder
    alert('Password update functionality would be implemented here')
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (error) {
    console.error('Error updating password:', error)
    alert('Failed to update password. Please try again.')
  } finally {
    isUpdatingPassword.value = false
  }
}

async function updateMeasurementUnit(unit: 'metric' | 'imperial') {
  if (store.measurementUnit === unit) return
  
  isUpdatingMeasurementUnit.value = true
  try {
    await store.updateMeasurementUnit(unit)
  } catch (error) {
    console.error('Error updating measurement unit:', error)
    alert('Failed to update measurement unit. Please try again.')
  } finally {
    isUpdatingMeasurementUnit.value = false
  }
}

async function signOut() {
  try {
    await store.signOut()
    // Always redirect to home page, even if there was an error
    router.push('/')
  } catch (error) {
    console.error('Sign out error:', error)
    // Don't show error alert for sign out - just redirect
    // The store will have cleared local state anyway
    router.push('/')
  }
}
</script>

<template>
  <div class="profile-page">
    <div class="container">
      <header class="page-header">
        <IconButton
          :icon="arrowBigLeftIcon"
          alt="Go Home"
          title="Go Home"
          @click="goHome"
        />
        <h1>Profile</h1>
        <div class="header-spacer"></div>
      </header>

      <div class="profile-content">
        <!-- Account Information -->
        <section class="profile-section">
          <h2>Account Information</h2>
          
          <div class="form-group">
            <label for="email">Email Address</label>
            <div class="input-with-button">
              <input
                id="email"
                v-model="newEmail"
                type="email"
                placeholder="Enter email address"
                :disabled="isUpdatingEmail"
              />
              <button 
                class="btn btn-primary"
                @click="updateEmail"
                :disabled="isUpdatingEmail || newEmail === email"
              >
                {{ isUpdatingEmail ? 'Updating...' : 'Update' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="current-password">Current Password</label>
            <input
              id="current-password"
              v-model="currentPassword"
              type="password"
              placeholder="Enter current password"
              :disabled="isUpdatingPassword"
            />
          </div>

          <div class="form-group">
            <label for="new-password">New Password</label>
            <input
              id="new-password"
              v-model="newPassword"
              type="password"
              placeholder="Enter new password"
              :disabled="isUpdatingPassword"
            />
          </div>

          <div class="form-group">
            <label for="confirm-password">Confirm New Password</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              :disabled="isUpdatingPassword"
            />
          </div>

          <button 
            class="btn btn-primary full-width"
            @click="updatePassword"
            :disabled="isUpdatingPassword"
          >
            {{ isUpdatingPassword ? 'Updating...' : 'Update Password' }}
          </button>
        </section>

        <!-- Theme Preference -->
        <section class="profile-section">
          <h2>Theme Preference</h2>
          <ThemeSwitcher />
        </section>

        <!-- Measurement Unit Preference -->
        <section class="profile-section">  
          <div class="measurement-options">
            <div class="measurement-toggle">
              <span class="toggle-text-left">Metric (ml)</span>
              <div class="toggle-container">
                <input 
                  type="checkbox" 
                  :checked="store.measurementUnit === 'imperial'" 
                  :disabled="isUpdatingMeasurementUnit"
                  class="toggle-input" 
                  id="measurement-unit-toggle"
                  @change="updateMeasurementUnit(store.measurementUnit === 'metric' ? 'imperial' : 'metric')" 
                />
                <label for="measurement-unit-toggle" class="toggle-slider"></label>
              </div>
              <span class="toggle-text-right">Imperial (oz)</span>
            </div>
          </div>
        </section>

        <!-- Babies Management -->
        <section class="profile-section">
          <div class="section-header">
            <h2>My Babies</h2>
            <IconButton
              :icon="addBabyIcon"
              alt="Add Baby"
              title="Add Baby"
              @click="addBaby"
            />
          </div>
          
          <div v-if="store.babies.length === 0" class="empty-state">
            <p>No babies added yet.</p>
            <button class="btn btn-primary" @click="addBaby">Add Your First Baby</button>
          </div>
          
          <div v-else class="babies-list">
            <div 
              v-for="baby in store.babies" 
              :key="baby.id"
              class="baby-card"
            >
              <div class="baby-info">
                <img 
                  :src="baby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${baby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`" 
                  :alt="baby.name" 
                  class="baby-photo" 
                />
                <div class="baby-details">
                  <h3>{{ baby.name }}</h3>
                </div>
              </div>
              <div class="baby-actions">
                <IconButton
                  :icon="settingsIcon"
                  alt="Baby Settings"
                  title="Baby Settings"
                  @click="openBabySettingsModal(baby)"
                />
                <IconButton
                  :icon="pencilIcon"
                  alt="Edit Baby"
                  title="Edit Baby"
                  @click="openEditBabyModal(baby)"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Sign Out -->
        <section class="profile-section">
          <button 
            class="btn btn-danger full-width"
            @click="signOut"
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>

    <EditBabyModal 
      v-if="showEditBabyModal && editingBaby"
      :baby="editingBaby"
      @close="showEditBabyModal = false"
      @saved="onModalSaved"
    />

    <BabySettingsModal 
      v-if="showBabySettingsModal && settingsBaby"
      :baby-id="settingsBaby.id"
      :baby-name="settingsBaby.name"
      @close="showBabySettingsModal = false"
      @saved="onSettingsSaved"
    />
  </div>
</template>

<style scoped>
.profile-page {
  background-color: var(--color-bg-primary);
  min-height: 100vh;
  color: var(--color-text-primary);
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem 0;
}

.page-header h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.header-spacer {
  flex: 1;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.profile-section {
  background: var(--color-surface);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid var(--color-surface-border);
}

.profile-section h2 {
  margin: 0 0 1.5rem 0;
  color: var(--color-text-secondary);
  font-size: 1.3rem;
  font-weight: 600;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.75rem;
  color: var(--form-label-text);
  font-weight: 500;
  font-size: 0.95rem;
}

.form-group input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid var(--form-input-border);
  border-radius: 15px;
  background-color: var(--form-input-bg);
  color: var(--form-input-text);
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--form-input-border-focus);
  background-color: var(--form-input-bg-focus);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.form-group input::placeholder {
  color: var(--form-input-placeholder);
}

.input-with-button {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.input-with-button input {
  flex: 1;
}

.btn {
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 15px;
  color: var(--btn-primary-text);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-primary {
  background: var(--btn-primary-bg);
  box-shadow: 0 4px 12px var(--btn-primary-shadow);
}

.btn-primary:hover {
  background: var(--btn-primary-bg-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--btn-primary-shadow-hover);
}

.btn-primary:disabled {
  background: var(--color-text-disabled);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-danger {
  background: linear-gradient(135deg, var(--color-error), var(--color-error-dark));
  box-shadow: 0 4px 12px var(--btn-danger-shadow);
}

.btn-danger:hover {
  background: linear-gradient(135deg, var(--color-error-dark), var(--color-error-dark));
  transform: translateY(-2px);
  box-shadow: 0 6px 16px var(--btn-danger-shadow);
}

.full-width {
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-accent);
}

.empty-state p {
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.babies-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.baby-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  background: var(--color-surface-hover);
  border-radius: 15px;
  border: 1px solid var(--color-surface-border);
  transition: all 0.2s ease;
  min-height: 80px;
}

.baby-card:hover {
  background: var(--color-surface-active);
  transform: translateY(-2px);
}

.baby-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.baby-photo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--color-surface-border-hover);
}

.baby-details h3 {
  margin: 0 0 0.25rem 0;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
}

.baby-actions {
  display: flex;
  gap: 0.5rem;
}

.measurement-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.measurement-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.toggle-text-left,
.toggle-text-right {
  font-size: 1rem;
  color: var(--color-text-accent);
  white-space: nowrap;
}

.toggle-container {
  position: relative;
  width: 50px;
  height: 24px;
  border-radius: 12px;
  background-color: var(--color-surface-border);
}

.toggle-input {
  display: none;
}

.toggle-slider {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--color-text-tertiary);
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-slider {
  transform: translateX(26px);
}

.toggle-input:disabled + .toggle-slider {
  opacity: 0.5;
}

.toggle-input:disabled + .toggle-container {
  opacity: 0.5;
  cursor: not-allowed;
}

.measurement-description {
  font-size: 0.875rem;
  color: var(--color-text-accent);
  text-align: center;
}

.updating-indicator {
  text-align: center;
  padding: 0.5rem;
  color: var(--color-text-accent);
  font-style: italic;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .container {
    padding: 0.5rem;
  }
  
  .profile-section {
    padding: 1.5rem;
  }
  
  .input-with-button {
    flex-direction: column;
    align-items: stretch;
  }
  
  .baby-card {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .baby-info {
    flex-direction: column;
    text-align: center;
  }
}
</style> 