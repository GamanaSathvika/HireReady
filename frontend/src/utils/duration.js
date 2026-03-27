/** Target session length in seconds (10 minutes). */
export const DEFAULT_DURATION_SECONDS = 600

/**
 * Parse landing/config duration to seconds.
 * - "10 min", "15 minutes" → minutes
 * - "5-10 min" or "5 to 10 min" → uses the larger number (honor upper bound)
 * - number ≥ 60 and multiple of 60 → treat as seconds (e.g. 600)
 * - small positive number → minutes (e.g. 10 → 600)
 */
export function parseDurationToSeconds(raw, fallbackSeconds = DEFAULT_DURATION_SECONDS) {
  const fallback =
    Number.isFinite(fallbackSeconds) && fallbackSeconds > 0
      ? Math.floor(fallbackSeconds)
      : DEFAULT_DURATION_SECONDS

  if (raw == null || raw === '') return fallback

  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    const n = raw
    if (n >= 60 && n % 60 === 0 && n <= 7200) return Math.floor(n)
    if (n < 60) return Math.floor(n * 60)
    return Math.min(Math.floor(n), 7200)
  }

  const s = String(raw).trim().toLowerCase()
  if (!s) return fallback

  if (/\bsec\b/.test(s)) {
    const m = s.match(/(\d+)/)
    return m ? Math.min(Math.max(parseInt(m[1], 10), 1), 7200) : fallback
  }

  const nums = s.match(/\d+/g)
  if (!nums?.length) return fallback

  const parsed = nums.map((x) => parseInt(x, 10)).filter((x) => Number.isFinite(x))
  if (!parsed.length) return fallback

  const minutes = Math.max(...parsed)
  if (minutes <= 0) return fallback

  return Math.min(minutes * 60, 7200)
}

export function formatDurationMMSS(totalSeconds) {
  const t = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(t / 60)
  const sec = t % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
