<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Add Sleep Session</h2>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              v-model="form.start_time"
              type="datetime-local"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              End Time (optional)
            </label>
            <input
              v-model="form.end_time"
              type="datetime-local"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <p class="text-xs text-gray-500 mt-1">
              Leave empty if baby is still sleeping
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              v-model="form.notes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes..."
            ></textarea>
          </div>
          
          <div class="flex justify-end gap-3 pt-4">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading || !activeBaby"
              class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {{ loading ? 'Adding...' : 'Add Sleep Session' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useStore } from '../../stores/clean-store';

const emit = defineEmits<{
  close: [];
  created: [];
}>();

const store = useStore();
const { createSleepSession, activeBaby } = store;

const loading = ref(false);
const form = ref({
  start_time: '',
  end_time: '',
  notes: ''
});

async function handleSubmit() {
  if (!activeBaby.value) return;
  
  try {
    loading.value = true;
    await createSleepSession({
      baby_id: activeBaby.value.id,
      start_time: form.value.start_time,
      end_time: form.value.end_time || undefined,
      notes: form.value.notes || undefined
    });
    emit('created');
  } catch (err) {
    // Error handled by store
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // Set default start time to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  form.value.start_time = now.toISOString().slice(0, 16);
});
</script>