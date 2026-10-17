// Professional sound notifications using the Web Audio API.
// No audio files needed — all tones are synthesized at runtime.
// Each notification type has a distinct, professional tone:
//   - default:    gentle 2-tone chime
//   - success:    rising major arpeggio
//   - error:      short low buzz
//   - payment:    coin-chime (3 quick high notes)
//   - message:    soft bell
//   - certificate: triumphant fanfare
//   - enrollment:  welcoming chord
//   - danger:      warning siren

let _audioCtx: AudioContext | null = null
let _muted = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!_audioCtx) {
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctor) return null
      _audioCtx = new Ctor()
    } catch {
      return null
    }
  }
  // Browsers suspend the context until a user gesture. Try to resume.
  if (_audioCtx && _audioCtx.state === 'suspended') {
    try { _audioCtx.resume() } catch {}
  }
  return _audioCtx
}

// Play a single tone at the given frequency + duration.
// Default gain is 0.5 (LOUD) — previous 0.18 was inaudible on most
// systems in real-world testing. The user explicitly opted into
// sound notifications, so we err on the side of audible.
function playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, gainValue = 0.5, type: OscillatorType = 'triangle') {
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.015) // 15ms attack
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration) // exponential decay
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + duration + 0.05)
  } catch {}
}

export type SoundType =
  | 'default' | 'success' | 'error' | 'payment'
  | 'message' | 'certificate' | 'enrollment' | 'danger'

// Compose a short tune per sound type. Each tune is an array of
// { freq, duration, gain } — played in sequence.
// Gains are deliberately LOUD (0.5-0.7) so the tones cut through
// any background noise. Lower values (0.18) were inaudible on most
// systems in real-world testing.
const TUNES: Record<SoundType, { freq: number, dur: number, gain?: number, type?: OscillatorType }[]> = {
  // Default gentle 2-tone chime (E5 → A5) — louder + triangle wave
  // for a more piercing ring
  default: [
    { freq: 659.25, dur: 0.20, gain: 0.5, type: 'triangle' as OscillatorType }, // E5
    { freq: 880.00, dur: 0.35, gain: 0.6, type: 'triangle' as OscillatorType }, // A5
  ],
  // Rising major arpeggio (C → E → G → C) — bold + triumph
  success: [
    { freq: 523.25, dur: 0.15, gain: 0.5, type: 'triangle' as OscillatorType }, // C5
    { freq: 659.25, dur: 0.15, gain: 0.5, type: 'triangle' as OscillatorType }, // E5
    { freq: 783.99, dur: 0.15, gain: 0.5, type: 'triangle' as OscillatorType }, // G5
    { freq: 1046.50, dur: 0.40, gain: 0.65, type: 'triangle' as OscillatorType }, // C6
  ],
  // Low buzz — descending minor (G3 → F3) — kept square for
  // harshness but louder
  error: [
    { freq: 196.00, dur: 0.22, type: 'square' as OscillatorType, gain: 0.4 },
    { freq: 174.61, dur: 0.32, type: 'square' as OscillatorType, gain: 0.4 },
  ],
  // Coin-chime — 3 quick high notes (E6 → E6 → B6) — very piercing
  payment: [
    { freq: 1318.51, dur: 0.09, gain: 0.55, type: 'triangle' as OscillatorType }, // E6
    { freq: 1318.51, dur: 0.09, gain: 0.55, type: 'triangle' as OscillatorType }, // E6
    { freq: 1975.53, dur: 0.25, gain: 0.65, type: 'triangle' as OscillatorType }, // B6
  ],
  // Soft bell — one mellow note (louder though)
  message: [
    { freq: 880.00, dur: 0.40, gain: 0.4, type: 'sine' as OscillatorType },
  ],
  // Triumphant fanfare (C5 → G5 → C6 hold) — bold
  certificate: [
    { freq: 523.25, dur: 0.16, gain: 0.55, type: 'triangle' as OscillatorType }, // C5
    { freq: 659.25, dur: 0.16, gain: 0.55, type: 'triangle' as OscillatorType }, // E5
    { freq: 783.99, dur: 0.16, gain: 0.55, type: 'triangle' as OscillatorType }, // G5
    { freq: 1046.50, dur: 0.45, gain: 0.65, type: 'triangle' as OscillatorType }, // C6
    { freq: 1318.51, dur: 0.45, gain: 0.65, type: 'triangle' as OscillatorType }, // E6
  ],
  // Welcoming chord (G major arpeggio)
  enrollment: [
    { freq: 392.00, dur: 0.16, gain: 0.5, type: 'triangle' as OscillatorType }, // G4
    { freq: 493.88, dur: 0.16, gain: 0.5, type: 'triangle' as OscillatorType }, // B4
    { freq: 587.33, dur: 0.16, gain: 0.5, type: 'triangle' as OscillatorType }, // D5
    { freq: 783.99, dur: 0.40, gain: 0.65, type: 'triangle' as OscillatorType }, // G5
  ],
  // Warning siren — two alternating tones, LOUD
  danger: [
    { freq: 440.00, dur: 0.22, type: 'sawtooth' as OscillatorType, gain: 0.5 },
    { freq: 220.00, dur: 0.22, type: 'sawtooth' as OscillatorType, gain: 0.5 },
    { freq: 440.00, dur: 0.22, type: 'sawtooth' as OscillatorType, gain: 0.5 },
    { freq: 220.00, dur: 0.35, type: 'sawtooth' as OscillatorType, gain: 0.5 },
  ],
}

// Map notification types → sound types. Used by the bell so that
// each incoming notification plays the right tone.
export const NOTIFICATION_TYPE_TO_SOUND: Record<string, SoundType> = {
  enrollment: 'enrollment',
  payment: 'payment',
  certificate: 'certificate',
  completion: 'success',
  welcome: 'enrollment',
  contact: 'message',
  blog: 'default',
  registration: 'enrollment',
  forum: 'message',
  review: 'default',
  affiliate: 'default',
  message: 'message',
  reply: 'message',
  system: 'default',
}

export function playSound(type: SoundType = 'default'): boolean {
  if (_muted) return false
  const ctx = getCtx()
  if (!ctx) return false
  // Try to resume the context in case it's still suspended
  if (ctx.state === 'suspended') {
    try { ctx.resume() } catch {}
  }
  // If still suspended, the browser hasn't unlocked audio yet —
  // don't even try to play (would just throw a warning).
  if (ctx.state !== 'running') return false
  const tune = TUNES[type] || TUNES.default
  let t = ctx.currentTime
  for (const note of tune) {
    // Default to 0.5 gain + triangle wave for audibility
    playTone(ctx, note.freq, t, note.dur, note.gain ?? 0.5, note.type ?? 'triangle')
    t += note.dur * 0.75 // 25% gap between notes
  }
  return true
}

// Returns true if audio is currently unlocked + ready to play.
// Used by the bell to show the right hint UI.
export function isAudioReady(): boolean {
  if (typeof window === 'undefined') return false
  const ctx = getCtx()
  if (!ctx) return false
  return ctx.state === 'running'
}

// Forcibly try to unlock audio. Returns true if successful.
export function tryUnlockAudio(): boolean {
  if (typeof window === 'undefined') return false
  const ctx = getCtx()
  if (!ctx) return false
  if (ctx.state === 'suspended') {
    try { ctx.resume() } catch {}
  }
  return ctx.state === 'running'
}

export function playSoundForNotification(notificationType: string) {
  const sound = NOTIFICATION_TYPE_TO_SOUND[notificationType] || 'default'
  playSound(sound)
}

export function setMuted(muted: boolean) {
  _muted = muted
  try { localStorage.setItem('fia-sound-muted', muted ? '1' : '0') } catch {}
}

export function isMuted(): boolean {
  // Lazy-load from localStorage on first read
  if (!_muted) {
    try {
      _muted = localStorage.getItem('fia-sound-muted') === '1'
    } catch {}
  }
  return _muted
}

// Call once on user gesture (e.g. button click) to unlock audio on iOS.
export function unlockAudio() {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    try { ctx.resume() } catch {}
  }
  // Play a tiny silent blip to fully unlock audio
  playTone(ctx, 1, ctx.currentTime, 0.05, 0)
}
