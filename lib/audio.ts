"use client";

import * as Tone from "tone";

let synth: Tone.PolySynth | null = null;
let successSynth: Tone.PolySynth | null = null;
let isInitialized = false;

export async function initAudio() {
  if (isInitialized) return;
  
  try {
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
    console.log("Audio init failed (probably user gesture needed first):", e);
  }
}

export function playMessageSent() {
  if (!synth || !isInitialized) return;
  synth.triggerAttackRelease(["C5"], "32n");
}

export function playMessageReceived() {
  if (!synth || !isInitialized) return;
  synth.triggerAttackRelease(["E5", "G5"], "16n");
}

export function playOptionSelected() {
  if (!synth || !isInitialized) return;
  synth.triggerAttackRelease(["G4", "B4"], "32n");
}

export function playSuccess() {
  if (!successSynth || !isInitialized) return;
  const now = Tone.now();
  successSynth.triggerAttackRelease("C5", "8n", now);
  successSynth.triggerAttackRelease("E5", "8n", now + 0.08);
  successSynth.triggerAttackRelease("G5", "8n", now + 0.16);
  successSynth.triggerAttackRelease("C6", "4n", now + 0.24);
}

export function playHover() {
  if (!synth || !isInitialized) return;
  synth.triggerAttackRelease(["A5"], "64n", undefined, 0.3);
}

export function playClick() {
  if (!synth || !isInitialized) return;
  synth.triggerAttackRelease(["F5"], "64n");
}
