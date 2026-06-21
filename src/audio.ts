class AudioManager {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  initialized = false;
  
  bgmInterval: any = null;
  nextNoteTime = 0;
  current16thNote = 0;
  isPlayingBgm = false;
  
  cachedNoiseBuffer: AudioBuffer | null = null;

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.15;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn("AudioContext could not be initialized");
    }
  }

  getNoiseBuffer(duration = 1) {
    if (!this.ctx) return null;
    if (this.cachedNoiseBuffer) return this.cachedNoiseBuffer;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    this.cachedNoiseBuffer = buffer;
    return buffer;
  }

  currentMapId = 'm1';

  scheduleNote() {
    if (!this.ctx || !this.isPlayingBgm) return;
    
    // schedule up to 0.2s ahead
    while (this.nextNoteTime < this.ctx.currentTime + 0.2) {
        this.playBeat(this.current16thNote, this.nextNoteTime, this.currentMapId);
        
        this.current16thNote++;
        if (this.current16thNote >= 16) {
            this.current16thNote = 0;
        }
        
        // Fast BPM for runner game
        const bpm = this.currentMapId === 'm3' ? 160 : this.currentMapId === 'm2' ? 145 : 150;
        const secondsPerBeat = 60.0 / bpm;
        this.nextNoteTime += 0.25 * secondsPerBeat; 
    }
    
    this.bgmInterval = setTimeout(() => this.scheduleNote(), 50);
  }

  playBgm(mapId: string) {
    if (!this.ctx || !this.masterGain) return;
    if (this.isPlayingBgm) this.stopBgm();
    
    this.ctx.resume();
    this.isPlayingBgm = true;
    this.currentMapId = mapId;
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduleNote();
  }

  stopBgm() {
    this.isPlayingBgm = false;
    if (this.bgmInterval) {
        clearTimeout(this.bgmInterval);
        this.bgmInterval = null;
    }
  }

  playBeat(step: number, time: number, mapId: string) {
      if (!this.ctx || !this.masterGain) return;

      const playKick = () => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.frequency.setValueAtTime(150, time);
          osc.frequency.exponentialRampToValueAtTime(30, time + 0.2); // Faster drop for punchy kick
          gain.gain.setValueAtTime(0.5, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
          osc.connect(gain);
          gain.connect(this.masterGain!);
          osc.start(time);
          osc.stop(time + 0.2);
      };

      const playSnare = () => {
          const noise = this.ctx!.createBufferSource();
          const nBuffer = this.getNoiseBuffer();
          if(!nBuffer) return;
          noise.buffer = nBuffer;
          const filter = this.ctx!.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 1500;
          const gain = this.ctx!.createGain();
          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain!);
          noise.start(time);
          noise.stop(time + 0.15);
          
          const osc = this.ctx!.createOscillator();
          const oscGain = this.ctx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(250, time);
          oscGain.gain.setValueAtTime(0.2, time);
          oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
          osc.connect(oscGain);
          oscGain.connect(this.masterGain!);
          osc.start(time);
          osc.stop(time + 0.15);
      };

      const playHihat = (open: boolean) => {
          const noise = this.ctx!.createBufferSource();
          const nBuffer = this.getNoiseBuffer();
          if(!nBuffer) return;
          noise.buffer = nBuffer;
          const filter = this.ctx!.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.value = 6000;
          const gain = this.ctx!.createGain();
          gain.gain.setValueAtTime(open ? 0.1 : 0.05, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.2 : 0.05));
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain!);
          noise.start(time);
          noise.stop(time + (open ? 0.2 : 0.05));
      };

      const playBass = (freq: number, duration: number) => {
          const osc = this.ctx!.createOscillator();
          const osc2 = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const filter = this.ctx!.createBiquadFilter();
          
          osc.type = mapId === 'm3' ? 'sawtooth' : 'square';
          osc2.type = mapId === 'm3' ? 'sawtooth' : 'square';
          osc.frequency.setValueAtTime(freq, time);
          osc2.frequency.setValueAtTime(freq * 1.01, time); // slight detune
          
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(mapId === 'm3' ? 1200 : 800, time);
          filter.frequency.exponentialRampToValueAtTime(100, time + duration);

          gain.gain.setValueAtTime(0.2, time);
          gain.gain.setTargetAtTime(0, time + duration * 0.8, 0.05);

          osc.connect(filter);
          osc2.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain!);
          
          osc.start(time);
          osc2.start(time);
          osc.stop(time + duration);
          osc2.stop(time + duration);
      };

      const playSynth = (freq: number, duration: number) => {
          const osc = this.ctx!.createOscillator();
          const osc2 = this.ctx!.createOscillator();
          const osc3 = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          
          const type = mapId === 'm3' ? 'sawtooth' : mapId === 'm2' ? 'triangle' : 'sine';
          osc.type = type;
          osc2.type = type;
          osc3.type = type;

          if (mapId === 'm3') {
              const filter = this.ctx!.createBiquadFilter();
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(3000, time);
              filter.frequency.exponentialRampToValueAtTime(500, time + duration);
              
              osc.connect(filter);
              osc2.connect(filter);
              osc3.connect(filter);
              filter.connect(gain);
          } else {
              osc.connect(gain);
              osc2.connect(gain);
              if (mapId === 'm2') osc3.connect(gain);
          }
          
          osc.frequency.setValueAtTime(freq, time);
          osc2.frequency.setValueAtTime(freq * 1.005, time);
          osc3.frequency.setValueAtTime(freq * 0.995, time);
          
          gain.gain.setValueAtTime(0.08, time);
          gain.gain.setTargetAtTime(0, time + duration * 0.8, 0.05);

          gain.connect(this.masterGain!);
          
          osc.start(time);
          osc2.start(time);
          if (mapId === 'm2' || mapId === 'm3') osc3.start(time);
          
          osc.stop(time + duration);
          osc2.stop(time + duration);
          if (mapId === 'm2' || mapId === 'm3') osc3.stop(time + duration);
      };

      if (step % 4 === 0) playKick(); // 4-to-the-floor kick
      if (step % 8 === 4) playSnare(); // Snare on 2 and 4
      if (step % 2 === 1) playHihat(false); // Offbeat hihat
      if (mapId === 'm3' && step % 4 === 2) playHihat(true);


      const m1Bass = [65.41, 0, 65.41, 65.41, 65.41, 0, 65.41, 65.41, 77.78, 0, 77.78, 77.78, 87.31, 0, 87.31, 87.31];
      const m2Bass = [65.41, 65.41, 65.41, 0, 77.78, 0, 77.78, 77.78, 65.41, 65.41, 65.41, 0, 92.50, 0, 92.50, 92.50]; 
      const m3Bass = [65.41, 65.41, 0, 65.41, 65.41, 0, 65.41, 65.41, 58.27, 58.27, 0, 58.27, 58.27, 0, 87.31, 87.31]; 

      let bassFreq = m1Bass[step];
      if (mapId === 'm2' || mapId === 'm4') bassFreq = m2Bass[step];
      if (mapId === 'm3') bassFreq = m3Bass[step];
      
      if (bassFreq > 0) {
          playBass(bassFreq, 0.15);
      }
      
      const m1Arp = [523.25, 0, 659.25, 0, 783.99, 0, 659.25, 0, 523.25, 0, 659.25, 0, 880.00, 0, 783.99, 0];
      const m2Arp = [523.25, 0, 622.25, 0, 783.99, 0, 622.25, 0, 523.25, 0, 622.25, 0, 932.33, 0, 783.99, 0];
      const m3Arp = [1046.50, 783.99, 932.33, 523.25, 1046.50, 783.99, 932.33, 523.25, 1244.51, 932.33, 1046.50, 622.25, 1244.51, 932.33, 1046.50, 622.25];

      let arpFreq = m1Arp[step];
      if (mapId === 'm2' || mapId === 'm4') arpFreq = m2Arp[step];
      if (mapId === 'm3') arpFreq = m3Arp[step];
      
      if (arpFreq > 0) {
          if (mapId === 'm3') {
              playSynth(arpFreq, 0.1);
          } else {
              playSynth(arpFreq, 0.2);
          }
      }
  }

  playJump() {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playSlide() {
    if (!this.ctx || !this.masterGain) return;
    
    const noise = this.ctx.createBufferSource();
    const nBuffer = this.getNoiseBuffer();
    if(!nBuffer) return;
    noise.buffer = nBuffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start();
  }

  playCoin() {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playHit() {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playVampireSound() {
    if (!this.ctx || !this.masterGain) return;
    const time = this.ctx.currentTime;
    
    // Spooky bat screech
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(3000, time);
    osc.frequency.exponentialRampToValueAtTime(150, time + 0.8);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5000, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + 0.8);

    // Give it a bit more volume to be audible
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(time);
    osc.stop(time + 0.8);
    
    // Bat wings flapping
    for (let i = 0; i < 8; i++) {
        const flapTime = time + i * 0.12;
        this.playFlap(flapTime);
    }
  }

  playFlap(time: number) {
      if(!this.ctx || !this.masterGain) return;
      const noise = this.ctx.createBufferSource();
      const nBuffer = this.getNoiseBuffer();
      if(!nBuffer) return;
      noise.buffer = nBuffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, time);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.5, time + 0.05); // Louder flaps
      gain.gain.linearRampToValueAtTime(0, time + 0.1);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(time);
      noise.stop(time + 0.1);
  }
}

export const audioManager = new AudioManager();
