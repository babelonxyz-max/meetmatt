# AI Orb Component V2 - Documentation

**Version:** 2.0  
**Last Updated:** 2026-02-05  
**Status:** Production Ready

---

## Overview

The AI Orb is the visual centerpiece of Meet Matt - an interactive, animated AI avatar that responds to user interactions, chat wizard state changes, and cursor movement.

---

## Features

### 1. Liquid Shapeshifting Animation
- **Organic morphing** using animated `border-radius`
- **3 independent liquid blobs** moving with different patterns
- **Continuous shape transformation** for living, breathing feel
- Animation cycle: 4-8 seconds depending on state

### 2. Cursor-Tracking Eyes
- **White eyeballs** (no pupils - clean aesthetic)
- **Mouse tracking** - eyes follow cursor position
- **Spring physics** for smooth, natural movement
- **Movement range:** ±4px horizontal, ±3px vertical

### 3. Automatic Blinking
- **Random intervals:** 2-6 seconds between blinks
- **Quick animation:** 150ms blink duration
- **ScaleY transform** for realistic eye closing

### 4. Color Cycling
- **4 color schemes** that rotate every 5 seconds:
  1. **Cyan-Blue** (primary: `rgb(14,165,233)`)
  2. **Orange** (primary: `rgb(249,115,22)`)
  3. **Purple** (primary: `rgb(168,85,247)`)
  4. **Green** (primary: `rgb(34,197,94)`)
- All visual elements adapt to current color scheme

### 5. Wizard State Reactions

The orb reacts to chat wizard progress:

| State | Trigger | Orb Reaction |
|-------|---------|--------------|
| `idle` | Intro screen | Normal breathing animation |
| `initializing` | User clicks "Initialize deployment" | **Backflip** + turns **Orange** + "Let's go! 🚀" bubble |
| `processing` | During name/purpose/features/tier steps | Active listening pulse |
| `deploying` | Payment confirmed, deployment in progress | Turns **Green** + "Deploying... ⚡" bubble |
| `success` | Deployment complete | Turns **Purple** + Pulse animation + "Success! 🎉" bubble |

### 6. Click Reactions
Cycling through 5 animations on each click:
1. **Giggle** - Side-to-side shake
2. **Spin** - 360° rotation
3. **Bounce** - Up-down bounce with squash/stretch
4. **Wink** - Eye squish effect
5. **Pulse** - Scale pulse with opacity change

### 7. Speech Bubbles
- Random messages on click
- Context-aware messages on wizard state changes
- 3-second auto-dismiss

---

## Props Interface

```typescript
interface AIOrbProps {
  isListening?: boolean;    // Triggers listening pulse animation
  isThinking?: boolean;     // Triggers intense thinking animation
  intensity?: "low" | "medium" | "high";  // Animation intensity multiplier
  wizardState?: "idle" | "initializing" | "processing" | "deploying" | "success";
}
```

---

## Technical Implementation

### No 3D Transforms
- Removed `rotateX`/`rotateY` that caused stuck-rotation bug
- Uses only 2D transforms (`x`, `y`, `rotate`, `scale`)
- `transformStyle: "flat"` prevents 3D context issues

### Animation Libraries
- **Framer Motion** for all animations
- **Spring physics** for eye tracking
- **Variants** for reaction animations

### Performance
- `memo()` wrapped for React optimization
- `pointer-events-none` on decorative elements
- GPU-accelerated transforms only

---

## Usage Example

```tsx
import { AIOrb } from "./components/AIOrb";

// Basic usage
<AIOrb />

// With wizard state integration
<AIOrb 
  isListening={isTyping}
  isThinking={isDeploying}
  intensity="medium"
  wizardState={currentStep === "name" ? "initializing" : "idle"}
/>
```

---

## File Location
```
app/components/AIOrb.tsx
```

---

## Related Components
- `LaunchWizard.tsx` - Chat interface that drives wizard states
- `page.tsx` - Main page integrating the orb with wizard flow

---

## Deployment

**Production URL:** https://meetmatt.vercel.app  
**Repository:** https://github.com/babelonxyz-max/meetmatt

---

## Changelog

### V2.0 (2026-02-05)
- Fixed stuck-rotation bug (removed 3D transforms)
- Added liquid shapeshifting morphing
- Implemented cursor-tracking eyes
- Fixed automatic blinking
- Added wizard state reactions (backflip, color changes)
- Improved color cycling reliability

### V1.0 (2026-02-04)
- Initial release with basic animations
- White eyeballs (no pupils)
- Click reactions and speech bubbles
- Basic hover effects
