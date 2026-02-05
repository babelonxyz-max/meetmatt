"use client";

// Lazy load Tone.js - only import when needed
let Tone: typeof import("tone") | null = null;
let synth: import("tone").PolySynth | null = null;
let successSynth: import("tone").PolySynth | null = null;
let droneSynth: import("tone").PolySynth | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

// Singleton pattern for audio initialization
export async function initAudio(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Dynamic import for code splitting
      Tone = await import("tone");
      await Tone.start();
      
      // Main UI synth - clean and futuristic
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "sine",
        },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.0,
          release: 0.1,
        },
        volume: -12,
      }).toDestination();
      
      // Success synth - richer, celebratory
      successSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "triangle",
        },
        envelope: {
          attack: 0.01,
          decay: 0.3,
          sustain: 0.2,
          release: 1.5,
        },
        volume: -8,
      }).toDestination();

      // Ambient drone synth for orb background
      droneSynth = new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 2.5,
        oscillator: {
          type: "fatsawtooth",
        },
        envelope: {
          attack: 1,
          decay: 0.5,
          sustain: 1,
          release: 3,
        },
        modulation: {
          type: "square",
        },
        modulationEnvelope: {
          attack: 0.5,
          decay: 0,
          sustain: 1,
          release: 0.5,
        },
        volume: -20,
      }).toDestination();
      
      // Add reverb for spacey effect
      const reverb = new Tone.Reverb({
        decay: 3,
        wet: 0.3,
      }).toDestination();

      // Add delay for futuristic echoes
      const feedbackDelay = new Tone.FeedbackDelay("8n", 0.3).toDestination();
      
      synth.connect(reverb);
      synth.connect(feedbackDelay);
      successSynth.connect(reverb);
      droneSynth.connect(reverb);
      
      isInitialized = true;
    } catch (e) {
      console.log("Audio init failed:", e);
      isInitialized = false;
      initPromise = null;
    }
  })();

  return initPromise;
}

// Message sent - sharp, digital
export function playMessageSent() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["C6"], "32n", undefined, 0.5);
  } catch (e) {}
}

// Message received - welcoming chord
export function playMessageReceived() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["E5", "G5", "B5"], "16n");
  } catch (e) {}
}

// Option selected - pleasant confirmation
export function playOptionSelected() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["G5", "C6"], "32n");
  } catch (e) {}
}

// Success - triumphant arpeggio
export function playSuccess() {
  if (!successSynth || !isInitialized) return;
  try {
    const now = Tone!.now();
    successSynth.triggerAttackRelease("C5", "16n", now);
    successSynth.triggerAttackRelease("E5", "16n", now + 0.06);
    successSynth.triggerAttackRelease("G5", "16n", now + 0.12);
    successSynth.triggerAttackRelease("C6", "8n", now + 0.18);
  } catch (e) {}
}

// Hover - subtle, futuristic
export function playHover() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["A6"], "64n", undefined, 0.2);
  } catch (e) {}
}

// Click - tactile feedback
export function playClick() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["F6"], "64n", undefined, 0.3);
  } catch (e) {}
}

// Typing sound - subtle ticks
export function playTyping() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["C7"], "128n", undefined, 0.1);
  } catch (e) {}
}

// Orb activation - sci-fi power up
export function playOrbActivate() {
  if (!synth || !isInitialized) return;
  try {
    const now = Tone!.now();
    synth.triggerAttackRelease("A4", "8n", now);
    synth.triggerAttackRelease("E5", "8n", now + 0.1);
    synth.triggerAttackRelease("A5", "4n", now + 0.2);
  } catch (e) {}
}

// Orb pulse - heartbeat-like
export function playOrbPulse() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["C3"], "32n", undefined, 0.1);
  } catch (e) {}
}

// Orb hover - subtle feedback
export function playOrbHover() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease("E5", "64n", undefined, 0.05);
  } catch (e) {}
}

// Payment success - cash register / coin sound
export function playPaymentSuccess() {
  if (!successSynth || !isInitialized) return;
  try {
    const now = Tone!.now();
    successSynth.triggerAttackRelease("G6", "32n", now);
    successSynth.triggerAttackRelease("E6", "32n", now + 0.05);
    successSynth.triggerAttackRelease("C6", "16n", now + 0.1);
  } catch (e) {}
}

// Error sound - gentle warning
export function playError() {
  if (!synth || !isInitialized) return;
  try {
    const now = Tone!.now();
    synth.triggerAttackRelease("G4", "16n", now);
    synth.triggerAttackRelease("E4", "16n", now + 0.15);
  } catch (e) {}
}

// Start ambient drone
export function startAmbientDrone() {
  if (!droneSynth || !isInitialized) return;
  try {
    droneSynth.triggerAttack(["C3", "G3", "C4"]);
  } catch (e) {}
}

// Stop ambient drone
export function stopAmbientDrone() {
  if (!droneSynth || !isInitialized) return;
  try {
    droneSynth.triggerRelease(["C3", "G3", "C4"]);
  } catch (e) {}
}

// Cleanup function
export function cleanupAudio() {
  if (synth) {
    synth.dispose();
    synth = null;
  }
  if (successSynth) {
    successSynth.dispose();
    successSynth = null;
  }
  if (droneSynth) {
    droneSynth.dispose();
    droneSynth = null;
  }
  isInitialized = false;
  initPromise = null;
  Tone = null;
}
