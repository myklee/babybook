<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useBabyStore } from '../stores/babyStore'
import DatePicker from './DatePicker.vue'

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
  <div class="modal-overlay" @click="emit('close')">
    <div class="modal" @click.stop>
      <h3 class="modal-title">Edit Baby</h3>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="baby-name">Name</label>
          <input id="baby-name" ref="nameInput" v-model="name" type="text" required />
        </div>
        <div class="form-group">
          <label for="baby-birthdate">Birthdate</label>
          <DatePicker v-model="birthdate" id="baby-birthdate" />
        </div>
        <div class="form-group">
          <label for="baby-image">Image</label>
          <input id="baby-image" type="file" accept="image/*" @change="handleFileChange" />
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
.form-group {
  margin-bottom: 1.5rem;
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
</style>