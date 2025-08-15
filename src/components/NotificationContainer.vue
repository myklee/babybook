<template>
  <div class="notification-container">
    <TransitionGroup name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'notification',
          `notification--${notification.type}`
        ]"
        role="alert"
        :aria-live="notification.type === 'error' ? 'assertive' : 'polite'"
      >
        <div class="notification__content">
          <div class="notification__header">
            <h4 class="notification__title">{{ notification.title }}</h4>
            <button
              class="notification__close"
              @click="removeNotification(notification.id)"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
          <p v-if="notification.message" class="notification__message">
            {{ notification.message }}
          </p>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useNotifications } from '../composables/useNotifications'

const { notifications, removeNotification } = useNotifications()
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  max-width: 400px;
  width: 100%;
}

.notification {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 0.5rem;
  overflow: hidden;
  position: relative;
}

.notification--success {
  border-left: 4px solid var(--color-success);
}

.notification--error {
  border-left: 4px solid var(--color-error);
}

.notification--warning {
  border-left: 4px solid var(--color-warning);
}

.notification--info {
  border-left: 4px solid var(--color-info);
}

.notification__content {
  padding: 1rem;
}

.notification__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.notification__title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.4;
}

.notification__close {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.notification__close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.notification__close:focus {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.notification__message {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.4;
}

/* Transitions */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .notification-container {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
    max-width: none;
  }
  
  .notification__content {
    padding: 0.75rem;
  }
  
  .notification__title {
    font-size: 0.8125rem;
  }
  
  .notification__message {
    font-size: 0.75rem;
  }
}

/* Theme-specific colors */
:root {
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;
}

[data-theme="dark"] {
  --color-success: #34d399;
  --color-error: #f87171;
  --color-warning: #fbbf24;
  --color-info: #60a5fa;
}

[data-theme="high-contrast"] {
  --color-success: #00ff00;
  --color-error: #ff0000;
  --color-warning: #ffff00;
  --color-info: #0000ff;
}
</style>