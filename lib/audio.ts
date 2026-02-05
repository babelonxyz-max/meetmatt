"use client";

// Lazy load Tone.js - only import when needed
let Tone: typeof import("tone") | null = null;
let synth: import("tone").PolySynth | null = null;
let successSynth: import("tone").PolySynth | null = null;
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
      
      // Main message synth
      synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "sine",
        },
        envelope: {
          attack: 0.01,
          decay: 0.1,
          sustain: 0.0,
          release: 0.1,
        },
        volume: -15,
      }).toDestination();
      
      // Success synth - richer sound
      successSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: {
          type: "triangle",
        },
        envelope: {
          attack: 0.02,
          decay: 0.2,
          sustain: 0.1,
          release: 1,
        },
        volume: -12,
      }).toDestination();
      
      // Add a subtle reverb
      const reverb = new Tone.Reverb({
        decay: 1.5,
        wet: 0.15,
      }).toDestination();
      
      synth.connect(reverb);
      successSynth.connect(reverb);
      
      isInitialized = true;
    } catch (e) {
      console.log("Audio init failed:", e);
      // Reset so we can try again
      isInitialized = false;
      initPromise = null;
    }
  })();

  return initPromise;
}

export function playMessageSent() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["C5"], "32n");
  } catch (e) {
    console.log("Audio play failed:", e);
  }
}

export function playMessageReceived() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["E5", "G5"], "16n");
  } catch (e) {
    console.log("Audio play failed:", e);
  }
}

export function playOptionSelected() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["G4", "B4"], "32n");
  } catch (e) {
    console.log("Audio play failed:", e);
  }
}

export function playSuccess() {
  if (!successSynth || !isInitialized) return;
  try {
    const now = Tone!.now();
    successSynth.triggerAttackRelease("C5", "8n", now);
    successSynth.triggerAttackRelease("E5", "8n", now + 0.08);
    successSynth.triggerAttackRelease("G5", "8n", now + 0.16);
    successSynth.triggerAttackRelease("C6", "4n", now + 0.24);
  } catch (e) {
    console.log("Audio play failed:", e);
  }
}

export function playHover() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["A5"], "64n", undefined, 0.3);
  } catch (e) {
    console.log("Audio play failed:", e);
  }
}

export function playClick() {
  if (!synth || !isInitialized) return;
  try {
    synth.triggerAttackRelease(["F5"], "64n");
  } catch (e) {
    console.log("Audio play failed:", e);
  }
}

// Cleanup function for when component unmounts
export function cleanupAudio() {
  if (synth) {
    synth.dispose();
    synth = null;
  }
  if (successSynth) {
    successSynth.dispose();
    successSynth = null;
  }
  isInitialized = false;
  initPromise = null;
  Tone = null;
}
