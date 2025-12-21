
export class AudioManager {
  ctx: AudioContext;
  masterGain: GainNode;
  analyser: AnalyserNode;
  bufferNoise: AudioBuffer | null = null;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Global volume
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    
    this.createNoiseBuffer();
  }

  createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.bufferNoise = buffer;
  }

  resume() {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDash() {
    if (!this.bufferNoise) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.bufferNoise;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    src.start();
    src.stop(this.ctx.currentTime + 0.15);
  }

  playHit(isHeavy: boolean) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.type = isHeavy ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isHeavy ? 100 : 200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isHeavy ? 800 : 1500, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(isHeavy ? 0.8 : 0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (isHeavy ? 0.3 : 0.1));
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playKO() {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 1.5);
    
    // Vibrato
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 15;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();

    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 1.5);
    lfo.stop(this.ctx.currentTime + 1.5);
  }

  getWaveform(array: Uint8Array) {
    this.analyser.getByteTimeDomainData(array);
  }

  suspend() {
    this.ctx.suspend();
  }
}
