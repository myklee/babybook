# Requirements Document

## Introduction

This feature covers a comprehensive cleanup of the babybook project codebase. During development, the project accumulated debugging documentation, manual test scripts, performance reports, task summaries, and unused utilities. Additionally, the CSS architecture has overlapping style definitions across multiple files. This cleanup removes non-production artifacts, deletes unused code, and consolidates duplicate CSS to produce a leaner, more maintainable codebase.

## Glossary

- **Project_Root**: The top-level directory of the babybook repository
- **Cleanup_Process**: The series of file deletions, consolidations, and verifications performed during this feature
- **Temporary_Documentation**: Markdown files created during debugging sessions, task tracking, or one-off testing that are not part of permanent project documentation
- **Manual_Test_File**: A TypeScript or JavaScript file in src/tests/ that contains documentation or browser-console validation logic rather than automated test suite code
- **Production_Code**: Source files that are imported and used in the built application
- **CSS_Consolidation**: The process of merging overlapping style definitions from multiple CSS files into a single authoritative source
- **Build_Verification**: Running `npm run build` (vue-tsc type checking + Vite build) to confirm no compilation errors exist

## Requirements

### Requirement 1: Remove Temporary Documentation from Project Root

**User Story:** As a developer, I want temporary markdown documentation removed from the project root, so that the repository contains only essential project files and is easier to navigate.

#### Acceptance Criteria

1. WHEN the Cleanup_Process identifies markdown files in the Project_Root, THE Cleanup_Process SHALL remove all task summary files (files matching patterns task-_-summary.md, task-_-\*-summary.md)
2. WHEN the Cleanup_Process identifies markdown files in the Project_Root, THE Cleanup_Process SHALL remove all debugging session documentation (files such as solid-food-\*-summary.md, modal-focus-test.md, database-function-name-fix-summary.md, homepage-solid-food-button-update.md)
3. WHEN the Cleanup_Process identifies markdown files in the Project_Root, THE Cleanup_Process SHALL remove all performance and optimization reports (PERFORMANCE_OPTIMIZATION_SUMMARY.md, theme-performance-optimization-report.md)
4. WHEN the Cleanup_Process identifies markdown files in the Project_Root, THE Cleanup_Process SHALL remove all testing checklists and validation reports (THEME_TESTING_CHECKLIST.md, accessibility-test-pumping.md, feeding-schedule-validation-report.md, integration-test-report.md)
5. WHEN the Cleanup_Process identifies markdown files in the Project_Root, THE Cleanup_Process SHALL remove cleanup planning artifacts (cleanup-backup-documentation.md, cleanup-strategy.md, codebase-analysis-report.md, component-migration-report.md)
6. WHEN the Cleanup_Process identifies markdown files in the Project_Root, THE Cleanup_Process SHALL remove task implementation reports (task-_-verification.md, task-_-implementation.md pattern files)
7. THE Cleanup_Process SHALL preserve README.md, CLAUDE.md, and any files in the .kiro/specs/ directory
8. IF a markdown file in the Project_Root is not clearly identified as temporary documentation, THEN THE Cleanup_Process SHALL flag the file for manual review before removal

### Requirement 2: Remove Non-Automated Test Files from src/tests/

**User Story:** As a developer, I want manual test documentation removed from src/tests/, so that the directory only contains legitimate automated test infrastructure when a test framework is eventually installed.

#### Acceptance Criteria

1. WHEN the Cleanup_Process analyzes src/tests/, THE Cleanup_Process SHALL identify files that contain manual testing documentation or browser-console validation logic rather than automated test code
2. WHEN a Manual_Test_File is identified, THE Cleanup_Process SHALL remove integration-theme-test.ts, theme-switching.test.ts, theme-switching-test.js, and feeding-schedule-feature-validation.test.ts
3. WHEN all Manual_Test_Files are removed, THE Cleanup_Process SHALL remove the src/tests/ directory if it becomes empty
4. THE Cleanup_Process SHALL verify that no Production_Code imports from the src/tests/ directory before deletion

### Requirement 3: Remove Unused Utility Files

**User Story:** As a developer, I want unused utility files removed from the codebase, so that only production-relevant code remains in the source tree.

#### Acceptance Criteria

1. WHEN the Cleanup_Process identifies utility files not imported by any Production_Code, THE Cleanup_Process SHALL remove src/utils/themePerformance.ts
2. THE Cleanup_Process SHALL verify that no file in the project imports from src/utils/themePerformance.ts before deletion
3. WHEN unused utility files are removed, THE Cleanup_Process SHALL run Build_Verification to confirm no compilation errors

### Requirement 4: Remove Manual Test Documentation from src/components/**tests**/

**User Story:** As a developer, I want manual test markdown files removed from the components test directory, so that the directory structure is clean and ready for real automated tests in the future.

#### Acceptance Criteria

1. WHEN the Cleanup_Process analyzes src/components/**tests**/, THE Cleanup_Process SHALL remove markdown files that serve as manual testing documentation (BabySettingsModal.manual-test.md, QuickScheduleWidget.manual-test.md, ScheduleTriggerButton.usage.md)
2. WHEN all manual test documentation is removed, THE Cleanup_Process SHALL remove the src/components/**tests**/ directory if it becomes empty

### Requirement 5: Consolidate Duplicate CSS

**User Story:** As a developer, I want overlapping CSS definitions consolidated into a single source of truth, so that style maintenance is simpler and there are no conflicting style rules.

#### Acceptance Criteria

1. WHEN the Cleanup_Process analyzes CSS files, THE Cleanup_Process SHALL identify that modal.css defines .btn, .modal-overlay, .modal-title, .form-group, and .form-input classes that overlap with definitions in style.css and modal-buttons.css
2. WHEN duplicate CSS class definitions are identified, THE Cleanup_Process SHALL remove the unused modal.css file since no component imports it
3. WHEN the Cleanup_Process analyzes style.css, THE Cleanup_Process SHALL remove .modal, .modal-overlay, .modal-title, .btn, .btn-save, .btn-cancel, and .btn-delete class definitions that are superseded by modal-buttons.css
4. WHEN CSS consolidation is complete, THE Cleanup_Process SHALL verify that all modal components still render correctly by running Build_Verification
5. THE Cleanup_Process SHALL preserve style.css global resets, form input styles, and delete-confirmation dialog styles that are not duplicated elsewhere

### Requirement 6: Final Verification and Build Integrity

**User Story:** As a developer, I want the project to build successfully after all cleanup operations, so that no functionality is broken by the removal of files.

#### Acceptance Criteria

1. WHEN all cleanup operations are complete, THE Cleanup_Process SHALL run Build_Verification and confirm zero TypeScript errors
2. WHEN all cleanup operations are complete, THE Cleanup_Process SHALL confirm that the Vite build produces output without errors
3. IF Build_Verification fails after a cleanup operation, THEN THE Cleanup_Process SHALL revert that specific operation and report the failure
4. WHEN the cleanup is fully verified, THE Cleanup_Process SHALL document the list of removed files for reference
