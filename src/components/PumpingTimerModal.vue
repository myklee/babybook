<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from "vue";
import DualBreastTimer from "./DualBreastTimer.vue";
import { useBabyStore } from "../stores/babyStore";
import { validatePumpingSession } from "../types/pumping";
import {
  getStorageValue,
  getInputStep,
  getUnitLabel,
} from "../lib/measurements";

interface Props {
  isOpen: boolean;
  babyId?: string | null; // Optional - for backward compatibility, but not used in UI
}

interface Emits {
  (e: "close"): void;
  (e: "save", session: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const babyStore = useBabyStore();
const modalRef = ref<HTMLElement>();
const dualTimerRef = ref<InstanceType<typeof DualBreastTimer>>();
const isSaving = ref(false);

// Form state (display values in current unit)
const leftDisplayAmount = ref<number | null>(null);
const rightDisplayAmount = ref<number | null>(null);
const notes = ref("");
const showAdvanced = ref(false);

// Validation state
const validationErrors = ref<string[]>([]);
const validationWarnings = ref<string[]>([]);

// Focus management
let previousActiveElement: HTMLElement | null = null;

// Computed properties for unit handling
const unitLabel = computed(() => getUnitLabel(babyStore.measurementUnit));
const inputStep = computed(() => getInputStep(babyStore.measurementUnit));
const totalDisplayAmount = computed(
  () => (leftDisplayAmount.value || 0) + (rightDisplayAmount.value || 0)
);

// Handle duration changes from DualBreastTimer
// Note: DualBreastTimer handles duration internally, we'll get the values in handleSave

// Handle amount input changes
function handleAmountChange() {
  validateForm();
}

// Validate the form (called when amounts change)
function validateForm() {
  // We can't validate duration here since it's managed by DualBreastTimer
  // Validation will happen in handleSave when we have the duration values
  validationErrors.value = [];
  validationWarnings.value = [];
}

// Handle save from dual timer
async function handleSave(
  leftDur: number,
  rightDur: number,
  _sessionNotes?: string,
  startTime?: Date
) {
  if (isSaving.value) return;

  // Convert display amounts to storage amounts (ml)
  const leftStorageAmount =
    leftDisplayAmount.value !== null
      ? getStorageValue(leftDisplayAmount.value, babyStore.measurementUnit)
      : null;
  const rightStorageAmount =
    rightDisplayAmount.value !== null
      ? getStorageValue(rightDisplayAmount.value, babyStore.measurementUnit)
      : null;

  // Validate before saving
  const validation = validatePumpingSession(
    leftDur,
    rightDur,
    leftStorageAmount,
    rightStorageAmount,
    startTime
  );

  if (!validation.is_valid) {
    validationErrors.value = validation.errors.map((e) => e.message);
    return;
  }

  isSaving.value = true;

  try {
    // Use the amounts from our form inputs and notes from our form (not from DualBreastTimer)
    const session = await babyStore.addPumpingSession(
      leftDur,
      rightDur,
      leftStorageAmount,
      rightStorageAmount,
      notes.value || undefined,
      startTime,
      props.babyId || null
    );

    emit("save", session);

    // Reset form
    resetForm();
    handleClose();
  } catch (error) {
    console.error("Error saving pumping session:", error);
    // Error handling is done in the store
  } finally {
    isSaving.value = false;
  }
}

// Handle cancel from dual timer
function handleCancel() {
  handleClose();
}

// Handle modal close
function handleClose() {
  emit("close");
}

// Reset form state
function resetForm() {
  leftDisplayAmount.value = null;
  rightDisplayAmount.value = null;
  notes.value = "";
  showAdvanced.value = false;
  validationErrors.value = [];
  validationWarnings.value = [];
}

// Handle backdrop click
function handleBackdropClick(event: MouseEvent | TouchEvent) {
  if (event.target === event.currentTarget) {
    handleCancel();
  }
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (!props.isOpen) return;

  switch (event.key) {
    case "Escape":
      event.preventDefault();
      event.stopPropagation();
      handleCancel();
      break;
  }
}

// Focus management
function trapFocus(event: KeyboardEvent) {
  if (!props.isOpen || event.key !== "Tab") return;

  const modal = modalRef.value;
  if (!modal) return;

  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[
    focusableElements.length - 1
  ] as HTMLElement;

  if (event.shiftKey) {
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

// Lifecycle management
onMounted(() => {
  if (props.isOpen) {
    setupModal();
  }
});

onUnmounted(() => {
  cleanupModal();
});

// Watch for isOpen changes
function setupModal() {
  // Store the previously focused element
  previousActiveElement = document.activeElement as HTMLElement;

  // Lock body scroll
  document.body.style.overflow = "hidden";

  // Add event listeners
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("keydown", trapFocus, true);

  // Focus the modal after next tick to ensure it's rendered
  nextTick(() => {
    if (modalRef.value) {
      modalRef.value.focus();
    }
  });
}

function cleanupModal() {
  // Restore body scroll
  document.body.style.overflow = "";

  // Remove event listeners
  document.removeEventListener("keydown", handleKeydown, true);
  document.removeEventListener("keydown", trapFocus, true);

  // Restore focus to previously active element
  if (previousActiveElement) {
    previousActiveElement.focus();
    previousActiveElement = null;
  }
}

// Watch for prop changes
watch(
  () => props.isOpen,
  (newValue, oldValue) => {
    if (newValue !== oldValue) {
      if (newValue) {
        setupModal();
      } else {
        cleanupModal();
      }
    }
  },
  { immediate: false }
);

// Watch for isOpen to reset form when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      resetForm();
    }
  }
);
</script>

<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    @click="handleBackdropClick"
    @touchstart.passive="handleBackdropClick"
  >
    <div
      ref="modalRef"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label="Pumping timer"
      tabindex="-1"
      @click.stop
    >
      <h3 class="modal-title">Pumping Timer</h3>

      <!-- Amount Display (only show if amounts are entered) -->
      <div v-if="totalDisplayAmount > 0" class="amount-summary">
        <span class="amount-display">
          {{ totalDisplayAmount }}{{ unitLabel }} total pumped
        </span>
      </div>

      <!-- Main content -->
      <div class="pumping-content">
        <!-- Timer Controls -->
        <DualBreastTimer
          ref="dualTimerRef"
          :baby-id="'pumping'"
          :baby-name="'Pumping'"
          :session-type="'pumping'"
          @save="handleSave"
          @cancel="handleCancel"
        />

        <!-- Amount Inputs -->
        <div class="amount-inputs">
          <h4 class="section-title">Amount Pumped</h4>
          <div class="amount-row">
            <div class="amount-input-group">
              <label for="left-amount">Left Breast ({{ unitLabel }})</label>
              <input
                id="left-amount"
                v-model.number="leftDisplayAmount"
                type="number"
                min="0"
                :step="inputStep"
                placeholder="0"
                class="amount-input"
                aria-describedby="left-amount-help"
                @input="handleAmountChange"
              />
              <div id="left-amount-help" class="sr-only">
                Enter the amount of milk pumped from the left breast in
                {{ unitLabel }}
              </div>
            </div>
            <div class="amount-input-group">
              <label for="right-amount">Right Breast ({{ unitLabel }})</label>
              <input
                id="right-amount"
                v-model.number="rightDisplayAmount"
                type="number"
                min="0"
                :step="inputStep"
                placeholder="0"
                class="amount-input"
                aria-describedby="right-amount-help"
                @input="handleAmountChange"
              />
              <div id="right-amount-help" class="sr-only">
                Enter the amount of milk pumped from the right breast in
                {{ unitLabel }}
              </div>
            </div>
          </div>
          <div
            v-if="totalDisplayAmount > 0"
            class="total-amount"
            role="status"
            aria-live="polite"
          >
            Total: {{ totalDisplayAmount }}{{ unitLabel }}
          </div>
        </div>

        <!-- More Options Toggle -->
        <div class="advanced-toggle">
          <button
            type="button"
            @click="showAdvanced = !showAdvanced"
            class="toggle-btn"
            :aria-expanded="showAdvanced"
            aria-controls="advanced-options"
            :aria-label="`${
              showAdvanced ? 'Hide' : 'Show'
            } additional options for notes`"
          >
            <span>{{ showAdvanced ? "Hide" : "More" }} Options</span>
            <span
              class="arrow"
              :class="{ rotated: showAdvanced }"
              aria-hidden="true"
              >▼</span
            >
          </button>
        </div>

        <!-- More Options -->
        <div v-if="showAdvanced" id="advanced-options" class="advanced-options">
          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea
              id="notes"
              v-model="notes"
              rows="2"
              placeholder="Optional notes..."
              maxlength="500"
              class="notes-textarea"
              aria-describedby="notes-help notes-counter"
            ></textarea>
            <div id="notes-help" class="sr-only">
              Add any additional notes about this pumping session
            </div>
            <div id="notes-counter" class="notes-counter" aria-live="polite">
              {{ notes.length }} of 500 characters used
            </div>
          </div>
        </div>

        <!-- Validation Messages -->
        <div
          v-if="validationErrors.length > 0"
          class="validation-errors"
          role="alert"
          aria-live="assertive"
        >
          <h5 class="sr-only">Validation Errors</h5>
          <div
            v-for="error in validationErrors"
            :key="error"
            class="error-message"
          >
            {{ error }}
          </div>
        </div>

        <div
          v-if="validationWarnings.length > 0"
          class="validation-warnings"
          role="alert"
          aria-live="polite"
        >
          <h5 class="sr-only">Validation Warnings</h5>
          <div
            v-for="warning in validationWarnings"
            :key="warning"
            class="warning-message"
          >
            {{ warning }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Amount Summary */
.amount-summary {
  text-align: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1.5rem;
}

.amount-display {
  font-size: 1rem;
  color: var(--color-periwinkle);
  font-weight: 600;
}

/* Main Content */
.pumping-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Amount Inputs */
.amount-inputs {
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: white;
  margin: 0 0 1rem 0;
  text-align: center;
}

.amount-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.amount-input-group {
  flex: 1;
}

.amount-input-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
  text-align: center;
}

.amount-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  text-align: center;
  transition: all 0.2s ease;
}

.amount-input:focus {
  outline: 3px solid var(--color-periwinkle);
  outline-offset: 2px;
  border-color: var(--color-periwinkle);
  background: rgba(255, 255, 255, 0.15);
}

.amount-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.total-amount {
  text-align: center;
  font-size: 0.875rem;
  color: var(--color-periwinkle);
  font-weight: 600;
}

/* Advanced Toggle */
.advanced-toggle {
  text-align: center;
}

.toggle-btn {
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: var(--color-periwinkle);
  text-decoration: underline;
}

.toggle-btn:focus {
  outline: 3px solid var(--color-periwinkle);
  outline-offset: 2px;
  border-radius: 4px;
}

.arrow {
  transition: transform 0.2s;
}

.arrow.rotated {
  transform: rotate(180deg);
}

/* Advanced Options */
.advanced-options {
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
}

.notes-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s ease;
}

.notes-textarea:focus {
  outline: 3px solid var(--color-periwinkle);
  outline-offset: 2px;
  border-color: var(--color-periwinkle);
  background: rgba(255, 255, 255, 0.15);
}

.notes-textarea::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.notes-counter {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
  margin-top: 0.25rem;
}

/* Validation Messages */
.validation-errors {
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
}

.error-message {
  font-size: 0.875rem;
  color: #fca5a5;
  margin-bottom: 0.25rem;
}

.error-message:last-child {
  margin-bottom: 0;
}

.validation-warnings {
  padding: 1rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 0.5rem;
}

.warning-message {
  font-size: 0.875rem;
  color: #fcd34d;
  margin-bottom: 0.25rem;
}

.warning-message:last-child {
  margin-bottom: 0;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.9) translateY(2rem);
}

.modal-enter-to .modal,
.modal-leave-from .modal {
  transform: scale(1) translateY(0);
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }

  .modal {
    border-radius: 0;
    max-width: none;
    max-height: none;
    height: 100vh;
    width: 100vw;
    padding: 1.5rem;
  }

  .modal-title {
    font-size: 1.25rem;
  }

  .amount-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .amount-inputs,
  .advanced-options {
    padding: 1rem;
  }
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .modal {
    border: 3px solid white;
    background: #000000;
  }

  .amount-input,
  .notes-textarea {
    border: 2px solid white;
    background: #000000;
    color: white;
  }

  .amount-input:focus,
  .notes-textarea:focus {
    border: 3px solid #ffff00;
    outline: 3px solid #ffff00;
  }

  .toggle-btn {
    color: white;
  }

  .toggle-btn:focus {
    outline: 3px solid #ffff00;
    background: #000000;
  }

  .validation-errors {
    background: #ff0000;
    color: white;
    border: 2px solid white;
  }

  .validation-warnings {
    background: #ffff00;
    color: black;
    border: 2px solid black;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .toggle-btn,
  .amount-input,
  .notes-textarea {
    transition: none;
  }

  .modal-enter-from .modal,
  .modal-leave-to .modal {
    transform: none;
  }

  .arrow {
    transition: none;
  }
}
</style>
