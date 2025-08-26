# Simple Voice Control - Design Document

## Overview

Minimal voice control for logging basic baby activities using Web Speech API. Focus on three core actions: feeding, diaper, and sleep tracking with one-tap activation for near hands-free operation.

## Architecture

### Technology Stack

- **Web Speech API** for voice recognition
- **One-tap activation** with 10-second listening window
- **Auto-timeout** to preserve battery
- **Local processing** only (no cloud services)
- **Web-compatible** approach (no always-listening due to browser limitations)

### Voice Commands

- "Log feeding" → Record feeding event
- "Log diaper" → Record diaper change
- "Start sleep" → Begin sleep timer
- "End sleep" → Stop sleep timer

## Components and Interfaces

### New Components

**VoiceButton.vue:**

- Large, accessible microphone button
- One-tap to start 10-second listening window
- Pulsing animation when listening for commands
- Simple success/error states

**useVoiceControl.ts (Composable):**

- Web Speech API integration
- Command parsing (4 simple commands)
- 10-second listening window with auto-timeout
- Integration with baby store actions

### Integration Points

**HomePage.vue:**

- Add large voice button component
- Show listening status and confirmation messages

**BabyStore.ts:**

- Use existing methods (addFeeding, addDiaper, etc.)
- No new voice-specific methods needed

## User Interface

### Voice Button

- **Location:** Prominent position on home page
- **Interaction:** Single tap starts 10-second listening
- **States:** Idle (gray), Listening (blue pulse with countdown), Success (green), Error (red)
- **Size:** Large touch target for easy access

### Feedback

- **Visual:** Button color changes + brief text message
- **No audio feedback** (keep it simple)

## Command Processing

### Simple Command Processing

```javascript
const commands = {
  "log feeding": () => store.addFeeding(babyId),
  "log diaper": () => store.addDiaper(babyId),
  "start sleep": () => store.startSleep(babyId),
  "end sleep": () => store.endSleep(babyId),
};

// Single-stage processing:
// 1. Tap button to start listening
// 2. Say command within 10 seconds
// 3. Auto-stop after timeout or successful command
```

### Error Handling

- **Unrecognized command:** Show "Try again" message
- **No microphone:** Hide voice button
- **Browser unsupported:** Hide voice button
