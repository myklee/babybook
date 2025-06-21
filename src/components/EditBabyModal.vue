<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useBabyStore } from '../stores/babyStore'

const props = defineProps<{
  baby: { id: string; name: string; image_url?: string | null }
}>()

const emit = defineEmits<{
  close: []
  saved: []
}>()

const store = useBabyStore()
const name = ref('')
const imageFile = ref<File | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)
const isSaving = ref(false)
const previewUrl = ref<string | null>(null)

onMounted(async () => {
  name.value = props.baby.name
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
        </div>
      </form>
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.edit-baby-modal {
  background-color: white;
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  color: #333;
}

.edit-baby-modal h3 {
  margin: 0 0 1rem 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.image-preview {
  margin-top: 1rem;
}

.image-preview img {
  max-width: 100px;
  max-height: 100px;
  border-radius: 50%;
  object-fit: cover;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  cursor: pointer;
}

.btn-save {
  background-color: #9c27b0;
}

.btn-cancel {
  background-color: #9e9e9e;
}
</style> 