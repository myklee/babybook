<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Add Diaper Change</h2>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input
                  v-model="form.type"
                  type="radio"
                  value="pee"
                  class="mr-2"
                >
                <span>Pee</span>
              </label>
              <label class="flex items-center">
                <input
                  v-model="form.type"
                  type="radio"
                  value="poop"
                  class="mr-2"
                >
                <span>Poop</span>
              </label>
              <label class="flex items-center">
                <input
                  v-model="form.type"
                  type="radio"
                  value="both"
                  class="mr-2"
                >
                <span>Both</span>
              </label>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Time
            </label>
            <input
              v-model="form.timestamp"
              type="datetime-local"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
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
              class="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
            >
              {{ loading ? 'Adding...' : 'Add Diaper Change' }}
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
const { createDiaperChange, activeBaby } = store;

const loading = ref(false);
const form = ref({
  type: 'pee' as 'pee' | 'poop' | 'both',
  timestamp: '',
  notes: ''
});

async function handleSubmit() {
  if (!activeBaby.value) return;
  
  try {
    loading.value = true;
    await createDiaperChange({
      baby_id: activeBaby.value.id,
      type: form.value.type,
      timestamp: form.value.timestamp,
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
  // Set default timestamp to now
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  form.value.timestamp = now.toISOString().slice(0, 16);
});
</script>