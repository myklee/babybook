# Product Overview

BabyBook is a Vue 3-based baby tracking application for monitoring feedings, diaper changes, and sleep sessions. The app supports multiple babies per user account and provides real-time data synchronization.

## Core Features

- **User Authentication**: Email/password authentication with secure token management
- **Multi-baby Support**: Track activities for multiple babies under one account
- **Activity Tracking**: Record feedings (breast, formula, solid food), diaper changes, and sleep sessions
- **Real-time Updates**: Data syncs across devices with automatic refresh on window focus
- **Mobile-first Design**: Responsive design optimized for mobile devices with Capacitor integration
- **Data Management**: Full CRUD operations with edit/delete capabilities for all records

## Target Platforms

- **Web**: Primary platform with PWA capabilities
- **Mobile**: iOS and Android via Capacitor
- **Cross-platform**: Single codebase for all platforms

## Backend Architecture

The app has migrated from Supabase to Cloudflare Workers with D1 database, maintaining backward compatibility during the transition period.
