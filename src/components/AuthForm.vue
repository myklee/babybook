<template>
  <div class="max-w-md mx-auto px-4 py-12">
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-6 text-center">
        {{ showLogin ? 'Login' : 'Create Account' }}
      </h2>
      
      <form @submit.prevent="handleAuth" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="authForm.email"
            type="email"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCloudflareStore } from '../stores/cloudflareStore'

const store = useCloudflareStore()

const showLogin = ref(true)
const authForm = ref({ email: '', password: '' })

const loading = computed(() => store.loading)

async function handleAuth() {
  try {
    if (showLogin.value) {
      await store.login(authForm.value.email, authForm.value.password)
    } else {
      await store.register(authForm.value.email, authForm.value.password)
    }
    
    authForm.value = { email: '', password: '' }
  } catch (error) {
    // Error is handled by the store
    console.error('Auth error:', error)
  }
}
</script>