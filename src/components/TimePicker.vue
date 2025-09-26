<template>
    <div class="time-picker">
        <div class="time-inputs-container">
            <input
                ref="hourInput"
                type="text"
                :value="displayHour"
                inputmode="numeric"
                pattern="[0-9]*"
                class="time-input"
                :class="{ 'has-error': showValidation && !isValidHour }"
                placeholder="HH"
                @input="onHourInput"
                @blur="onHourBlur"
                @focus="onHourFocus"
                @click="onHourFocus"
                @keydown="onHourKeydown"
            />
            <span class="time-separator">:</span>
            <input
                type="text"
                :value="displayMinute"
                inputmode="numeric"
                pattern="[0-9]*"
                class="time-input"
                :class="{ 'has-error': showValidation && !isValidMinute }"
                placeholder="MM"
                @input="onMinuteInput"
                @blur="onMinuteBlur"
                @focus="onMinuteFocus"
                @click="onMinuteFocus"
                @keydown="onMinuteKeydown"
            />
        </div>
        <div class="ampm-group">
            <button
                type="button"
                :class="{ active: modelValue.ampm === 'AM' }"
                @click="setAMPM('AM')"
            >
                AM
            </button>
            <button
                type="button"
                :class="{ active: modelValue.ampm === 'PM' }"
                @click="setAMPM('PM')"
            >
                PM
            </button>
        </div>
    </div>
    <div v-if="showValidation && validationMessage" class="validation-error">
        {{ validationMessage }}
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

// Template refs
const hourInput = ref<HTMLInputElement>();

const props = defineProps<{
    modelValue: { hour: string; minute: string; ampm: "AM" | "PM" };
}>();
const emit = defineEmits(["update:modelValue"]);

const showValidation = ref(false);
const hourTouched = ref(false);
const minuteTouched = ref(false);

const displayHour = computed(() => {
    // Allow empty values for better UX
    if (!props.modelValue.hour || props.modelValue.hour === '') return '';
    
    // Convert 24h to 12h for display
    let h = Number(props.modelValue.hour);
    if (isNaN(h)) return '';
    if (h === 0) return "12";
    if (h > 12) return String(h - 12);
    return String(h);
});

const displayMinute = computed(() => {
    // Allow empty values for better UX
    if (!props.modelValue.minute || props.modelValue.minute === '') return '';
    return props.modelValue.minute;
});

const isValidHour = computed(() => {
    if (!props.modelValue.hour || props.modelValue.hour === '') return false;
    const h = Number(props.modelValue.hour);
    return !isNaN(h) && h >= 0 && h <= 23;
});

const isValidMinute = computed(() => {
    if (!props.modelValue.minute || props.modelValue.minute === '') return false;
    const m = Number(props.modelValue.minute);
    return !isNaN(m) && m >= 0 && m <= 59;
});

const validationMessage = computed(() => {
    if (!showValidation.value) return '';
    
    const errors = [];
    if (hourTouched.value && !isValidHour.value) {
        errors.push('Hour must be between 1-12');
    }
    if (minuteTouched.value && !isValidMinute.value) {
        errors.push('Minutes must be between 0-59');
    }
    
    return errors.join(', ');
});

function onHourInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const value = input.value;
    
    // Allow empty values
    if (value === '') {
        emit("update:modelValue", {
            hour: '',
            minute: props.modelValue.minute,
            ampm: props.modelValue.ampm,
        });
        return;
    }
    
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue !== value) {
        input.value = numericValue;
    }
    
    // Convert to 24h format for storage
    const h = Number(numericValue);
    if (!isNaN(h) && h >= 1 && h <= 12) {
        const ampm = props.modelValue.ampm || "AM";
        const hour24 = ampm === "PM" ? (h === 12 ? 12 : h + 12) : h === 12 ? 0 : h;
        emit("update:modelValue", {
            hour: String(hour24),
            minute: props.modelValue.minute,
            ampm,
        });
    } else {
        // Store the raw input for validation later
        emit("update:modelValue", {
            hour: numericValue,
            minute: props.modelValue.minute,
            ampm: props.modelValue.ampm,
        });
    }
}

function onMinuteInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const value = input.value;
    
    // Allow empty values
    if (value === '') {
        emit("update:modelValue", {
            hour: props.modelValue.hour,
            minute: '',
            ampm: props.modelValue.ampm,
        });
        return;
    }
    
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue !== value) {
        input.value = numericValue;
    }
    
    // Limit to 2 digits and valid range
    const limitedValue = numericValue.slice(0, 2);
    emit("update:modelValue", {
        hour: props.modelValue.hour,
        minute: limitedValue,
        ampm: props.modelValue.ampm,
    });
}

function onHourFocus(e: Event) {
    const input = e.target as HTMLInputElement;
    // Select all text for easy replacement
    setTimeout(() => input.select(), 0);
}

function onMinuteFocus(e: Event) {
    const input = e.target as HTMLInputElement;
    // Select all text for easy replacement
    setTimeout(() => input.select(), 0);
}

function onHourBlur() {
    hourTouched.value = true;
    showValidation.value = true;
}

function onMinuteBlur() {
    minuteTouched.value = true;
    showValidation.value = true;
}

function onHourKeydown(e: KeyboardEvent) {
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
        return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
    }
}

function onMinuteKeydown(e: KeyboardEvent) {
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
        return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
    }
}

function setAMPM(ampm: "AM" | "PM") {
    let h = Number(props.modelValue.hour);
    if (isNaN(h) || props.modelValue.hour === '') {
        // If hour is empty or invalid, just update AM/PM
        emit("update:modelValue", {
            hour: props.modelValue.hour,
            minute: props.modelValue.minute,
            ampm,
        });
        return;
    }
    
    // Convert between AM/PM
    if (ampm === "AM" && h >= 12) h = h - 12;
    if (ampm === "PM" && h < 12) h = h + 12;
    
    emit("update:modelValue", {
        hour: String(h),
        minute: props.modelValue.minute,
        ampm,
    });
}

// Expose focus method for parent components
function focusHour() {
    if (hourInput.value) {
        hourInput.value.focus();
        hourInput.value.select();
    }
}

// Expose the focus method
defineExpose({
    focusHour
});
</script>

<style scoped>
.time-picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.time-inputs-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.time-input {
    height: 4rem;
    text-align: center;
    font-size: 2rem !important;
    padding: 0.25em 0.5em;
    border-radius: 15px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(255, 255, 255, 0.05);
    color: white;
    transition: all 0.2s ease;
    box-sizing: border-box;
}

.time-input:focus {
    outline: none;
    border-color: #9c27b0;
    background-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.2);
}

.time-input.has-error {
    border-color: #f44336;
    background-color: rgba(244, 67, 54, 0.1);
}

.time-input.has-error:focus {
    border-color: #f44336;
    box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.2);
}

.time-separator {
    font-size: 2rem;
    color: white;
    font-weight: bold;
}

.ampm-group {
    display: flex;
    gap: 0.25rem;
    margin-left: 0.5rem;
}

.ampm-group button {
    background: rgba(255, 255, 255, 0.05);
    color: var(--color-periwinkle);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 0.5em 0.75em;
    font-size: 1em;
    cursor: pointer;
    transition: all 0.2s ease;
    font-weight: 500;
}

.ampm-group button:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.2);
    color: white;
}

.ampm-group button.active {
    background: linear-gradient(135deg, #9c27b0, #7b1fa2);
    color: #fff;
    font-weight: bold;
    border-color: #9c27b0;
    box-shadow: 0 0 0 3px rgba(156, 39, 176, 0.2);
}

.validation-error {
    font-size: 0.875rem;
    color: #f44336;
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    background-color: rgba(244, 67, 54, 0.1);
    border-radius: 8px;
    border-left: 3px solid #f44336;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
    .time-input {
        font-size: 2rem !important;
        padding: 0.5em;
        min-height: 44px;
    }

    .ampm-group button {
        padding: 0.75em 1em;
        min-height: 44px;
    }
}
</style>
