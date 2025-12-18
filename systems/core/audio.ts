
// Synthesized Audio System using Web Audio API
// No external assets required

class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  // BGM State
  private isMusicPlaying: boolean = false;
  private musicOscillators: OscillatorNode[] = [];
  private nextNoteTime: number = 0;
  private musicInterval: number | null = null;
  private currentChordIndex: number = 0;

  // Configuration
  private volume = 0.3; // Master volume

  constructor() {
    // Lazy initialization in init() to handle browser autoplay policies
  }

  public init() {
    if (this.ctx) return;

    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.4; // Lower than SFX
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.masterGain);
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- SOUND EFFECTS ---

  public playAttack(isMelee: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.sfxGain);

    const now = this.ctx.currentTime;

    if (isMelee) {
        // Swoosh sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } else {
        // Pew sound
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }
  }

  public playKill() {
    if (!this.ctx || !this.sfxGain) return;
    
    const t = this.ctx.currentTime;
    
    // Crunch/Noise emulation using low frequency saw waves
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 0.1);
    
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playGoldPickup() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // High pitched ding
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.linearRampToValueAtTime(1800, t + 0.05); // Slight pitch up
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playDamage() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.15);
    
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playStageClear() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    
    // Victory Arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
    
    notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.connect(gain);
        gain.connect(this.sfxGain!);
        
        const start = t + (i * 0.1);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.4, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.6);
        
        osc.start(start);
        osc.stop(start + 0.6);
    });
  }

  public playLevelUp() {
      // Similar to Stage Clear but warmer
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      const notes = [440, 554, 659]; // A Major
      
      notes.forEach((freq, i) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.connect(gain);
          gain.connect(this.sfxGain!);
          
          const start = t + (i * 0.05);
          osc.type = 'sine';
          osc.frequency.value = freq;
          
          gain.gain.setValueAtTime(0.2, start);
          gain.gain.exponentialRampToValueAtTime(0.01, start + 0.5);
          
          osc.start(start);
          osc.stop(start + 0.5);
      });
  }

  // --- BACKGROUND MUSIC (Ambient Drone/Sequencer) ---

  public startMusic() {
    if (!this.ctx || this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.resume();
    this.scheduleNextNote();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
        window.clearTimeout(this.musicInterval);
        this.musicInterval = null;
    }
    this.musicOscillators.forEach(osc => {
        try { osc.stop(); } catch(e){}
    });
    this.musicOscillators = [];
  }

  private scheduleNextNote() {
      if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;

      // Simple ambient progression (Dm - Bb - F - C)
      const chords = [
          [146.83, 220.00], // D3, A3
          [116.54, 174.61], // Bb2, F3
          [174.61, 261.63], // F3, C4
          [130.81, 196.00]  // C3, G3
      ];

      const duration = 2.0; // Seconds per chord
      const now = this.ctx.currentTime;
      const chord = chords[this.currentChordIndex];

      chord.forEach(freq => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          
          osc.connect(gain);
          gain.connect(this.musicGain!);
          
          osc.type = 'triangle';
          osc.frequency.value = freq;
          
          // Attack/Decay envelope for pad sound
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.5);
          gain.gain.linearRampToValueAtTime(0, now + duration);
          
          osc.start(now);
          osc.stop(now + duration);
          
          this.musicOscillators.push(osc);
      });

      // Cleanup old oscillators
      setTimeout(() => {
          this.musicOscillators = this.musicOscillators.filter(o => {
              // rough check, ideally use 'onended'
              return false; 
          });
      }, duration * 1000);

      this.currentChordIndex = (this.currentChordIndex + 1) % chords.length;
      
      // Schedule next loop
      this.musicInterval = window.setTimeout(() => this.scheduleNextNote(), (duration - 0.1) * 1000);
  }
}

export const AudioSystem = new AudioController();
