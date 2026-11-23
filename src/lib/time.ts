/** 83.5 -> "1:23.5" */
export function formatTime(t: number, decimals = 1): string {
  if (!Number.isFinite(t) || t < 0) t = 0
  const factor = 10 ** decimals
  t = Math.round(t * factor) / factor
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t - h * 3600 - m * 60
  const width = decimals > 0 ? decimals + 3 : 2
  const sStr = s.toFixed(decimals).padStart(width, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sStr}` : `${m}:${sStr}`
}

/** Aceita "1:23.5", "83.5", "1:02:03", "1,5" */
export function parseTime(input: string): number | null {
  const str = input.trim().replace(',', '.')
  if (!str) return null
  const parts = str.split(':')
  if (parts.length > 3) return null
  let total = 0
  for (const p of parts) {
    if (!/^\d*\.?\d*$/.test(p) || p === '' || p === '.') return null
    total = total * 60 + parseFloat(p)
  }
  return Number.isFinite(total) ? total : null
}

export function formatDuration(t: number): string {
  if (t < 60) return `${t.toFixed(1).replace(/\.0$/, '')}s`
  return formatTime(t, 0)
}
