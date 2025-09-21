<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import XIcon from '../assets/icons/x.svg';

interface Props {
  isOpen: boolean;
  title?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  maxWidth?: string;
  padding?: string;
}

interface Emits {
  (e: "close"): void;
  (e: "backdrop-click"): void;
}

const props = withDefaults(defineProps<Props>(), {
  showCloseButton: true,
  closeOnBackdrop: true,
  maxWidth: "600px",
  padding: "1.5rem",
});

const emit = defineEmits<Emits>();

const modalRef = ref<HTMLElement>();
const contentRef = ref<HTMLElement>();
let previousActiveElement: HTMLElement | null = null;

// Handle backdrop click
function handleBackdropClick(event: MouseEvent | TouchEvent) {
  if (event.target === event.currentTarget && props.closeOnBackdrop) {
    emit("backdrop-click");
    emit("close");
  }
}

// Handle keyboard events
function handleKeydown(event: KeyboardEvent) {
  if (!props.isOpen) return;

  switch (event.key) {
    case "Escape":
      if (props.closeOnBackdrop) {
        event.preventDefault();
        event.stopPropagation();
        emit("close");
      }
      break;
    case "Enter":
      // If Enter is pressed and we're not in a textarea or input, trigger save button
      const target = event.target as HTMLElement;
      if (target && !['TEXTAREA', 'INPUT'].includes(target.tagName)) {
        const modal = modalRef.value;
        if (modal) {
          const saveButton = modal.querySelector('.btn-save:not(:disabled)') as HTMLButtonElement;
          if (saveButton) {
            event.preventDefault();
            event.stopPropagation();
            saveButton.click();
          }
        }
      }
      break;
  }
}

// Focus trap functionality
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

  if (focusableElements.length === 0) return;

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

// Setup modal when opened
function setupModal() {
  // Store the previously focused element
  previousActiveElement = document.activeElement as HTMLElement;

  // Lock body scroll and prevent mobile viewport issues
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";

  // Add event listeners
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("keydown", trapFocus, true);

  // Focus the modal container instead of first input to prevent unwanted keyboard activation
  nextTick(() => {
    try {
      if (modalRef.value) {
        modalRef.value.focus();
      }
    } catch (error) {
      console.warn("Could not focus modal element:", error);
    }
  });
}

// Cleanup modal when closed
function cleanupModal() {
  // Restore body scroll and positioning
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
  document.body.style.height = "";

  // Remove event listeners
  document.removeEventListener("keydown", handleKeydown, true);
  document.removeEventListener("keydown", trapFocus, true);

  // Restore focus to previously active element
  if (previousActiveElement) {
    try {
      previousActiveElement.focus();
    } catch (error) {
      console.warn("Could not restore focus:", error);
    }
    previousActiveElement = null;
  }
}

// Watch for isOpen changes
onMounted(() => {
  if (props.isOpen) {
    setupModal();
  }
});

onUnmounted(() => {
  cleanupModal();
});

// Expose setup/cleanup for parent components that manage the prop reactively
defineExpose({
  setupModal,
  cleanupModal,
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal" appear>
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="handleBackdropClick"
        @touchstart.passive="handleBackdropClick"
      >
        <div
          ref="modalRef"
          class="modal-container"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          :style="{
            maxWidth: maxWidth,
          }"
          @click.stop
        >
          <!-- Header -->
          <header
            v-if="title || showCloseButton || $slots.header"
            class="modal-header"
          >
            <div class="modal-header-content">
              <slot name="header">
                <h2 v-if="title" class="modal-title">{{ title }}</h2>
              </slot>
            </div>
            <button
              v-if="showCloseButton"
              class="modal-close-button"
              type="button"
              aria-label="Close modal"
              @click="emit('close')"
            >
              <img :src="XIcon" class="close-icon" aria-hidden="true" alt="" />
            </button>
          </header>

          <!-- Content -->
          <main ref="contentRef" class="modal-content">
            <slot />
          </main>

          <!-- Footer -->
          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--shadow-overlay, rgba(0, 0, 0, 0.6));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(2px);
  overflow-y: auto;
}

/* Modal Container */
.modal-container {
  position: relative;
  background: var(--color-bg-primary);
  border-radius: 1rem;
  width: 100%;
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  box-shadow: var(--shadow-2xl);
  outline: none;
  display: flex;
  flex-direction: column;
  color: var(--color-text-primary);
  margin: auto;
}

/* Header */
.modal-header {
  align-items: center;
  justify-content: space-between;
  padding: 2rem 1rem;
  flex-shrink: 0;
}

.modal-header-content {
  flex: 1;
  min-width: 0;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
}

.modal-close-button {
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: var(--color-surface);
  border-radius: 50%;
  cursor: pointer;
  position: absolute;
  top:1rem;
  right:1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 1rem;
}

.modal-close-button:hover {
  background: var(--color-surface-hover);
  transform: scale(1.05);
}

.modal-close-button:focus {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.close-icon {
  width: 1.5rem;
  height: 1.5rem;
  filter: brightness(0) invert(1) opacity(0.8);
  transition: all 0.2s ease;
}

[data-theme="light"] .close-icon {
  filter: brightness(0) invert(0) opacity(0.8);
}

.modal-close-button:hover .close-icon {
  filter: brightness(0) invert(1) opacity(1);
  transform: scale(1.1);
}

[data-theme="light"] .modal-close-button:hover .close-icon {
  filter: brightness(0) invert(0) opacity(1);
  transform: scale(1.1);
}

/* Content */
.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 2rem;
  padding-bottom:100px;
}

/* Footer */
.modal-footer {
  padding: 1rem;
  border-top: 1px solid var(--color-surface-border);
  background-color: var(--color-bg-primary);
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  position: absolute;
  bottom:0;
  left:0;
  right:0;
  min-height: 60px; /* Ensure minimum height for buttons */
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9) translateY(2rem);
}

.modal-enter-to .modal-container,
.modal-leave-from .modal-container {
  transform: scale(1) translateY(0);
}

/* Mobile Responsiveness - Full Screen on Mobile */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
    height: 100vh;
    height: 100dvh; /* Use dynamic viewport height for better mobile support */
  }

  .modal-container {
    border-radius: 0;
    max-width: none !important;
    max-height: none;
    height: 100vh;
    height: 100dvh; /* Use dynamic viewport height */
    width: 100vw;
    margin: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    padding: 1rem;
    flex-shrink: 0;
  }

  .modal-title {
    font-size: 1.25rem;
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 1.5rem 1rem 1.5rem;
    /* Use CSS custom properties for precise height calculation */
    --header-height: 80px;
    --footer-height: 120px;
    max-height: calc(100vh - var(--header-height) - var(--footer-height));
    max-height: calc(100dvh - var(--header-height) - var(--footer-height));
    min-height: 0; /* Allow flex shrinking */
  }

  .modal-footer {
    padding: 1rem;
    flex-shrink: 0;
    background: var(--color-bg-primary);
    border-top: 1px solid var(--color-surface-border);
    flex-direction: column;
    gap: 0.75rem;
    position: relative; /* Remove sticky positioning */
    bottom: auto;
    z-index: auto;
  }

  /* Ensure button groups stack properly on mobile */
  .modal-footer .btn-group,
  .modal-footer .btn-group-end,
  .modal-footer .btn-group-split {
    width: 100%;
    flex-direction: column;
  }

  /* Make individual buttons full width on mobile for better touch targets */
  .modal-footer .btn {
    width: 100%;
    min-height: 48px; /* Minimum touch target size */
    padding: 1rem;
    font-size: 1rem;
  }

  .modal-close-button {
    width: 2.5rem;
    height: 2.5rem;
  }

  .close-icon {
    width: 1.25rem;
    height: 1.25rem;
  }
}

/* Tablet Responsiveness */
@media (max-width: 1024px) and (min-width: 769px) {
  .modal-overlay {
    padding: 1rem;
  }

  .modal-container {
    max-width: calc(100vw - 2rem);
    max-height: calc(100vh - 2rem);
  }
}

/* Large Screen Adjustments */
@media (min-width: 1200px) {
  .modal-overlay {
    padding: 2rem;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-close-button {
    transition: none;
  }

  .modal-enter-from .modal-container,
  .modal-leave-to .modal-container {
    transform: none;
  }
}

/* Focus Styles */
.modal-close-button:focus {
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

/* Theme Support - handled by CSS variables */

/* Print Styles */
@media print {
  .modal-overlay {
    position: static;
    background: none;
    padding: 0;
  }

  .modal-container {
    box-shadow: none;
    border: 1px solid var(--color-surface-border);
    page-break-inside: avoid;
  }

  .modal-close-button {
    display: none;
  }
}
</style>
