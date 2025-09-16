# Project Structure

## Root Directory Organization

```
├── src/                    # Main application source code
├── android/               # Capacitor Android platform
├── ios/                   # Capacitor iOS platform
├── cloudflare-workers/    # Cloudflare Workers backend code
├── supabase/             # Legacy Supabase migrations
├── scripts/              # Utility and test scripts
├── migration-data/       # Database migration files
├── public/               # Static assets
└── dist/                 # Build output
```

## Source Code Structure (`src/`)

```
src/
├── components/           # Vue components
│   ├── clean/           # Clean/minimal component variants
│   └── __tests__/       # Component tests
├── views/               # Page-level components
├── stores/              # Pinia state management
├── lib/                 # API clients and utilities
├── composables/         # Vue composition functions
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── styles/              # CSS stylesheets
├── assets/              # Static assets (icons, images)
├── tests/               # Test files
└── router/              # Vue Router configuration (legacy)
```

## Key Conventions

### Component Organization

- **Components**: Reusable UI components in `src/components/`
- **Views**: Page-level components in `src/views/`
- **Clean Variants**: Simplified versions in `src/components/clean/`
- **Modals**: Modal components follow `*Modal.vue` naming pattern

### State Management

- **Stores**: Pinia stores in `src/stores/`
- **Primary Store**: `cloudflareStore.ts` (current)
- **Legacy Stores**: `supabaseCompatStore.ts`, `babyStore.ts`

### API Layer

- **Cloudflare Client**: `src/lib/cloudflare-client.ts` (primary)
- **Legacy APIs**: `src/lib/supabase.ts`, `src/lib/api.ts`

### Styling Architecture

- **Main Stylesheet**: `src/style.css`
- **Design System**: `src/styles/design-system.css`
- **Component Styles**: `src/styles/modal.css`, `src/styles/modal-buttons.css`

### Testing Structure

- **Unit Tests**: Co-located with source files in `__tests__/` directories
- **Integration Tests**: `src/tests/` directory
- **Script Tests**: `scripts/test-*.js` files
- **HTML Test Pages**: Root-level `test-*.html` files

### Configuration Files

- **TypeScript**: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- **Build**: `vite.config.ts`, `vite.clean.config.ts`
- **Mobile**: `capacitor.config.ts`
- **Environment**: `.env*` files

## Naming Conventions

- **Components**: PascalCase (e.g., `FeedingModal.vue`)
- **Files**: kebab-case for non-components (e.g., `cloudflare-client.ts`)
- **Stores**: camelCase with "Store" suffix (e.g., `cloudflareStore.ts`)
- **Types**: PascalCase interfaces (e.g., `Baby`, `Feeding`)
- **Composables**: camelCase with "use" prefix (e.g., `useTheme.ts`)

## Migration Architecture

The project maintains dual implementations during Cloudflare migration:

- **Current**: Cloudflare Workers + D1 database
- **Legacy**: Supabase (being phased out)
- **Clean**: Simplified variants for testing

## Development Guidelines

### Styling & UI Constraints

- **No new styling or UI components** should be created unless explicitly requested
- Use existing components and styles from the established design system
- Modifications to existing styles require explicit approval
