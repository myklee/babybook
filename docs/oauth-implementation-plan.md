# OAuth Implementation Plan: Google & Apple Sign-In for BabyBook

## Overview
Add OAuth authentication for Google and Apple to the existing BabyBook app, which currently supports email/password authentication via Supabase. This will provide users with convenient social login options across web, iOS, and Android platforms.

## Phase 1: Provider Setup & Configuration

### 1.1 Google OAuth Setup
- **Google Cloud Console Configuration**:
  - Create/configure OAuth consent screen with babybook domain
  - Generate OAuth client IDs for:
    - Web application (for Supabase backend)
    - Android application (with SHA-1 certificate)
    - iOS application (with Bundle ID)
- **Supabase Dashboard Configuration**:
  - Enable Google provider in Authentication settings
  - Configure Web Client ID and Secret
  - Add mobile Client IDs to "Authorized Client IDs" field
  - Set up redirect URLs

### 1.2 Apple OAuth Setup
- **Apple Developer Console**:
  - Create App ID and Services ID
  - Configure Sign in with Apple capability
  - Set up domain verification and redirect URLs
- **Supabase Dashboard Configuration**:
  - Enable Apple provider in Authentication settings
  - Configure Services ID as Client ID
  - Set up private key and team ID
  - Configure redirect URLs

## Phase 2: Install Dependencies

### 2.1 Capacitor OAuth Plugin
```bash
npm install @capgo/capacitor-social-login
npx cap sync
```

### 2.2 Platform-specific Dependencies
- **iOS**: Xcode configuration for Sign in with Apple capability
- **Android**: Google Services configuration (google-services.json)

## Phase 3: Code Implementation

### 3.1 Update Supabase Configuration
- Modify `src/lib/supabase.ts` to handle OAuth redirects
- Add OAuth detection and token handling
- Update auth flow configuration

### 3.2 Store Layer Updates
- **Add to `babyStore.ts`**:
  - `signInWithGoogle()` function using `supabase.auth.signInWithOAuth()`
  - `signInWithApple()` function
  - Native mobile OAuth functions using Capacitor plugin
  - Platform detection logic (web vs mobile)

### 3.3 UI Component Updates
- **Update `HomePage.vue` login form**:
  - Add Google and Apple sign-in buttons
  - Implement responsive button layout
  - Add loading states for OAuth flows
  - Handle OAuth callback states

### 3.4 Mobile-specific Implementation
- **Create OAuth service layer**:
  - Platform detection utilities
  - Native Google Sign-In integration
  - Native Apple Sign-In integration
  - Token exchange with Supabase

## Phase 4: Router & Redirect Handling

### 4.1 OAuth Callback Route
- Add OAuth callback route to handle redirects
- Implement token extraction and validation
- Handle success/error states
- Redirect to appropriate app screens

### 4.2 Deep Link Configuration
- Update `capacitor.config.ts` for deep links
- Configure URL schemes for OAuth redirects
- Handle mobile app launching from OAuth

## Phase 5: UI/UX Enhancements

### 5.1 OAuth Button Design
- Create Google-branded sign-in button (following Google guidelines)
- Create Apple-branded sign-in button (following Apple guidelines)
- Implement dark/light mode variants
- Add hover and loading states

### 5.2 Error Handling & User Feedback
- OAuth-specific error messages
- Network connectivity handling
- User cancellation handling
- Rate limiting feedback

## Phase 6: Platform-specific Configuration

### 6.1 iOS Configuration
- Update `ios/App/App/Info.plist` with URL schemes
- Configure Sign in with Apple entitlements
- Add necessary privacy descriptions

### 6.2 Android Configuration
- Update `android/app/src/main/AndroidManifest.xml`
- Configure intent filters for OAuth redirects
- Add Google Services configuration

## Phase 7: Testing & Validation

### 7.1 Cross-platform Testing
- Web browser OAuth flows
- iOS app OAuth integration
- Android app OAuth integration
- Test OAuth token refresh

### 7.2 Edge Case Testing
- Network failure scenarios
- User cancellation flows
- Token expiration handling
- Multiple account scenarios

## Technical Considerations

### Security
- Use PKCE (Proof Key for Code Exchange) for mobile OAuth
- Implement proper token storage using Supabase's secure session management
- Validate OAuth state parameters

### User Experience
- Maintain existing email/password option
- Provide clear account linking/unlinking
- Handle account conflicts (same email, different providers)
- Preserve user data across authentication methods

### Performance
- Lazy load OAuth SDKs to reduce bundle size
- Implement proper loading states
- Cache OAuth provider metadata

## Current Authentication System Analysis

### Existing Components
- **Supabase Configuration**: `src/lib/supabase.ts`
  - Uses `@supabase/supabase-js` v2.50.0
  - Configured with PKCE flow
  - Session persistence enabled
- **Store Layer**: `src/stores/babyStore.ts`
  - Current functions: `signIn()`, `signUp()`, `signOut()`
  - Uses `supabase.auth.signInWithPassword()`
- **UI Layer**: `src/views/HomePage.vue`
  - Form-based login (recently updated from prompts)
  - Proper validation and error handling
- **Router**: `src/router/index.ts`
  - Uses hash history for GitHub Pages compatibility
  - Simple route structure

### Mobile App Configuration
- **Capacitor**: v7.4.0
- **App ID**: com.myklee.app
- **Platforms**: iOS, Android (configured)
- **Current Plugins**: Core Capacitor only

## Implementation Order
1. Provider setup and configuration (requires external API access)
2. Install dependencies and basic Supabase integration
3. Web OAuth implementation and testing
4. Mobile OAuth implementation
5. UI/UX polish and comprehensive testing

## Estimated Complexity
- **Backend/Config**: Medium (provider setup can be complex)
- **Web Implementation**: Low-Medium (Supabase handles most complexity)
- **Mobile Implementation**: Medium-High (native integration required)
- **Testing**: Medium (cross-platform validation needed)

## Research Sources
- [Supabase Google OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Apple OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Capacitor Social Login Plugin](https://github.com/Cap-go/capacitor-social-login)
- [Native Mobile Auth Support](https://supabase.com/blog/native-mobile-auth)

## Future Considerations

### Additional Providers
- Facebook Login (if requested)
- GitHub OAuth (for developer users)
- Twitter/X OAuth

### Advanced Features
- Account linking/unlinking UI
- Social profile picture integration
- Multi-factor authentication
- Single Sign-On (SSO) for family accounts

---

*This plan provides a comprehensive OAuth implementation that maintains the existing authentication system while adding modern social login options across all platforms.*