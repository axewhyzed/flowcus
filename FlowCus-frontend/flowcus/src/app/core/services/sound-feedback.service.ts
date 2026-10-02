import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SoundFeedbackService {
  private audioCtx: AudioContext | null = null;
  private isEnabled: boolean = true;
  
  // Ambient sound state
  private ambientSourceNode: AudioNode | null = null;
  private ambientGainNode: GainNode | null = null;
  private currentAmbientType: 'brown' | 'white' | 'binaural' | null = null;

  constructor() {
    const saved = localStorage.getItem('flowcus_sound_enabled');
    this.isEnabled = saved !== null ? saved === 'true' : true;
  }

  public get enabled(): boolean {
    return this.isEnabled;
  }

  public set enabled(val: boolean) {
    this.isEnabled = val;
    localStorage.setItem('flowcus_sound_enabled', String(val));
    if (!val) {
      this.stopAmbient();
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /** Subtle mechanical click on button or task checkbox */
  public playClick(): void {
    if (!this.isEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch {
      // Audio not supported or autoplay blocked
    }
  }

  /** Pleasant 2-note chime when checking off a task */
  public playSuccess(): void {
    if (!this.isEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(523.25, now, 0.15);         // C5
      playTone(659.25, now + 0.09, 0.28);  // E5
    } catch {
      // Audio ignored
    }
  }

  /** Cheerful celebration chime when completing all tasks */
  public playCelebration(): void {
    if (!this.isEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(523.25, now, 0.12);        // C5
      playTone(659.25, now + 0.1, 0.12);  // E5
      playTone(783.99, now + 0.2, 0.15);  // G5
      playTone(1046.50, now + 0.32, 0.4); // C6
    } catch {
      // Audio ignored
    }
  }

  /** Ambient Sound Generator (Brown noise, White noise, Binaural hum) */
  public startAmbient(type: 'brown' | 'white' | 'binaural', volume = 0.3): void {
    this.stopAmbient();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.currentAmbientType = type;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume * 0.25)), ctx.currentTime);
    gain.connect(ctx.destination);
    this.ambientGainNode = gain;

    if (type === 'white' || type === 'brown') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'brown') {
          // Brown noise integration filter
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.5;
        } else {
          data[i] = white * 0.3;
        }
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;
      noiseNode.loop = true;

      // Filter for brown noise warmth
      if (type === 'brown') {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        noiseNode.connect(filter);
        filter.connect(gain);
      } else {
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, ctx.currentTime);
        noiseNode.connect(filter);
        filter.connect(gain);
      }

      noiseNode.start();
      this.ambientSourceNode = noiseNode;
    } else if (type === 'binaural') {
      // Binaural alpha beat (200Hz base, 210Hz beat = 10Hz Alpha rhythm)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(196, ctx.currentTime);
      osc2.frequency.setValueAtTime(206, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);

      osc1.start();
      osc2.start();
      this.ambientSourceNode = osc1; // primary reference
    }
  }

  public setAmbientVolume(vol: number): void {
    if (this.ambientGainNode && this.audioCtx) {
      this.ambientGainNode.gain.setValueAtTime(Math.max(0, Math.min(1, vol * 0.25)), this.audioCtx.currentTime);
    }
  }

  public stopAmbient(): void {
    if (this.ambientSourceNode) {
      try {
        if ('stop' in this.ambientSourceNode) {
          (this.ambientSourceNode as AudioScheduledSourceNode).stop();
        }
        this.ambientSourceNode.disconnect();
      } catch {}
      this.ambientSourceNode = null;
    }
    if (this.ambientGainNode) {
      try {
        this.ambientGainNode.disconnect();
      } catch {}
      this.ambientGainNode = null;
    }
    this.currentAmbientType = null;
  }

  public get ambientType(): 'brown' | 'white' | 'binaural' | null {
    return this.currentAmbientType;
  }
}
