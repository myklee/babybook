# Technology Stack

## Frontend Framework

- **Vue 3** with Composition API and `<script setup>` syntax
- **TypeScript** for type safety
- **Vite** as build tool and dev server
- **Pinia** for state management

## Mobile & PWA

- **Capacitor** for iOS/Android native app compilation
- **PWA** capabilities with vite-plugin-pwa

## Styling & UI

- **CSS** with custom design system (no framework like Tailwind or Bootstrap)
- **Design System**: Centralized in `src/styles/design-system.css`
- **Theme Support**: Light/dark themes with CSS custom properties
- **Responsive Design**: Mobile-first approach

## Backend & Data

- **Cloudflare Workers** with D1 database (primary)
- **Supabase** (legacy, being phased out)
- **Authentication**: Custom JWT token-based auth via Cloudflare Workers

## Key Libraries

- `@vueuse/core` - Vue composition utilities
- `date-fns` - Date manipulation
- `vue-router` - Client-side routing (disabled in Cloudflare version)

## Common Commands

### Development

```bash
npm run dev          # Start dev server on port 5174
npm run build        # Build for production
npm run build:github # Build with GitHub-specific env
npm run preview      # Preview production build
```

### Mobile Development

```bash
npx cap add ios      # Add iOS platform
npx cap add android  # Add Android platform
npx cap sync         # Sync web assets to native projects
npx cap open ios     # Open in Xcode
npx cap open android # Open in Android Studio
```

### Testing

```bash
node scripts/test-*.js                    # Run specific test scripts
node scripts/validate-feeding-schedule-feature.js  # Feature validation
```

## Environment Configuration

- `.env` - Main environment file
- `.env.github` - GitHub Pages deployment config
- `.env.clean` - Clean/minimal config

Required environment variables:

- `VITE_CLOUDFLARE_WORKER_URL` - Cloudflare Workers API endpoint
- `VITE_SUPABASE_URL` - Supabase project URL (legacy)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (legacy)
