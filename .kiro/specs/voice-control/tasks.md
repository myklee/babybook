# Simple Voice Control - Implementation Tasks

## Core Implementation

- [ ] 1. Create voice control composable

  - Implement `useVoiceControl.ts` with Web Speech API
  - Add 10-second listening window with auto-timeout
  - Add browser feature detection for speech recognition
  - Handle microphone permissions and errors
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 2. Build simple command processor
  - Create pattern matching for 4 basic commands
  - Map voice commands to store actions
  - Add command validation and error handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

## Voice Button Component

- [ ] 3. Create VoiceButton component

  - Build large, accessible microphone button
  - Add visual states (idle, listening, success, error)
  - Implement pulsing animation with countdown timer
  - Add clear visual feedback for listening window
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Integrate with HomePage
  - Add voice button to prominent position on home page
  - Show confirmation messages for successful commands
  - Add countdown display during listening window
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

## Command Integration

- [ ] 5. Connect voice commands to baby store
  - Wire "log feeding" to existing addFeeding method
  - Wire "log diaper" to existing addDiaper method
  - Wire "start sleep" to existing startSleep method
  - Wire "end sleep" to existing endSleep method
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

## Testing and Polish

- [ ] 6. Add error handling and fallbacks
  - Hide voice button when Web Speech API not supported
  - Handle microphone permission denied gracefully
  - Show helpful error messages for failed recognition
  - Add proper cleanup when component unmounts
  - _Requirements: 2.1, 2.4_
