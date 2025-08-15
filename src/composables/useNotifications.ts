import { ref, reactive } from 'vue'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
}

interface NotificationState {
  notifications: Notification[]
}

const state = reactive<NotificationState>({
  notifications: []
})

let notificationId = 0

export function useNotifications() {
  const notifications = ref(state.notifications)

  const addNotification = (notification: Omit<Notification, 'id'>): string => {
    const id = `notification-${++notificationId}`
    const newNotification: Notification = {
      id,
      duration: 5000, // Default 5 seconds
      ...notification
    }

    state.notifications.push(newNotification)

    // Auto-remove notification after duration (unless persistent)
    if (!newNotification.persistent && newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.duration)
    }

    return id
  }

  const removeNotification = (id: string) => {
    const index = state.notifications.findIndex(n => n.id === id)
    if (index > -1) {
      state.notifications.splice(index, 1)
    }
  }

  const clearAllNotifications = () => {
    state.notifications.splice(0)
  }

  // Convenience methods for different notification types
  const showSuccess = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    })
  }

  const showError = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 8000, // Longer duration for errors
      ...options
    })
  }

  const showWarning = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration: 6000,
      ...options
    })
  }

  const showInfo = (title: string, message?: string, options?: Partial<Notification>) => {
    return addNotification({
      type: 'info',
      title,
      message,
      ...options
    })
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}