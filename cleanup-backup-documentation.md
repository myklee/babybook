# Cleanup Backup Documentation

This document serves as a backup record of all files that will be removed during the codebase cleanup process. This allows for potential recovery if any file is needed later.

## Vue Components to be Removed

### 1. ExampleModalUsage.vue

- **Location:** src/components/ExampleModalUsage.vue
- **Reason:** Demo/example component not used in production
- **Last Modified:** [To be checked during removal]
- **Size:** [To be checked during removal]

### 2. FoodItemManager.vue

- **Location:** src/components/FoodItemManager.vue
- **Reason:** No imports found, unused component
- **Last Modified:** [To be checked during removal]
- **Size:** [To be checked during removal]

### 3. FormComponentsDemo.vue

- **Location:** src/components/FormComponentsDemo.vue
- **Reason:** Demo component for form elements
- **Last Modified:** [To be checked during removal]
- **Size:** [To be checked during removal]

### 4. NursingSessionDisplay.vue

- **Location:** src/components/NursingSessionDisplay.vue
- **Reason:** Legacy component, no current imports found
- **Last Modified:** [To be checked during removal]
- **Size:** [To be checked during removal]

### 5. RetryButton.vue

- **Location:** src/components/RetryButton.vue
- **Reason:** No imports found, unused utility component
- **Last Modified:** [To be checked during removal]
- **Size:** [To be checked during removal]

### 6. SolidFoodHistory.vue

- **Location:** src/components/SolidFoodHistory.vue
- **Reason:** Deprecated, replaced by new solid food system
- **Last Modified:** [To be checked during removal]
- **Size:** [To be checked during removal]

### 7. SolidFoodInput.vue

- **Location:** src/components/SolidFoodInput.vue
- **Reason:** Deprecated, replaced by new solid food system
- **Last Modified:** [To be checked during removal]
- **Size:** [To be checked during removal]

### 8. ThemePerformanceTest.vue

- **Location:** src/components/ThemePerformanceTest.vue
- **Reason:** Performance testing component, not for production
- **Last Modified:** [To be checked during removal]
- **Size:** [To be checked during removal]

## HTML Test Files to be Removed

### Root Directory Test Files:

1. integration-test.html - Integration testing file
2. test-dropdown-opacity-comprehensive.html - Dropdown opacity testing
3. test-dropdown-opacity.html - Dropdown opacity testing
4. test-food-item-manager.html - Food item manager testing
5. test-form-components.html - Form components testing
6. test-modal-themes.html - Modal theme testing
7. test-solid-food-event-modal.html - Solid food event modal testing
8. test-solid-food-timeline-history.html - Solid food timeline testing
9. test-timepicker-ux.html - TimePicker UX testing
10. theme-performance-test.html - Theme performance testing
11. theme-test.html - Theme functionality testing

## JavaScript Debug/Test Files to be Removed

### Root Directory Debug/Test Files:

1. debug-solid-food-delete.js - Solid food deletion debugging
2. test-account-level-pumping.js - Account level pumping testing
3. test-and-element-removal.js - Element removal testing
4. test-baby-independent-edit.js - Baby independent edit testing
5. test-baby-independent-ui.js - Baby independent UI testing
6. test-context-aware-confirmation.js - Context aware confirmation testing
7. test-delete-functionality.js - Delete functionality testing
8. test-feeding-addition-logic.js - Feeding addition logic testing
9. test-feeding-schedule-validation.js - Feeding schedule validation testing
10. test-food-management.js - Food management testing
11. test-migration-016.js - Migration 016 testing
12. test-nursing-methods.js - Nursing methods testing
13. test-pumping-timer-modal.js - Pumping timer modal testing
14. test-solid-food-delete-comprehensive.js - Comprehensive solid food delete testing
15. test-solid-food-delete-fix.js - Solid food delete fix testing
16. test-solid-food-delete-recent-feedings.js - Recent feedings delete testing
17. test-solid-food-event-management.js - Solid food event management testing
18. test-solid-food-schedule-integration.js - Solid food schedule integration testing
19. test-space-saving-modals.js - Space saving modals testing
20. test-theme-functionality.js - Theme functionality testing
21. test-theme-performance.js - Theme performance testing

## SQL Verification Files to be Removed

1. verify-migration-016.sql - Migration 016 verification script

## Task Summary and Documentation Files to be Removed

### Task Completion Summaries:

1. task-11-complete-feature-validation-summary.md
2. task-11-requirements-verification.md
3. task-11-typescript-fixes-summary.md
4. task-4-solid-food-event-management-summary.md
5. task-5-solid-food-event-modal-verification.md
6. task-5-verification.md
7. task-7-implementation-summary.md
8. task-8-feeding-schedule-integration-verification.md
9. task-9-verification.md

### Debugging Session Documentation:

1. solid-food-add-error-fix-summary.md
2. solid-food-delete-debugging-summary.md
3. solid-food-delete-fix-summary.md
4. solid-food-edit-delete-functionality-summary.md
5. solid-food-edit-modal-fix-summary.md
6. solid-food-remove-functionality-summary.md
7. auto-focus-hour-field-summary.md
8. database-function-name-fix-summary.md
9. modal-focus-test.md
10. save-button-enter-key-support.md

### Performance and Migration Reports:

1. PERFORMANCE_OPTIMIZATION_SUMMARY.md
2. theme-performance-optimization-report.md
3. migration-completion-summary.md
4. component-migration-report.md
5. integration-testing-summary.md
6. integration-test-report.md
7. feeding-schedule-validation-report.md
8. homepage-solid-food-button-update.md

### Testing Checklists and Guides:

1. THEME_TESTING_CHECKLIST.md
2. migration-016-testing-guide.md
3. timepicker-ux-improvements-summary.md
4. accessibility-test-pumping.md

## Files to Preserve (DO NOT REMOVE)

### Essential Project Documentation:

- README.md
- CLAUDE.md
- All files in .kiro/specs/ directory
- All configuration files (package.json, tsconfig.json, vite.config.ts, etc.)

### Legitimate Test Infrastructure:

- All files in src/tests/ directory
- All files in scripts/ directory (build and deployment scripts)
- All files in supabase/migrations/ directory

### Active Development Files:

- All files in src/ directory (except components marked for removal)
- All files in android/ and ios/ directories
- All files in public/ directory

## Recovery Instructions

If any removed file needs to be recovered:

1. Check this backup documentation for the original location
2. Use git history to recover the file: `git checkout HEAD~1 -- <file_path>`
3. Or restore from backup if available

## Verification Checklist

Before removing each file:

- [ ] Verify file is not imported anywhere in codebase
- [ ] Check git history for recent changes
- [ ] Confirm file size and last modified date
- [ ] Update this backup documentation with actual file details

## Post-Cleanup Verification

After cleanup:

- [ ] Run build process to ensure no broken imports
- [ ] Test application startup and basic functionality
- [ ] Run test suite to verify no functionality broken
- [ ] Check for any orphaned imports or references
