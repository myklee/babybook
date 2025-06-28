<template>
  <div class="modal-overlay" @click.self="close">
    <div class="modal">
      <h2>{{ sleepSession ? 'Edit Sleep Session' : 'Add Sleep Session' }}</h2>
      <form @submit.prevent="save">
        <div class="form-group">
          <label for="start">Start Time</label>
          <input id="start" type="datetime-local" v-model="startTime" required />
        </div>
        <div class="form-group">
          <label for="end">End Time</label>
          <input id="end" type="datetime-local" v-model="endTime" />
        </div>
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea id="notes" v-model="notes" rows="2" placeholder="Optional"></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="close">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = defineProps<{
  babyId: string
  sleepSession?: {
    id?: string
    start_time: string
    end_time?: string | null
    notes?: string | null
  }
}>()
const emit = defineEmits(['close', 'saved'])

const startTime = ref('')
const endTime = ref('')
const notes = ref('')

onMounted(() => {
  if (props.sleepSession) {
    startTime.value = props.sleepSession.start_time?.slice(0, 16) || ''
    endTime.value = props.sleepSession.end_time?.slice(0, 16) || ''
    notes.value = props.sleepSession.notes || ''
  } else {
    // Default to now
    const now = new Date()
    startTime.value = now.toISOString().slice(0, 16)
    endTime.value = ''
    notes.value = ''
  }
})

function close() {
  emit('close')
}

async function save() {
  if (!startTime.value) return
  emit('saved', {
    start_time: new Date(startTime.value).toISOString(),
    end_time: endTime.value ? new Date(endTime.value).toISOString() : null,
    notes: notes.value || null,
    id: props.sleepSession?.id
  })
  close()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #23234a;
  border-radius: 20px;
  padding: 2rem;
  min-width: 320px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  color: white;
}
.form-group {
  margin-bottom: 1.5rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
  color: #a0a0e0;
  font-weight: 500;
}
input, textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1px solid #444;
  background: #181836;
  color: white;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}
input:focus, textarea:focus {
  outline: none;
  border-color: #9c27b0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  font-size: 1rem;
}
.btn-primary {
  background: linear-gradient(135deg, #9c27b0, #7b1fa2);
  color: white;
}
.btn-secondary {
  background: #666;
  color: white;
}
</style> 