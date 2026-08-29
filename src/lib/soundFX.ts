// ── Web Audio API Sound Effects Engine (100% Offline & Pure Synthesis) ────────

const SOUND_KEY = 'alphaPro_sound_enabled'

export const isSoundEnabled = (): boolean => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'false'
  } catch {
    return true
  }
}

export const setSoundEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SOUND_KEY, String(enabled))
  } catch {}
}

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
  if (!AudioCtx) return null
  return new AudioCtx()
}

/**
 * 🔔 Play double chime 'Ting!' sound for successful transaction
 */
export const playSuccessChime = (): void => {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Tone 1: High crisp G6 (1567.98 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(1567.98, now)
    gain1.gain.setValueAtTime(0.25, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.3)

    // Tone 2: Bright E7 (2637.02 Hz) delayed by 0.08s
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(2637.02, now + 0.08)
    gain2.gain.setValueAtTime(0.3, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.45)
  } catch {}
}

/**
 * 📣 Play smooth notification chime (C5 -> G5)
 */
export const playNotificationChime = (): void => {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, now) // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12) // G5
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.4)
  } catch {}
}

/**
 * 🎙️ Play mic record beep (Start / Stop voice listening)
 */
export const playMicBeep = (type: 'start' | 'stop' = 'start'): void => {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    const freq = type === 'start' ? 880 : 440
    osc.frequency.setValueAtTime(freq, now)
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.15)
  } catch {}
}

/**
 * 💬 Play subtle bot response pop
 */
export const playBotPop = (): void => {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, now)
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.08)
    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.12)
  } catch {}
}
