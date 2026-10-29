"use client";

/**
 * Generative ambient audio — no audio files, no network.
 *
 * Lo-fi: a slow four-chord pad through a low-pass filter with vinyl crackle.
 * Rain: filtered noise plus randomly scheduled droplet pings.
 *
 * Everything is created from oscillator/noise buffers inside an AudioContext,
 * so the PWA keeps working offline and ships no media assets.
 */

import type { AmbientTrack } from "@/lib/types";

const CHORDS: number[][] = [
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 349.23], // Fmaj7
  [130.81, 164.81, 196.0, 246.94], // Cmaj7
  [196.0, 246.94, 293.66, 349.23], // G
];

function noiseBuffer(context: AudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[index] = last * 3.2;
  }
  return buffer;
}

function whiteBuffer(context: AudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

export class AmbientEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private timers: number[] = [];
  private oscillators: OscillatorNode[] = [];
  private volume = 0.5;
  private track: AmbientTrack = "off";
  private starting: Promise<void> | null = null;

  get current(): AmbientTrack {
    return this.track;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(
        this.volume * 0.8,
        this.context.currentTime,
        0.15,
      );
    }
  }

  async play(track: AmbientTrack): Promise<void> {
    if (track === "off") {
      this.stop();
      return;
    }
    if (this.context && this.track === track) {
      await this.context.resume().catch(() => undefined);
      return;
    }
    this.stop();
    const AudioContextClass =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio is unavailable");

    const context = new AudioContextClass();
    this.context = context;
    this.track = track;
    this.master = context.createGain();
    this.master.gain.value = this.volume * 0.8;
    this.master.connect(context.destination);

    if (context.state === "suspended") await context.resume().catch(() => undefined);

    if (track === "lofi") this.buildLofi(context);
    else this.buildRain(context);
  }

  private buildLofi(context: AudioContext): void {
    if (!this.master) return;

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    filter.connect(this.master);

    const padGain = context.createGain();
    padGain.gain.value = 0.055;
    padGain.connect(filter);

    const chord = CHORDS[0];
    for (let index = 0; index < chord.length; index += 1) {
      const oscillator = context.createOscillator();
      oscillator.type = index % 2 === 0 ? "sine" : "triangle";
      oscillator.frequency.value = chord[index];
      oscillator.detune.value = (index - 1.5) * 4;
      const voice = context.createGain();
      voice.gain.value = 0.32 / chord.length;
      oscillator.connect(voice).connect(padGain);
      oscillator.start();
      this.oscillators.push(oscillator);
      this.sources.push(oscillator);
    }

    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    this.sources.push(lfo);
    this.oscillators.push(lfo);

    // Vinyl / tape hiss.
    const hiss = context.createBufferSource();
    hiss.buffer = whiteBuffer(context, 3);
    hiss.loop = true;
    const hissFilter = context.createBiquadFilter();
    hissFilter.type = "bandpass";
    hissFilter.frequency.value = 2200;
    hissFilter.Q.value = 0.7;
    const hissGain = context.createGain();
    hissGain.gain.value = 0.018;
    hiss.connect(hissFilter).connect(hissGain).connect(this.master);
    hiss.start();
    this.sources.push(hiss);

    let chordIndex = 0;
    const rotate = window.setInterval(() => {
      chordIndex = (chordIndex + 1) % CHORDS.length;
      const next = CHORDS[chordIndex];
      const at = context.currentTime + 0.4;
      this.oscillators.forEach((oscillator, index) => {
        if (index >= next.length) return;
        oscillator.frequency.cancelScheduledValues(at);
        oscillator.frequency.linearRampToValueAtTime(next[index], at + 2.4);
      });
    }, 9000);
    this.timers.push(rotate);
  }

  private buildRain(context: AudioContext): void {
    if (!this.master) return;

    const rain = context.createBufferSource();
    rain.buffer = noiseBuffer(context, 4);
    rain.loop = true;

    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 380;
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 4200;

    const rainGain = context.createGain();
    rainGain.gain.value = 0.3;
    rain.connect(highpass).connect(lowpass).connect(rainGain).connect(this.master);
    rain.start();
    this.sources.push(rain);

    const drip = () => {
      if (!this.context || this.context.state !== "running") return;
      const time = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 900 + Math.random() * 1600;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.035, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09 + Math.random() * 0.12);
      oscillator.connect(gain).connect(this.master as GainNode);
      oscillator.start(time);
      oscillator.stop(time + 0.3);
    };

    const timer = window.setInterval(() => {
      if (Math.random() > 0.45) drip();
    }, 260);
    this.timers.push(timer);
  }

  stop(): void {
    for (const timer of this.timers) window.clearInterval(timer);
    this.timers = [];
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
      source.disconnect();
    }
    this.sources = [];
    this.oscillators = [];
    if (this.context) {
      this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.master = null;
    this.track = "off";
  }
}
