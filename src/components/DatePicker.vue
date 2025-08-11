<template>
    <div class="date-picker">
        <input :id="id" type="date" :value="modelValue"
            @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" :required="required" class="date-input"
            @focus="handleFocus" />
    </div>
</template>

<script setup lang="ts">
interface Props {
    modelValue: string
    id?: string
    required?: boolean
}

withDefaults(defineProps<Props>(), {
    id: 'date-picker',
    required: true
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
    border-radius: 15px;
    background-color: var(--color-surface);
    color: var(--color-text-primary);
    font-size: 1rem;
    transition: all 0.2s ease;
    font-family: inherit;
    box-sizing: border-box;
    border: 1px solid var(--color-border);
}

.date-input:focus {
    outline: none;
    border-color: var(--color-border-focus);
    background-color: var(--color-surface-hover);
    box-shadow: 0 0 0 3px var(--color-focus-ring, rgba(99, 102, 241, 0.1));
}

.date-input:invalid {
    border-color: var(--color-error);
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