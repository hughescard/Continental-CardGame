export type BackgroundMusicScene = 'silent' | 'menu' | 'game';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type Waveform = OscillatorType;

interface NoteEvent {
  frequency: number;
  duration: number;
  volume: number;
  waveform: Waveform;
}

const STEP_MS = 650;
const MASTER_GAIN_VALUE = 0.42;

const MENU_PATTERN: readonly NoteEvent[] = [
  { frequency: 261.63, duration: 1.2, volume: 0.05, waveform: 'triangle' },
  { frequency: 329.63, duration: 1, volume: 0.04, waveform: 'sine' },
  { frequency: 392.0, duration: 1.1, volume: 0.05, waveform: 'triangle' },
  { frequency: 329.63, duration: 0.95, volume: 0.035, waveform: 'sine' },
  { frequency: 440.0, duration: 1.1, volume: 0.04, waveform: 'triangle' },
  { frequency: 392.0, duration: 1, volume: 0.035, waveform: 'sine' },
];

const GAME_PATTERN: readonly NoteEvent[] = [
  { frequency: 220.0, duration: 0.85, volume: 0.045, waveform: 'triangle' },
  { frequency: 246.94, duration: 0.75, volume: 0.04, waveform: 'triangle' },
  { frequency: 293.66, duration: 0.85, volume: 0.045, waveform: 'sine' },
  { frequency: 246.94, duration: 0.75, volume: 0.04, waveform: 'triangle' },
  { frequency: 329.63, duration: 0.9, volume: 0.04, waveform: 'sine' },
  { frequency: 293.66, duration: 0.8, volume: 0.035, waveform: 'triangle' },
];

class BackgroundMusicController {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private schedulerId: number | null = null;
  private stepIndex = 0;
  private scene: BackgroundMusicScene = 'silent';
  private enabled = true;
  private activeOscillators = new Set<OscillatorNode>();

  setEnabled(value: boolean) {
    this.enabled = value;

    if (!value) {
      void this.hardStop();
      return;
    }

    void this.resume();
  }

  setScene(scene: BackgroundMusicScene) {
    if (this.scene === scene) {
      return;
    }

    this.scene = scene;

    if (scene === 'silent') {
      void this.hardStop();
      return;
    }

    if (!this.enabled) {
      return;
    }

    this.restart();
  }

  async resume() {
    if (!this.enabled || this.scene === 'silent') {
      return;
    }

    const context = this.ensureAudioContext();
    this.restoreMasterGain();

    if (context.state === 'suspended') {
      await context.resume();
    }

    if (this.schedulerId === null) {
      this.start();
    }
  }

  async primeAndResume() {
    if (!this.enabled || this.scene === 'silent') {
      return;
    }

    if (this.audioContext?.state === 'running' && this.schedulerId !== null) {
      this.restoreMasterGain();
      return;
    }

    this.restoreMasterGain();
    await this.resume();
  }

  stop() {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }

    this.stepIndex = 0;

    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(this.audioContext?.currentTime ?? 0);
      this.masterGain.gain.setValueAtTime(0, this.audioContext?.currentTime ?? 0);
    }

    for (const oscillator of this.activeOscillators) {
      try {
        oscillator.stop();
      } catch {
        // Puede que ya haya terminado; no hace falta interrumpir el flujo.
      }
    }

    this.activeOscillators.clear();
  }

  async hardStop() {
    this.stop();

    if (this.audioContext && this.audioContext.state === 'running') {
      try {
        await this.audioContext.suspend();
      } catch {
        // Ignorar: el objetivo es silenciar inmediatamente.
      }
    }
  }

  private restart() {
    this.stop();
    void this.resume();
  }

  private ensureAudioContext() {
    if (this.audioContext && this.masterGain) {
      return this.audioContext;
    }

    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;

    if (!AudioContextConstructor) {
      throw new Error('Web Audio API no está disponible en este navegador.');
    }

    const context = new AudioContextConstructor();
    const gain = context.createGain();
    gain.gain.value = MASTER_GAIN_VALUE;
    gain.connect(context.destination);

    this.audioContext = context;
    this.masterGain = gain;

    return context;
  }

  private restoreMasterGain() {
    if (!this.masterGain || !this.audioContext) {
      return;
    }

    this.masterGain.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.masterGain.gain.setValueAtTime(MASTER_GAIN_VALUE, this.audioContext.currentTime);
  }

  private start() {
    const context = this.audioContext;

    if (!context) {
      return;
    }

    this.tick();
    this.schedulerId = window.setInterval(() => {
      this.tick();
    }, STEP_MS);
  }

  private tick() {
    const context = this.audioContext;
    const masterGain = this.masterGain;

    if (!context || !masterGain || context.state !== 'running') {
      return;
    }

    const pattern = this.scene === 'game' ? GAME_PATTERN : MENU_PATTERN;
    const note = pattern[this.stepIndex % pattern.length];

    if (!note) {
      return;
    }

    this.playNote(note, context.currentTime);
    this.stepIndex += 1;
  }

  private playNote(note: NoteEvent, when: number) {
    if (!this.audioContext || !this.masterGain) {
      return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = note.waveform;
    oscillator.frequency.setValueAtTime(note.frequency, when);

    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(note.volume, when + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, when + note.duration);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    this.activeOscillators.add(oscillator);
    oscillator.addEventListener('ended', () => {
      this.activeOscillators.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    });

    oscillator.start(when);
    oscillator.stop(when + note.duration + 0.05);
  }
}

export const backgroundMusicController = new BackgroundMusicController();
