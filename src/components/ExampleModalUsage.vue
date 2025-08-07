<script setup lang="ts">
import { ref, watch } from 'vue'
import ResponsiveModal from './ResponsiveModal.vue'

// Modal state
const isModalOpen = ref(false)
const modalRef = ref<InstanceType<typeof ResponsiveModal>>()

// Form data
const name = ref('')
const email = ref('')
const message = ref('')

// Functions
function openModal() {
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
}

function handleSave() {
  // Handle save logic here
  console.log('Saving:', { name: name.value, email: email.value, message: message.value })
  closeModal()
}

function resetForm() {
  name.value = ''
  email.value = ''
  message.value = ''
}

// Watch for modal open/close to manage setup/cleanup
watch(isModalOpen, (newValue) => {
  if (newValue) {
    modalRef.value?.setupModal()
  } else {
    modalRef.value?.cleanupModal()
    // Reset form when modal closes
    resetForm()
  }
})
</script>

<template>
  <div class="example-container">
    <h1>Responsive Modal Example</h1>
    <p>Click the button below to open a fully responsive modal that becomes full-screen on mobile devices.</p>
    
    <button @click="openModal" class="open-modal-btn">
      Open Modal
    </button>

    <!-- Responsive Modal -->
    <ResponsiveModal
      ref="modalRef"
      :is-open="isModalOpen"
      title="Contact Form"
      :close-on-backdrop="true"
      max-width="500px"
      @close="closeModal"
    >
      <!-- Modal Content -->
      <form @submit.prevent="handleSave" class="modal-form">
        <div class="form-group">
          <label for="name" class="form-label">Name</label>
          <input
            id="name"
            v-model="name"
            type="text"
            class="form-input"
            placeholder="Enter your name"
            required
          />
        </div>

        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-input"
            placeholder="Enter your email"
            required
          />
        </div>

        <div class="form-group">
          <label for="message" class="form-label">Message</label>
          <textarea
            id="message"
            v-model="message"
            class="form-textarea"
            rows="4"
            placeholder="Enter your message"
            required
          ></textarea>
        </div>
      </form>

      <!-- Modal Footer -->
      <template #footer>
        <div class="modal-actions">
          <button
            type="button"
            class="btn btn-cancel"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="handleSave"
            :disabled="!name || !email || !message"
          >
            Save
          </button>
        </div>
      </template>
    </ResponsiveModal>

    <!-- Example with custom header -->
    <ResponsiveModal
      :is-open="false"
      max-width="600px"
      @close="closeModal"
    >
      <template #header>
        <div class="custom-header">
          <h2>Custom Header Example</h2>
          <span class="badge">New</span>
        </div>
      </template>
      
      <p>This modal demonstrates a custom header slot.</p>
    </ResponsiveModal>
  </div>
</template>

<style scoped>
.example-container {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.open-modal-btn {
  background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.open-modal-btn:hover {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
}

/* Modal Form Styles */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #a855f7;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.2);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-primary {
  background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* Custom Header Example */
.custom-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.custom-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
}

.badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .modal-actions {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .btn {
    width: 100%;
    padding: 1rem;
  }
  
  .example-container {
    padding: 1rem;
  }
  
  .open-modal-btn {
    width: 100%;
    padding: 1.25rem;
  }
}
</style>