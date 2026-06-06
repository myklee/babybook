# ScheduleTriggerButton Component Usage Guide

## Overview

The `ScheduleTriggerButton` is a reusable button component designed for triggering feeding schedules. It provides a consistent UI with loading states, success/error feedback, and proper accessibility features.

## Features

- **Display schedule information**: Shows schedule name and feeding type with appropriate icons
- **Loading state**: Visual feedback during feeding entry creation
- **Success/Error feedback**: Built-in visual feedback with automatic timeout
- **Accessibility**: Proper ARIA labels, keyboard navigation, and screen reader support
- **Responsive design**: Adapts to different screen sizes
- **Theme support**: Works with dark, light, and high-contrast themes
- **Reduced motion support**: Respects user's motion preferences

## Basic Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import ScheduleTriggerButton from "./ScheduleTriggerButton.vue";
import type { FeedingSchedule } from "../types/feedingScheduleAutomation";

const schedule = ref<FeedingSchedule>({
  id: "schedule-1",
  baby_id: "baby-1",
  user_id: "user-1",
  name: "Morning Formula",
  feeding_type: "formula",
  default_amount: 120,
  is_active: true,
  created_at: "2024-01-01T08:00:00Z",
  updated_at: "2024-01-01T08:00:00Z",
  usage_count: 5,
});

const isLoading = ref(false);

async function handleTrigger(schedule: FeedingSchedule) {
  isLoading.value = true;
  // Trigger the schedule...
  isLoading.value = false;
}
</script>

<template>
  <ScheduleTriggerButton
    :schedule="schedule"
    :is-loading="isLoading"
    @trigger="handleTrigger"
  />
</template>
```

## Props

### `schedule` (required)

- **Type**: `FeedingSchedule`
- **Description**: The feeding schedule object to display and trigger

### `isLoading` (optional)

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Shows loading state with spinner overlay

### `showAmount` (optional)

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to display the default amount for formula schedules

### `compact` (optional)

- **Type**: `boolean`
- **Default**: `false`
- **Description**: Renders a more compact version of the button

## Events

### `@trigger`

- **Payload**: `FeedingSchedule`
- **Description**: Emitted when the button is clicked
- **Example**:

```vue
<ScheduleTriggerButton :schedule="schedule" @trigger="handleTrigger" />
```

## Exposed Methods

The component exposes methods for showing feedback, which can be accessed via template refs:

### `showSuccess()`

Shows success feedback overlay for 2 seconds

### `showError()`

Shows error feedback overlay for 3 seconds

### Example with Feedback

```vue
<script setup lang="ts">
import { ref } from "vue";
import ScheduleTriggerButton from "./ScheduleTriggerButton.vue";

const buttonRef = ref<InstanceType<typeof ScheduleTriggerButton>>();

async function handleTrigger(schedule: FeedingSchedule) {
  try {
    await triggerSchedule(schedule);
    buttonRef.value?.showSuccess();
  } catch (error) {
    buttonRef.value?.showError();
  }
}
</script>

<template>
  <ScheduleTriggerButton
    ref="buttonRef"
    :schedule="schedule"
    @trigger="handleTrigger"
  />
</template>
```

## Advanced Usage: Multiple Buttons with Refs

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ScheduleTriggerButton from './ScheduleTriggerButton.vue'

const schedules = ref<FeedingSchedule[]>([...])
const buttonRefs = ref<Record<string, InstanceType<typeof ScheduleTriggerButton>>>({})

function setButtonRef(scheduleId: string, el: any) {
  if (el) {
    buttonRefs.value[scheduleId] = el
  }
}

async function handleTrigger(schedule: FeedingSchedule) {
  try {
    await triggerSchedule(schedule)
    buttonRefs.value[schedule.id]?.showSuccess()
  } catch (error) {
    buttonRefs.value[schedule.id]?.showError()
  }
}
</script>

<template>
  <ScheduleTriggerButton
    v-for="schedule in schedules"
    :key="schedule.id"
    :ref="(el) => setButtonRef(schedule.id, el)"
    :schedule="schedule"
    @trigger="handleTrigger"
  />
</template>
```

## Styling

The component uses CSS custom properties from the design system:

- `--color-feeding-breast`: Background color for breast feeding buttons
- `--color-feeding-formula`: Background color for formula feeding buttons
- `--color-feeding-solid`: Background color for solid food buttons
- `--color-success`: Success feedback color
- `--color-error`: Error feedback color
- `--color-focus`: Focus outline color
- `--transition-*`: Transition timing variables

## Accessibility Features

1. **ARIA Labels**: Descriptive labels for screen readers
2. **ARIA Busy**: Indicates loading state to assistive technologies
3. **ARIA Live**: Announces feedback to screen readers
4. **Keyboard Navigation**: Full keyboard support with visible focus indicators
5. **Role Attributes**: Proper semantic roles for interactive elements
6. **Reduced Motion**: Respects `prefers-reduced-motion` setting

## Feeding Type Icons

The component automatically selects the appropriate icon based on the feeding type:

- **Breast**: Baby bottle icon
- **Formula**: Flask icon
- **Solid**: Spoon icon

## Responsive Behavior

- **Mobile (<480px)**: Compact layout with smaller icons and text
- **Tablet (480px-768px)**: Standard layout
- **Desktop (>768px)**: Larger minimum width for better touch targets

## Theme Support

The component adapts to the current theme:

- **Dark Theme**: Default styling with light text on dark backgrounds
- **Light Theme**: Adjusted colors for light backgrounds
- **High Contrast**: Enhanced borders and focus indicators

## Best Practices

1. **Always handle the trigger event**: Implement proper error handling
2. **Use loading state**: Set `isLoading` to true during async operations
3. **Provide feedback**: Use `showSuccess()` or `showError()` methods
4. **Keep schedule names concise**: Long names may wrap on small screens
5. **Test with keyboard**: Ensure full keyboard accessibility
6. **Test with screen readers**: Verify ARIA labels are descriptive

## Common Patterns

### Pattern 1: Simple Trigger

```vue
<ScheduleTriggerButton :schedule="schedule" @trigger="triggerSchedule" />
```

### Pattern 2: With Loading State

```vue
<ScheduleTriggerButton
  :schedule="schedule"
  :is-loading="isLoading"
  @trigger="handleTrigger"
/>
```

### Pattern 3: Compact Mode

```vue
<ScheduleTriggerButton
  :schedule="schedule"
  :compact="true"
  @trigger="handleTrigger"
/>
```

### Pattern 4: Without Amount Display

```vue
<ScheduleTriggerButton
  :schedule="schedule"
  :show-amount="false"
  @trigger="handleTrigger"
/>
```

## Integration Example: QuickScheduleWidget

See `src/components/QuickScheduleWidget.vue` for a complete integration example showing:

- Multiple buttons with individual refs
- Loading state management
- Success/error feedback
- Notification integration
