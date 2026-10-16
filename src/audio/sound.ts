import checkUrl from '../assets/sounds/check.mp3'

// All sounds are synthesized with WebAudio, so no asset files are needed.
let ctx: AudioContext | null = null
let muted = false
try {
  muted = localStorage.getItem('xiangqi-muted') === '1'
} catch {
  /* storage unavailable */
}

const getCtx = () => {
  if (muted) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export const isMuted = () => muted
export const setMuted = (m: boolean) => {
  muted = m
  if (!m) preloadSounds()
  try {
    localStorage.setItem('xiangqi-muted', m ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function tone(
  c: AudioContext,
  { freq, end = freq, start = 0, dur = 0.15, type = 'sine', gain = 0.3 }: {
    freq: number
    end?: number
    start?: number
    dur?: number
    type?: OscillatorType
    gain?: number
  },
) {
  const t = c.currentTime + start
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise(c: AudioContext, { start = 0, dur = 0.12, gain = 0.4, freq = 1800 }: {
  start?: number
  dur?: number
  gain?: number
  freq?: number
}) {
  const t = c.currentTime + start
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter).connect(g).connect(c.destination)
  src.start(t)
}

/** Wooden "tock" of a piece being placed. */
export function playMove() {
  const c = getCtx()
  if (!c) return
  tone(c, { freq: 420, end: 150, dur: 0.09, type: 'triangle', gain: 0.35 })
  noise(c, { dur: 0.04, gain: 0.25, freq: 2600 })
}

/** Heavier smack plus a crack for a capture. */
export function playCapture() {
  const c = getCtx()
  if (!c) return
  tone(c, { freq: 220, end: 60, dur: 0.22, type: 'triangle', gain: 0.6 })
  tone(c, { freq: 700, end: 200, dur: 0.1, type: 'square', gain: 0.12 })
  noise(c, { dur: 0.18, gain: 0.5, freq: 1400 })
  noise(c, { start: 0.05, dur: 0.12, gain: 0.25, freq: 3500 })
}

const CHECK_START_MS = 200
const CHECK_END_MS = 1200
const CHECK_FADE_S = 0.15

// Decoded ahead of time so the sound starts the instant a check happens.
let checkBuffer: AudioBuffer | null = null
let checkLoading = false

/** Call from a user gesture (e.g. starting a game) so the check clip is ready before it is needed. */
export function preloadSounds() {
  if (checkBuffer || checkLoading) return
  const c = getCtx()
  if (!c) return
  checkLoading = true
  fetch(checkUrl)
    .then((r) => r.arrayBuffer())
    .then((data) => c.decodeAudioData(data))
    .then((buf) => (checkBuffer = buf))
    .catch(() => undefined)
    .finally(() => (checkLoading = false))
}

/** Check sound: only the 200ms–1200ms slice of the clip is played, with a short fade-out. */
export function playCheck() {
  const c = getCtx()
  if (!c) return
  if (!checkBuffer) {
    preloadSounds()
    tone(c, { freq: 880, dur: 0.12, type: 'square', gain: 0.12 })
    return
  }
  const dur = (CHECK_END_MS - CHECK_START_MS) / 1000
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = checkBuffer
  const g = c.createGain()
  g.gain.setValueAtTime(1, t)
  g.gain.setValueAtTime(1, t + dur - CHECK_FADE_S)
  g.gain.linearRampToValueAtTime(0, t + dur)
  src.connect(g).connect(c.destination)
  src.start(t, CHECK_START_MS / 1000, dur)
}

export function playWin() {
  const c = getCtx()
  if (!c) return
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    tone(c, { freq: f, start: i * 0.14, dur: 0.3, type: 'triangle', gain: 0.3 }),
  )
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f) =>
    tone(c, { freq: f, start: 0.6, dur: 0.7, type: 'sine', gain: 0.15 }),
  )
}

export function playLose() {
  const c = getCtx()
  if (!c) return
  ;[392, 349.23, 311.13, 261.63].forEach((f, i) =>
    tone(c, { freq: f, end: f * 0.97, start: i * 0.22, dur: 0.35, type: 'sawtooth', gain: 0.14 }),
  )
}
