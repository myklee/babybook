<template>
  <div class="form-demo">
    <h2>Form Components Demo</h2>
    
    <form @submit.prevent="handleSubmit" class="demo-form">
      <div class="form-group">
        <FormLabel htmlFor="name" required>Name</FormLabel>
        <FormInput
          id="name"
          v-model="formData.name"
          placeholder="Enter your name"
          :variant="errors.name ? 'error' : 'default'"
        />
        <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
      </div>
      
      <div class="form-group">
        <FormLabel htmlFor="email">Email</FormLabel>
        <FormInput
          id="email"
          v-model="formData.email"
          type="email"
          placeholder="Enter your email"
          :variant="errors.email ? 'error' : formData.email ? 'success' : 'default'"
        />
        <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
      </div>
      
      <div class="form-group">
        <FormLabel htmlFor="message" required>Message</FormLabel>
        <FormTextarea
          id="message"
          v-model="formData.message"
          placeholder="Enter your message"
          :rows="4"
          :variant="errors.message ? 'error' : 'default'"
        />
        <span v-if="errors.message" class="error-message">{{ errors.message }}</span>
      </div>
      
      <div class="form-group">
        <h3>Size Variants</h3>
        <div class="size-demo">
          <div>
            <FormLabel htmlFor="small-input">Small</FormLabel>
            <FormInput
              id="small-input"
              v-model="formData.smallInput"
              size="sm"
              placeholder="Small input"
            />
          </div>
          <div>
            <FormLabel htmlFor="medium-input">Medium</FormLabel>
            <FormInput
              id="medium-input"
              v-model="formData.mediumInput"
              size="md"
              placeholder="Medium input"
            />
          </div>
          <div>
            <FormLabel htmlFor="large-input">Large</FormLabel>
            <FormInput
              id="large-input"
              v-model="formData.largeInput"
              size="lg"
              placeholder="Large input"
            />
          </div>
        </div>
      </div>
      
      <button type="submit" class="submit-btn">Submit</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import FormInput from './FormInput.vue'
import FormTextarea from './FormTextarea.vue'
import FormLabel from './FormLabel.vue'

const formData = reactive({
  name: '',
  email: '',
  message: '',
  smallInput: '',
  mediumInput: '',
  largeInput: ''
})

const errors = ref<Record<string, string>>({})

const validateForm = () => {
  const newErrors: Record<string, string> = {}
  
  if (!formData.name.trim()) {
    newErrors.name = 'Name is required'
  }
  
  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    newErrors.email = 'Please enter a valid email address'
  }
  
  if (!formData.message.trim()) {
    newErrors.message = 'Message is required'
  }
  
  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

const handleSubmit = () => {
  if (validateForm()) {
    console.log('Form submitted:', formData)
    alert('Form submitted successfully!')
  }
}
</script>

<style scoped>
.form-demo {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background-color: var(--color-surface);
  border-radius: 12px;
}

.demo-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.size-demo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.error-message {
  color: var(--color-error);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.submit-btn {
  padding: 0.75rem 1.5rem;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 2px 4px var(--btn-primary-shadow);
}

.submit-btn:hover {
  background: var(--btn-primary-bg-hover);
  box-shadow: 0 4px 8px var(--btn-primary-shadow-hover);
  transform: translateY(-1px);
}

.submit-btn:active {
  transform: translateY(0);
}

h2, h3 {
  color: var(--color-text-primary);
  margin-bottom: 1rem;
}

h3 {
  font-size: 1.125rem;
  margin-top: 1.5rem;
}
</style>
</template>