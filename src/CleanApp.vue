<template>
  <div id="clean-app" class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">Baby Tracker</h1>
        <div v-if="isAuthenticated" class="flex items-center gap-4">
          <span class="text-sm text-gray-600">{{ user?.email }}</span>
          <button 
            @click="handleLogout"
            class="text-sm text-red-600 hover:text-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error -->
    <div v-if="error" class="max-w-4xl mx-auto px-4 py-4">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800">{{ error }}</p>
      </div>
    </div>

    <!-- Auth Forms -->
    <div v-if="!isAuthenticated && !loading" class="max-w-md mx-auto px-4 py-12">
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-6 text-center">
          {{ showLogin ? 'Login' : 'Create Account' }}
        </h2>
        
        <form @submit.prevent="handleAuth" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              v-model="authForm.email"
              type="email"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              v-model="authForm.password"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>
          
          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {{ showLogin ? 'Login' : 'Create Account' }}
          </button>
        </form>
        
        <p class="text-center mt-4 text-sm text-gray-600">
          {{ showLogin ? "Don't have an account?" : "Already have an account?" }}
          <button
            @click="showLogin = !showLogin"
            class="text-blue-600 hover:text-blue-700 font-medium"
          >
            {{ showLogin ? 'Sign up' : 'Login' }}
          </button>
        </p>
      </div>
    </div>

    <!-- Main App -->
    <main v-if="isAuthenticated && !loading" class="max-w-4xl mx-auto px-4 py-6">
      <!-- No Babies State -->
      <div v-if="babies.length === 0" class="text-center py-12">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Welcome to Baby Tracker!</h2>
        <p class="text-gray-600 mb-6">Let's start by adding your baby.</p>
        <button
          @click="showAddBaby = true"
          class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
        >
          Add Baby
        </button>
      </div>

      <!-- Baby Dashboard -->
      <div v-else>
        <!-- Baby Header -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div class="flex justify-between items-center">
            <div>
              <h2 class="text-2xl font-bold text-gray-900">{{ activeBaby?.name }}</h2>
              <p class="text-gray-600">Born {{ formatDate(activeBaby?.birthdate) }}</p>
            </div>
            <button
              @click="showAddBaby = true"
              class="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200"
            >
              Add Baby
            </button>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            @click="showFeedingForm = true"
            class="bg-green-50 border border-green-200 rounded-lg p-4 text-left hover:bg-green-100"
          >
            <div class="text-green-800 font-medium">Add Feeding</div>
            <div class="text-green-600 text-sm">Record a feeding session</div>
          </button>
          
          <button
            @click="showDiaperForm = true"
            class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left hover:bg-yellow-100"
          >
            <div class="text-yellow-800 font-medium">Add Diaper Change</div>
            <div class="text-yellow-600 text-sm">Log a diaper change</div>
          </button>
          
          <button
            @click="showSleepForm = true"
            class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left hover:bg-blue-100"
          >
            <div class="text-blue-800 font-medium">Add Sleep</div>
            <div class="text-blue-600 text-sm">Track sleep time</div>
          </button>
        </div>

        <!-- Recent Activity -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          
          <div v-if="recentActivity.length === 0" class="text-gray-500 text-center py-8">
            No activity yet. Add your first feeding, diaper change, or sleep session above!
          </div>
          
          <div v-else class="space-y-3">
            <div
              v-for="activity in recentActivity"
              :key="activity.id"
              class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
            >
              <div>
                <span class="font-medium">{{ activity.type }}</span>
                <span class="text-gray-600 ml-2">{{ activity.details }}</span>
              </div>
              <span class="text-sm text-gray-500">{{ formatTime(activity.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modals -->
    <AddBabyModal v-if="showAddBaby" @close="showAddBaby = false" @created="handleBabyCreated" />
    <FeedingModal v-if="showFeedingForm" @close="showFeedingForm = false" @created="handleFeedingCreated" />
    <DiaperModal v-if="showDiaperForm" @close="showDiaperForm = false" @created="handleDiaperCreated" />
    <SleepModal v-if="showSleepForm" @close="showSleepForm = false" @created="handleSleepCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStore } from './stores/clean-store';
import AddBabyModal from './components/clean/AddBabyModal.vue';
import FeedingModal from './components/clean/FeedingModal.vue';
import DiaperModal from './components/clean/DiaperModal.vue';
import SleepModal from './components/clean/SleepModal.vue';

const store = useStore();
const {
  user,
  babies,
  feedings,
  diaperChanges,
  sleepSessions,
  loading,
  error,
  isAuthenticated,
  activeBaby,
  initialize,
  login,
  register,
  logout
} = store;

// Auth form
const showLogin = ref(true);
const authForm = ref({
  email: '',
  password: ''
});

// Modals
const showAddBaby = ref(false);
const showFeedingForm = ref(false);
const showDiaperForm = ref(false);
const showSleepForm = ref(false);

// Recent activity
const recentActivity = computed(() => {
  if (!activeBaby.value) return [];
  
  const babyId = activeBaby.value.id;
  const activities: Array<{
    id: string;
    type: string;
    details: string;
    timestamp: string;
  }> = [];
  
  // Add feedings
  feedings.value
    .filter(f => f.baby_id === babyId)
    .forEach(f => {
      activities.push({
        id: f.id,
        type: 'Feeding',
        details: `${f.type}${f.amount ? ` - ${f.amount}ml` : ''}`,
        timestamp: f.timestamp
      });
    });
  
  // Add diaper changes
  diaperChanges.value
    .filter(d => d.baby_id === babyId)
    .forEach(d => {
      activities.push({
        id: d.id,
        type: 'Diaper',
        details: d.type,
        timestamp: d.timestamp
      });
    });
  
  // Add sleep sessions
  sleepSessions.value
    .filter(s => s.baby_id === babyId)
    .forEach(s => {
      activities.push({
        id: s.id,
        type: 'Sleep',
        details: s.end_time ? 'Completed' : 'In progress',
        timestamp: s.start_time
      });
    });
  
  // Sort by timestamp (newest first)
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10); // Show last 10 activities
});

// Methods
async function handleAuth() {
  try {
    if (showLogin.value) {
      await login(authForm.value.email, authForm.value.password);
    } else {
      await register(authForm.value.email, authForm.value.password);
    }
    authForm.value = { email: '', password: '' };
  } catch (err) {
    // Error is handled by the store
  }
}

async function handleLogout() {
  await logout();
}

function handleBabyCreated() {
  showAddBaby.value = false;
}

function handleFeedingCreated() {
  showFeedingForm.value = false;
}

function handleDiaperCreated() {
  showDiaperForm.value = false;
}

function handleSleepCreated() {
  showSleepForm.value = false;
}

function formatDate(dateString?: string) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString();
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleString();
}

onMounted(() => {
  initialize();
});
</script>

<style scoped>
#clean-app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>