<template>
  <div class="data-manager">
    <h3 class="text-lg font-semibold mb-4">Data Management</h3>
    
    <div class="space-y-4">
      <!-- Export Section -->
      <div class="bg-blue-50 p-4 rounded-lg">
        <h4 class="font-medium text-blue-900 mb-2">Export Data</h4>
        <p class="text-sm text-blue-700 mb-3">
          Download all your data as CSV files for backup or analysis.
        </p>
        <button 
          @click="exportData"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Export All Data
        </button>
      </div>

      <!-- Import Section -->
      <div class="bg-green-50 p-4 rounded-lg">
        <h4 class="font-medium text-green-900 mb-2">Import Data</h4>
        <p class="text-sm text-green-700 mb-3">
          Import data from previously exported CSV files. <strong>This will overwrite existing data.</strong>
        </p>
        
        <div class="space-y-3">
          <!-- Single file import -->
          <div>
            <label class="block text-sm font-medium text-green-900 mb-1">
              Import single CSV file:
            </label>
            <input 
              type="file" 
              accept=".csv"
              @change="handleSingleFileSelect"
              class="block w-full text-sm text-green-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700"
            />
            <button 
              @click="importSingleFile"
              :disabled="!selectedSingleFile"
              class="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Import Single File
            </button>
          </div>

          <!-- Multiple files import -->
          <div class="border-t pt-3">
            <label class="block text-sm font-medium text-green-900 mb-1">
              Import multiple CSV files (complete backup):
            </label>
            <input 
              type="file" 
              accept=".csv"
              multiple
              @change="handleMultipleFilesSelect"
              class="block w-full text-sm text-green-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700"
            />
            <button 
              @click="importMultipleFiles"
              :disabled="selectedMultipleFiles.length === 0"
              class="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Import All Files
            </button>
          </div>
        </div>
      </div>

      <!-- Status Messages -->
      <div v-if="statusMessage" class="mt-4 p-3 rounded" :class="statusClass">
        {{ statusMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBabyStore } from '../stores/babyStore'

const store = useBabyStore()
const selectedSingleFile = ref<File | null>(null)
const selectedMultipleFiles = ref<File[]>([])
const statusMessage = ref('')
const statusClass = ref('')

function exportData() {
  try {
    store.exportToCSV()
    showStatus('Data exported successfully! Check your downloads folder.', 'success')
  } catch (error) {
    showStatus(`Export failed: ${error}`, 'error')
  }
}

function handleSingleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedSingleFile.value = target.files[0]
  }
}

function handleMultipleFilesSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedMultipleFiles.value = Array.from(target.files)
  }
}

async function importSingleFile() {
  if (!selectedSingleFile.value) return

  try {
    const result = await store.importFromCSV(selectedSingleFile.value)
    if (result.success) {
      showStatus(result.message, 'success')
      selectedSingleFile.value = null
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]:not([multiple])') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } else {
      showStatus(result.message, 'error')
    }
  } catch (error) {
    showStatus(`Import failed: ${error}`, 'error')
  }
}

async function importMultipleFiles() {
  if (selectedMultipleFiles.value.length === 0) return

  try {
    const result = await store.importAllData(selectedMultipleFiles.value)
    if (result.success) {
      showStatus(result.message, 'success')
      selectedMultipleFiles.value = []
      // Reset file input
      const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } else {
      showStatus(result.message, 'error')
    }
  } catch (error) {
    showStatus(`Import failed: ${error}`, 'error')
  }
}

function showStatus(message: string, type: 'success' | 'error') {
  statusMessage.value = message
  statusClass.value = type === 'success' 
    ? 'bg-green-100 text-green-800 border border-green-200' 
    : 'bg-red-100 text-red-800 border border-red-200'
  
  // Clear status after 5 seconds
  setTimeout(() => {
    statusMessage.value = ''
    statusClass.value = ''
  }, 5000)
}
</script>

<style scoped>
.data-manager {
  max-width: 600px;
  margin: 0 auto;
}
</style> 