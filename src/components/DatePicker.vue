<template>
    <div class="date-picker">
        <input :id="id" type="date" :value="modelValue"
            @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" required class="date-input"
            @focus="handleFocus" />
    </div>
</template>

<script setup lang="ts">
interface Props {
    modelValue: string
    id?: string
}

withDefaults(defineProps<Props>(), {
    id: 'date-picker'
})

defineEmits<{
    'update:modelValue': [value: string]
}>()

const handleFocus = (event: FocusEvent) => {
    const target = event.target as HTMLInputElement
    target.select()
}
</script>

<style scoped>
.date-picker {
    width: 100%;
}

.date-input {
    width: 100%;
    padding: 1rem 1.25rem;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 15px;
    background-color: rgba(255, 255, 255, 0.05);
    color: white;
    font-size: 1rem;
    transition: all 0.2s ease;
    font-family: inherit;
    box-sizing: border-box;
}

.date-input:focus {
    outline: none;
    border-color: #9c27b0;
    background-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.2);
}

.date-input:invalid {
    border-color: #ef4444;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .date-input {
        padding: 1rem;
        font-size: 16px;
        /* Prevents zoom on iOS */
        min-height: 44px;
        /* Better touch target */
    }
}
</style>