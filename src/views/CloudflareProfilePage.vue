<script setup lang="ts">
import { useCloudflareStore } from '../stores/cloudflareStore'
import { useRouter } from 'vue-router'
import IconButton from '../components/IconButton.vue'
import arrowBigLeftIcon from '../assets/icons/arrow-big-left.svg'

const store = useCloudflareStore()
const router = useRouter()

function goHome() {
  router.push('/')
}

function handleLogout() {
  store.logout()
  router.push('/')
}
</script>

<template>
  <div class="profile-page">
    <div class="container">
      <header class="page-header">
        <IconButton :icon="arrowBigLeftIcon" alt="Go Home" title="Go Home" @click="goHome" />
        <h1>Profile</h1>
        <div></div> <!-- Spacer -->
      </header>

      <div class="profile-content">
        <div class="user-info">
          <h2>User Information</h2>
          <div class="info-card">
            <div class="info-item">
              <label>Email:</label>
              <span>{{ store.user?.email || 'Not available' }}</span>
            </div>
            <div class="info-item">
              <label>User ID:</label>
              <span>{{ store.user?.id || 'Not available' }}</span>
            </div>
          </div>
        </div>

        <div class="babies-info">
          <h2>Your Babies</h2>
          <div v-if="store.babies.length === 0" class="no-babies">
            <p>No babies added yet.</p>
          </div>
          <div v-else class="babies-list">
            <div v-for="baby in store.babies" :key="baby.id" class="baby-card">
              <img 
                :src="baby.image_url || `https://api.dicebear.com/8.x/thumbs/svg?seed=${baby.name}&backgroundColor=1a1a2e&shapeColor=2c2c54`" 
                :alt="baby.name"
                class="baby-photo" 
              />
              <div class="baby-details">
                <h3>{{ baby.name }}</h3>
                <p>Born: {{ new Date(baby.birthdate).toLocaleDateString() }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="actions">
          <button @click="handleLogout" class="btn btn-danger">
            Logout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  background-color: var(--color-bg-primary);
  min-height: 100vh;
  color: var(--color-text-primary);
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-surface-border);
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.user-info h2,
.babies-info h2 {
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.info-card {
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 1rem;
  padding: 1.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-surface-border);
}

.info-item:last-child {
  border-bottom: none;
}

.info-item label {
  font-weight: 500;
  color: var(--color-text-secondary);
}

.no-babies {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-accent);
}

.babies-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.baby-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-surface-border);
  border-radius: 1rem;
  padding: 1rem;
}

.baby-photo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
}

.baby-details h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
}

.baby-details p {
  margin: 0;
  color: var(--color-text-accent);
  font-size: 0.9rem;
}

.actions {
  display: flex;
  justify-content: center;
  padding-top: 1rem;
}

.btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

/* Responsive */
@media (max-width: 768px) {
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .baby-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>