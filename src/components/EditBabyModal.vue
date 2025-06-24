<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useBabyStore } from '../stores/babyStore'

const props = defineProps<{
  baby: { id: string; name: string; image_url?: string | null; birthdate?: string | null }
}>()

const emit = defineEmits<{
  close: []
  saved: []
  deleted: []
}>()

const store = useBabyStore()
const name = ref('')
const birthdate = ref('')
const imageFile = ref<File | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
const isSaving = ref(false)
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)
const previewUrl = ref<string | null>(null)

onMounted(async () => {
  name.value = props.baby.name
  birthdate.value = props.baby.birthdate || ''
  previewUrl.value = props.baby.image_url || null
  await nextTick()
  nameInput.value?.focus()
})

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    imageFile.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

async function handleSubmit() {
  if (!name.value.trim()) return

  isSaving.value = true
  try {
    await store.updateBaby(props.baby.id, { 
      name: name.value.trim(),
      birthdate: birthdate.value.trim(),
      imageFile: imageFile.value || undefined
    })
    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Error updating baby:', error)
    alert('Failed to update baby.')
  } finally {
    isSaving.value = false
  }
}

function showDeleteConfirmation() {
  showDeleteConfirm.value = true
}

function cancelDelete() {
  showDeleteConfirm.value = false
}

async function confirmDelete() {
  isDeleting.value = true
  try {
    await store.deleteBaby(props.baby.id)
    emit('deleted')
    emit('close')
  } catch (error) {
    console.error('Error deleting baby:', error)
    alert('Failed to delete baby. Please try again.')
  } finally {
    isDeleting.value = false
    showDeleteConfirm.value = false
  }
}
</script>

<template>
  <div class="edit-baby-modal-overlay" @click="emit('close')">
    <div class="edit-baby-modal" @click.stop>
      <h3>Edit Baby</h3>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="baby-name">Name</label>
          <input
            id="baby-name"
            ref="nameInput"
            v-model="name"
            type="text"
            required
          />
        </div>
        <div class="form-group">
          <label for="baby-birthdate">Birthdate</label>
          <input
            id="baby-birthdate"
            v-model="birthdate"
            type="date"
            required
          />
        </div>
        <div class="form-group">
          <label for="baby-image">Image</label>
          <input
            id="baby-image"
            type="file"
            accept="image/*"
            @change="handleFileChange"
          />
          <div v-if="previewUrl" class="image-preview">
            <img :src="previewUrl" alt="Image preview" />
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-save" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
          <button type="button" class="btn btn-cancel" @click="emit('close')">
            Cancel
          </button>
          <button type="button" class="btn btn-delete" @click="showDeleteConfirmation" :disabled="isSaving">
            Delete
          </button>
        </div>
      </form>
    </div>

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="delete-confirm-overlay" @click="cancelDelete">
      <div class="delete-confirm-modal" @click.stop>
        <h4>Delete Baby</h4>
        <p>Are you sure you want to delete <strong>{{ props.baby.name }}</strong>?</p>
        <p class="warning-text">This action cannot be undone. All data for this baby will be permanently deleted.</p>
        <div class="delete-confirm-actions">
          <button class="btn btn-cancel" @click="cancelDelete" :disabled="isDeleting">
            Cancel
          </button>
          <button class="btn btn-delete-confirm" @click="confirmDelete" :disabled="isDeleting">
            {{ isDeleting ? 'Deleting...' : 'Delete Permanently' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.edit-baby-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.edit-baby-modal {
  background-color: #1a1a2e;
  border-radius: 20px;
  padding: 2rem;
  max-width: 450px;
  width: 100%;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  position: relative;
}

.edit-baby-modal h3 {
  margin: 0 0 1.5rem 0;
  color: #e0e0ff;
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.75rem;
  color: #a0a0e0;
  font-weight: 500;
  font-size: 0.95rem;
}

.form-group input {
  width: 100%;
  padding: 1rem 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  background-color: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 1rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #9c27b0;
  background-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.2);
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.image-preview {
  margin-top: 1rem;
  text-align: center;
}

.image-preview img {
  max-width: 120px;
  max-height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 15px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-save {
  background: linear-gradient(135deg, #9c27b0, #7b1fa2);
  box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
}

.btn-save:hover {
  background: linear-gradient(135deg, #8e24aa, #6a1b9a);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(156, 39, 176, 0.4);
}

.btn-save:disabled {
  background: #666;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #a0a0e0;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  color: white;
}

.btn-delete {
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
  color: #fca5a5;
}

/* File input styling */
.form-group input[type="file"] {
  padding: 0.75rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 2px dashed rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  cursor: pointer;
  text-align: center;
}

.form-group input[type="file"]:hover {
  border-color: #9c27b0;
  background-color: rgba(156, 39, 176, 0.1);
}

.form-group input[type="file"]::-webkit-file-upload-button {
  background: #9c27b0;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  margin-right: 1rem;
  font-weight: 500;
}

.form-group input[type="file"]::-webkit-file-upload-button:hover {
  background: #7b1fa2;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .edit-baby-modal {
    padding: 1.5rem;
    margin: 1rem;
  }
  
  .form-group input {
    padding: 1rem;
    font-size: 16px; /* Prevents zoom on iOS */
  }
  
  .btn {
    padding: 1rem;
    font-size: 1rem;
  }
}

/* Delete Confirmation Dialog Styles */
.delete-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.delete-confirm-modal {
  background-color: #1a1a2e;
  border-radius: 20px;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  color: white;
  border: 1px solid rgba(239, 68, 68, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
}

.delete-confirm-modal h4 {
  margin: 0 0 1rem 0;
  color: #ef4444;
  font-size: 1.3rem;
  font-weight: 600;
  text-align: center;
}

.delete-confirm-modal p {
  margin: 0 0 1rem 0;
  color: #e0e0ff;
  line-height: 1.5;
}

.warning-text {
  color: #fca5a5 !important;
  font-size: 0.9rem;
  background: rgba(239, 68, 68, 0.1);
  padding: 1rem;
  border-radius: 10px;
  border-left: 3px solid #ef4444;
}

.delete-confirm-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn-delete-confirm {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-delete-confirm:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

.btn-delete-confirm:disabled {
  background: #666;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style> 