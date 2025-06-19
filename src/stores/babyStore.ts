import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface Baby {
  id: string
  name: string
}

export interface Feeding {
  id: string
  babyId: string
  timestamp: Date
  amount: number
  type: 'breast' | 'formula' | 'solid'
  notes?: string
}

export interface DiaperChange {
  id: string
  babyId: string
  timestamp: Date
  type: 'wet' | 'dirty' | 'both'
  notes?: string
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

const STORAGE_KEY = 'babybook-data'

interface StorageData {
  babies: Baby[]
  feedings: Feeding[]
  diaperChanges: DiaperChange[]
}

export const useBabyStore = defineStore('baby', () => {
  const babies = ref<Baby[]>([])
  const feedings = ref<Feeding[]>([])
  const diaperChanges = ref<DiaperChange[]>([])

  // Load data from localStorage on store initialization
  function loadFromStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (storedData) {
      const data: StorageData = JSON.parse(storedData)
      babies.value = data.babies
      // Convert stored ISO date strings back to Date objects
      feedings.value = data.feedings.map(f => ({
        ...f,
        timestamp: new Date(f.timestamp)
      }))
      diaperChanges.value = data.diaperChanges.map(d => ({
        ...d,
        timestamp: new Date(d.timestamp)
      }))
    }
  }

  // Save data to localStorage whenever it changes
  function saveToStorage() {
    const data: StorageData = {
      babies: babies.value,
      feedings: feedings.value,
      diaperChanges: diaperChanges.value
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // Watch for changes in the data and save to localStorage
  watch([babies, feedings, diaperChanges], () => {
    saveToStorage()
  }, { deep: true })

  // Load data from localStorage when store is created
  loadFromStorage()

  function addBaby(name: string) {
    const baby: Baby = {
      id: generateId(),
      name
    }
    babies.value.push(baby)
    return baby
  }

  function addFeeding(babyId: string, amount: number, type: Feeding['type'], notes?: string) {
    const feeding: Feeding = {
      id: generateId(),
      babyId,
      timestamp: new Date(),
      amount,
      type,
      notes
    }
    feedings.value.push(feeding)
    return feeding
  }

  function addDiaperChange(babyId: string, type: DiaperChange['type'], notes?: string) {
    const diaperChange: DiaperChange = {
      id: generateId(),
      babyId,
      timestamp: new Date(),
      type,
      notes
    }
    diaperChanges.value.push(diaperChange)
    return diaperChange
  }

  function getBabyFeedings(babyId: string) {
    return feedings.value.filter(f => f.babyId === babyId)
  }

  function getBabyDiaperChanges(babyId: string) {
    return diaperChanges.value.filter(d => d.babyId === babyId)
  }

  // CSV Export functionality
  function exportToCSV() {
    const timestamp = new Date().toISOString().split('T')[0]
    
    // Export babies
    const babiesCSV = exportBabiesToCSV()
    downloadCSV(babiesCSV, `babybook-babies-${timestamp}.csv`)
    
    // Export feedings
    const feedingsCSV = exportFeedingsToCSV()
    downloadCSV(feedingsCSV, `babybook-feedings-${timestamp}.csv`)
    
    // Export diaper changes
    const diaperChangesCSV = exportDiaperChangesToCSV()
    downloadCSV(diaperChangesCSV, `babybook-diaper-changes-${timestamp}.csv`)
  }

  function exportBabiesToCSV(): string {
    const headers = ['ID', 'Name']
    const rows = babies.value.map(baby => [baby.id, baby.name])
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }

  function exportFeedingsToCSV(): string {
    const headers = ['ID', 'Baby ID', 'Baby Name', 'Timestamp', 'Amount', 'Type', 'Notes']
    const rows = feedings.value.map(feeding => {
      const baby = babies.value.find(b => b.id === feeding.babyId)
      return [
        feeding.id,
        feeding.babyId,
        baby?.name || 'Unknown',
        feeding.timestamp.toISOString(),
        feeding.amount,
        feeding.type,
        feeding.notes || ''
      ]
    })
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }

  function exportDiaperChangesToCSV(): string {
    const headers = ['ID', 'Baby ID', 'Baby Name', 'Timestamp', 'Type', 'Notes']
    const rows = diaperChanges.value.map(change => {
      const baby = babies.value.find(b => b.id === change.babyId)
      return [
        change.id,
        change.babyId,
        baby?.name || 'Unknown',
        change.timestamp.toISOString(),
        change.type,
        change.notes || ''
      ]
    })
    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }

  function downloadCSV(csvContent: string, filename: string) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // CSV Import functionality
  async function importFromCSV(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        return { success: false, message: 'Invalid CSV file: no data found' }
      }

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.replace(/"/g, '').trim())
        const row: Record<string, string> = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      })

      // Determine file type based on headers
      if (headers.includes('Amount') && headers.includes('Type')) {
        // This is a feedings file
        return importFeedingsFromCSV(data)
      } else if (headers.includes('Type') && !headers.includes('Amount')) {
        // This is a diaper changes file
        return importDiaperChangesFromCSV(data)
      } else if (headers.includes('Name') && headers.length === 2) {
        // This is a babies file
        return importBabiesFromCSV(data)
      } else {
        return { success: false, message: 'Unknown CSV format' }
      }
    } catch (error) {
      return { success: false, message: `Error reading file: ${error}` }
    }
  }

  function importBabiesFromCSV(data: Record<string, string>[]): { success: boolean; message: string } {
    try {
      // Clear existing babies
      babies.value = []
      
      const newBabies = data.map(row => ({
        id: row.ID || generateId(),
        name: row.Name
      })).filter(baby => baby.name)

      babies.value.push(...newBabies)
      return { success: true, message: `Imported ${newBabies.length} babies` }
    } catch (error) {
      return { success: false, message: `Error importing babies: ${error}` }
    }
  }

  function importFeedingsFromCSV(data: Record<string, string>[]): { success: boolean; message: string } {
    try {
      // Clear existing feedings
      feedings.value = []
      
      const newFeedings = data.map(row => ({
        id: row.ID || generateId(),
        babyId: row['Baby ID'] || row['BabyID'],
        timestamp: new Date(row.Timestamp),
        amount: parseFloat(row.Amount) || 0,
        type: row.Type as Feeding['type'],
        notes: row.Notes
      })).filter(feeding => feeding.babyId && feeding.timestamp && !isNaN(feeding.timestamp.getTime()))

      feedings.value.push(...newFeedings)
      return { success: true, message: `Imported ${newFeedings.length} feedings` }
    } catch (error) {
      return { success: false, message: `Error importing feedings: ${error}` }
    }
  }

  function importDiaperChangesFromCSV(data: Record<string, string>[]): { success: boolean; message: string } {
    try {
      // Clear existing diaper changes
      diaperChanges.value = []
      
      const newDiaperChanges = data.map(row => ({
        id: row.ID || generateId(),
        babyId: row['Baby ID'] || row['BabyID'],
        timestamp: new Date(row.Timestamp),
        type: row.Type as DiaperChange['type'],
        notes: row.Notes
      })).filter(change => change.babyId && change.timestamp && !isNaN(change.timestamp.getTime()))

      diaperChanges.value.push(...newDiaperChanges)
      return { success: true, message: `Imported ${newDiaperChanges.length} diaper changes` }
    } catch (error) {
      return { success: false, message: `Error importing diaper changes: ${error}` }
    }
  }

  // Import all data at once (for complete backup restore)
  async function importAllData(files: File[]): Promise<{ success: boolean; message: string }> {
    try {
      // Clear all existing data first
      babies.value = []
      feedings.value = []
      diaperChanges.value = []

      let importedBabies = 0
      let importedFeedings = 0
      let importedDiaperChanges = 0

      for (const file of files) {
        const result = await importFromCSV(file)
        if (result.success) {
          // Count the imported items
          if (file.name.includes('babies')) {
            importedBabies = babies.value.length
          } else if (file.name.includes('feedings')) {
            importedFeedings = feedings.value.length
          } else if (file.name.includes('diaper')) {
            importedDiaperChanges = diaperChanges.value.length
          }
        }
      }

      const message = `Import complete: ${importedBabies} babies, ${importedFeedings} feedings, ${importedDiaperChanges} diaper changes`
      return { success: true, message }
    } catch (error) {
      return { success: false, message: `Error importing data: ${error}` }
    }
  }

  return {
    babies,
    feedings,
    diaperChanges,
    addBaby,
    addFeeding,
    addDiaperChange,
    getBabyFeedings,
    getBabyDiaperChanges,
    loadFromStorage,
    exportToCSV,
    importFromCSV,
    importAllData,
  }
}) 