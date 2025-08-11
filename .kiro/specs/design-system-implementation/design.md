# Design System Implementation - Design Document

## Overview

This design implements theme switching UI and component migration to use the existing design system. The focus is on practical implementation with immediate visual benefits while keeping complexity minimal.

## Architecture

### Theme Management

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   useTheme      │────│  Theme Switcher  │────│   User Choice   │
│   Composable    │    │   Component      │    │   (L/D/Auto)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  localStorage   │    │  CSS Variables   │    │  System Theme   │
│   Persistence   │    │   Application    │    │   Detection     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Component Migration Strategy

```
Phase 1: Core UI Components
├── Theme Switcher (new)
├── Modal Components (update existing)
└── Form Components (create new)

Phase 2: Page Components
├── HomePage
├── ProfilePage
└── BabyHistoryPage
```

## Components and Interfaces

### 1. Theme Switcher Component

**Location:** `src/components/ThemeSwitcher.vue`

**Props:**

- `variant?: 'dropdown' | 'toggle'` - UI variant (default: dropdown)
- `size?: 'sm' | 'md' | 'lg'` - Component size (default: md)

**Features:**

- Light, Dark, and Auto theme options
- Immediate theme application
- System preference detection
- Theme preference persistence
- _Addresses Requirements: 1.1, 1.2, 1.3, 1.4_

### 2. Form Components

**Location:** `src/components/forms/`

**Components:**

- `FormInput.vue` - Themed input component
- `FormTextarea.vue` - Themed textarea
- `FormLabel.vue` - Consistent label styling

**Purpose:** Provide consistent form styling across themes

- _Addresses Requirements: 2.3, 3.3_

### 3. Enhanced Components

**Updates to existing components:**

- ResponsiveModal - Use design system variables
- Button components - Already using shared styles
- Timer components - Migrate hardcoded colors

**Purpose:** Ensure all components use design system variables

- _Addresses Requirements: 2.1, 2.2_

## Data Models

### Theme Configuration

```typescript
interface ThemeConfig {
  name: "light" | "dark" | "auto";
  label: string;
}

interface ThemeState {
  current: "light" | "dark" | "auto";
  systemPreference: "light" | "dark";
}
```

## Error Handling

### Theme Loading

- Fallback to 'auto' theme if stored theme is invalid
- Graceful degradation if CSS variables aren't supported

### Component Migration

- Backward compatibility with existing color variables
- Progressive enhancement approach

## Testing Strategy

### Basic Testing

1. **Theme Switching**

   - Verify theme application across components
   - Test theme persistence after page reload
   - Validate system preference detection

2. **Component Migration**
   - Visual comparison before/after migration
   - Ensure functionality is preserved

## Implementation Phases

### Phase 1: Theme Infrastructure

- Create ThemeSwitcher component
- Enhance useTheme composable
- Test theme switching functionality

### Phase 2: Component Migration

- Update modal components to use design system variables
- Create basic form components
- Migrate timer components

### Phase 3: Page Integration

- Update HomePage styling
- Migrate ProfilePage and BabyHistoryPage
- Final integration testing

## Migration Guidelines

### Color Migration Map

```css
/* Old → New */
--color-periwinkle → --color-text-accent
--color-midnight → --color-bg-secondary
#1a1a2e → var(--color-bg-primary)
rgba(255, 255, 255, 0.05) → var(--color-surface)
```

### Component Update Pattern

```vue
<!-- Before -->
<style scoped>
.component {
  background: #1a1a2e;
  color: rgba(255, 255, 255, 0.8);
}
</style>

<!-- After -->
<style scoped>
.component {
  background: var(--color-bg-primary);
  color: var(--color-text-tertiary);
}
</style>
```

## Performance Considerations

- Minimize CSS variable recalculation during theme switches
- Use CSS containment where appropriate
- Optimize theme switching transitions
