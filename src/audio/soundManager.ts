/**
 * SoundManager – Web Audio API Sounddesign (Teil 13).
 *
 * Hinweis: Es liegen keine lizenzierten/aufgenommenen Audiodateien vor. Alle
 * Effekte werden daher prozedural synthetisiert (Oszillatoren/Rauschpuffer).
 * Die Architektur (getrennte Musik-/Effekt-Busse, Web Audio API, geringe
 * Latenz) entspricht Teil 13.5 und kann später 1:1 durch produzierte
 * Audiodateien ersetzt werden, ohne die Aufrufstellen zu ändern.
 */

type NoiseKind = 'white' | 'pink'

// Sommerlich-folkloristische Dauerschleife (Teil 13.4), pentatonisch, damit sie sich trotz
// Zufälligkeit-freier Synthese nicht dissonant/computerhaft anhört. Freq. in Hz, Dauer in Sekunden.
const MUSIC_MELODY: { f: number; d: number }[] = [
  { f: 392, d: 0.5 },
  { f: 440, d: 0.5 },
  { f: 494, d: 0.5 },
  { f: 587, d: 0.75 },
  { f: 494, d: 0.5 },
  { f: 440, d: 0.5 },
  { f: 392, d: 1.0 },
  { f: 0, d: 0.5 },
  { f: 440, d: 0.5 },
  { f: 494, d: 0.5 },
  { f: 587, d: 0.5 },
  { f: 659, d: 0.75 },
  { f: 587, d: 0.5 },
  { f: 494, d: 0.5 },
  { f: 440, d: 1.0 },
  { f: 0, d: 0.75 },
]

class SoundManager {
  private ctx: AudioContext | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private ambientSource: AudioBufferSourceNode | null = null
  private ambientGain: GainNode | null = null
  private musicVolume = 0.5
  private sfxVolume = 0.8
  private noiseBufferCache = new Map<NoiseKind, AudioBuffer>()
  private musicTimer: number | null = null

  ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctx()
      this.musicGain = this.ctx.createGain()
      this.sfxGain = this.ctx.createGain()
      this.musicGain.gain.value = this.musicVolume
      this.sfxGain.gain.value = this.sfxVolume
      this.musicGain.connect(this.ctx.destination)
      this.sfxGain.connect(this.ctx.destination)
      this.startMusicLoop()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  /** Läuft leise über Menüs und Spiel hinweg, sobald der erste Nutzer-Tap den AudioContext freigibt. */
  private startMusicLoop() {
    if (this.musicTimer !== null) return
    const totalDuration = MUSIC_MELODY.reduce((sum, n) => sum + n.d, 0)
    const playSequence = () => {
      let t = 0
      for (const note of MUSIC_MELODY) {
        if (note.f > 0) {
          window.setTimeout(() => {
            if (this.musicTimer === null) return
            this.musicNote(note.f, note.d * 0.9)
          }, t * 1000)
        }
        t += note.d
      }
    }
    playSequence()
    this.musicTimer = window.setInterval(playSequence, totalDuration * 1000)
  }

  private musicNote(freq: number, duration: number) {
    const ctx = this.ensureContext()
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(this.musicGain!)
    osc.start()
    osc.stop(ctx.currentTime + duration + 0.05)
  }

  setMusicVolume(v: number) {
    this.musicVolume = v
    if (this.musicGain) this.musicGain.gain.value = v
  }

  setSfxVolume(v: number) {
    this.sfxVolume = v
    if (this.sfxGain) this.sfxGain.gain.value = v
  }

  private noiseBuffer(kind: NoiseKind = 'white'): AudioBuffer {
    const ctx = this.ensureContext()
    const cached = this.noiseBufferCache.get(kind)
    if (cached) return cached
    const length = ctx.sampleRate * 2
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      if (kind === 'pink') {
        last = (last + 0.04 * white) / 1.04
        data[i] = last * 3.5
      } else {
        data[i] = white
      }
    }
    this.noiseBufferCache.set(kind, buffer)
    return buffer
  }

  private tone(freq: number, duration: number, opts: { type?: OscillatorType; gain?: number; freqEnd?: number } = {}) {
    const ctx = this.ensureContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = opts.type ?? 'sine'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), ctx.currentTime + duration)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(opts.gain ?? 0.3, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(this.sfxGain!)
    osc.start()
    osc.stop(ctx.currentTime + duration + 0.05)
  }

  private noiseBurst(duration: number, opts: { kind?: NoiseKind; filterFreq?: number; filterType?: BiquadFilterType; gain?: number } = {}) {
    const ctx = this.ensureContext()
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer(opts.kind ?? 'white')
    const filter = ctx.createBiquadFilter()
    filter.type = opts.filterType ?? 'bandpass'
    filter.frequency.value = opts.filterFreq ?? 1200
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(opts.gain ?? 0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxGain!)
    src.start()
    src.stop(ctx.currentTime + duration + 0.05)
  }

  playThrow() {
    this.noiseBurst(0.08, { filterFreq: 600, gain: 0.25 })
  }

  playRollConcrete(power = 0.6) {
    this.noiseBurst(0.9 + power * 0.6, { kind: 'pink', filterFreq: 300, filterType: 'lowpass', gain: 0.15 + power * 0.15 })
  }

  playRollGutter() {
    this.noiseBurst(1.1, { kind: 'white', filterFreq: 1800, filterType: 'highpass', gain: 0.3 })
  }

  playPinsFall(count: number) {
    for (let i = 0; i < Math.max(1, count); i++) {
      const delay = i * 40
      window.setTimeout(() => {
        // Hölzernes "Rums": tiefer Thump-Ton plus knackiges Rauschen für mehr Wucht.
        this.tone(90 + Math.random() * 40, 0.18, { type: 'sine', gain: 0.22 })
        this.noiseBurst(0.25, { filterFreq: 350 + Math.random() * 200, gain: 0.32 })
      }, delay)
    }
  }

  playAllNine() {
    ;[523, 659, 784, 1047].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.35, { type: 'triangle', gain: 0.25 }), i * 90)
    })
  }

  playLeverPull() {
    this.tone(180, 0.4, { type: 'sawtooth', freqEnd: 260, gain: 0.15 })
    this.noiseBurst(0.35, { filterFreq: 2500, filterType: 'highpass', gain: 0.1 })
  }

  playGearMechanism() {
    for (let i = 0; i < 6; i++) {
      window.setTimeout(() => this.noiseBurst(0.08, { filterFreq: 900, gain: 0.15 }), i * 150)
    }
  }

  playPinUpright() {
    this.tone(700, 0.08, { type: 'square', gain: 0.12 })
  }

  playBallReturn() {
    this.noiseBurst(1.2, { kind: 'pink', filterFreq: 250, filterType: 'lowpass', gain: 0.1 })
  }

  playPlayerSwitch() {
    this.tone(440, 0.15, { type: 'sine', freqEnd: 660, gain: 0.15 })
  }

  playRoundComplete() {
    ;[440, 554, 659].forEach((f, i) => window.setTimeout(() => this.tone(f, 0.25, { gain: 0.2 }), i * 100))
  }

  playVictory() {
    ;[523, 659, 784, 1047, 1319].forEach((f, i) => window.setTimeout(() => this.tone(f, 0.4, { type: 'triangle', gain: 0.22 }), i * 120))
  }

  playButtonClick() {
    this.tone(880, 0.05, { type: 'square', gain: 0.08 })
  }

  startAmbientLoop() {
    const ctx = this.ensureContext()
    if (this.ambientSource) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer('pink')
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const gain = ctx.createGain()
    this.ambientGain = gain
    gain.gain.value = 0.04
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.musicGain!)
    src.start()
    this.ambientSource = src
  }

  stopAmbientLoop() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6)
    }
    const source = this.ambientSource
    window.setTimeout(() => source?.stop(), 650)
    this.ambientSource = null
    this.ambientGain = null
  }
}

export const soundManager = new SoundManager()
