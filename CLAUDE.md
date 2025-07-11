# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on port 5174
- `npm run build` - Build production version (runs vue-tsc type checking + vite build)
- `npm run build:github` - Build for GitHub Pages deployment (copies .env.github to .env first)
- `npm run preview` - Preview production build locally

## Project Architecture

### Technology Stack
- **Frontend**: Vue 3 with Composition API + TypeScript
- **Build Tool**: Vite
- **State Management**: Pinia
- **Router**: Vue Router with hash history for GitHub Pages compatibility
- **Backend**: Supabase (PostgreSQL database + authentication + storage)
- **Mobile**: Capacitor for iOS/Android builds
- **Styling**: CSS (no framework like Tailwind or Bootstrap)

### Key Application Structure

#### Core Store (src/stores/babyStore.ts)
This is the central state management that handles:
- User authentication (sign in/up/out)
- Baby management (add/update/delete babies)
- Activity tracking (feedings, diaper changes, sleep sessions)
- **Solid food tracking** (food introduction, try counts, cultural suggestions) ✅ COMPLETED
- Data synchronization with Supabase
- Real-time polling for data updates (15-second intervals)

#### Main Views
- **HomePage**: Main dashboard with baby selection and quick actions
- **BabyHistoryPage**: Individual baby's history and timeline
- **FeedingsPage**: Feeding-focused interface (includes solid food tracking) ✅ COMPLETED
- **ProfilePage**: User profile and settings

#### Database Schema (Supabase)
- **babies**: Baby profiles with names, birthdates, and images
- **feedings**: Feeding records (breast/formula/solid) with amounts and timestamps
- **diaper_changes**: Diaper change records (pee/poop/both) with timestamps
- **sleep_sessions**: Sleep tracking with start/end times
- **baby_settings**: Per-baby configuration (feeding intervals, default amounts)
- **solid_foods**: Solid food introduction tracking with cultural categories and try counts ✅ COMPLETED

#### Authentication Flow
- Uses Supabase Auth with email/password
- Row Level Security (RLS) ensures users only see their own data
- Handles session management and token refresh automatically
- Graceful handling of auth state changes and session expiration

#### Data Synchronization
- Real-time updates using polling (not websockets)
- Optimistic updates for better UX
- Timeout handling for slow connections
- Fallback behavior for offline scenarios

### Environment Configuration

The app requires these environment variables:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

For GitHub Pages deployment, use `.env.github` file that gets copied during build.

### Mobile App (Capacitor)
- iOS and Android builds configured
- Uses hash routing for compatibility
- Platform-specific styling via CSS classes
- Image storage handled through Supabase Storage

### Development Notes
- TypeScript is enforced with vue-tsc
- Uses modern Vue 3 Composition API patterns
- Pinia composables for reactive state management
- Date handling with date-fns library
- File uploads for baby images through Supabase Storage

#### Solid Food Tracking System ✅ COMPLETED
**Database Structure (solid_foods table):**
- Basic tracking: baby_id, food_name, food_category (cultural origin)
- Try counting: times_tried, first_tried_date, last_tried_date
- User feedback: notes, reaction (liked/disliked/neutral/allergic_reaction)
- Standard fields: id, user_id, created_at, updated_at

**Cultural Food Categories:**
- **Western Traditional**: Rice cereal, oatmeal, pureed vegetables/fruits, avocado
- **Chinese**: Rice porridge (congee), millet porridge, steamed egg custard, bone broth
- **Japanese**: Rice porridge (okayu), mashed tofu, fish paste, seaweed broth
- **Indian**: Rice water, dal with rice, ragi porridge, khichdi
- **Korean**: Rice porridge (juk), miyeok-guk (seaweed soup), soft tofu

**Features:**
- Suggested foods by cultural category when adding new solid foods
- Automatic try-count incrementing for repeated foods
- Search/filter functionality across all cultural categories
- Integration with baby's timeline and feeding history
- Notes and reaction tracking for each food introduction

**Components:**
- `SolidFoodInput.vue` - Food selection with cultural suggestions and search ✅ COMPLETED
- `SolidFoodHistory.vue` - Display tried foods with try counts and reactions ✅ COMPLETED
- Store methods: `addSolidFood()`, `updateSolidFood()`, `getSolidFoodsForBaby()` ✅ COMPLETED
- Database migration for solid_foods table ✅ COMPLETED
- Integration with FeedingsPage tabbed interface ✅ COMPLETED

### Design Notes
