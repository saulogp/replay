let ctx: AudioContext | null = null

/** Libera o áudio; chame dentro de um toque/clique do usuário. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    /* sem Web Audio: a contagem segue só visual */
  }
}

/** Bip curto de contagem; `accent` = tom mais agudo (último número). */
export function beep(accent = false) {
  try {
    unlockAudio()
    if (!ctx) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = accent ? 1320 : 880
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.18)
  } catch {
    /* ignore */
  }
}
