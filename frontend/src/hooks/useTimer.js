import { useEffect, useMemo, useState } from 'react'

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function useTimer({ running }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setSeconds((v) => v + 1), 1000)
    return () => window.clearInterval(id)
  }, [running])

  const mmss = useMemo(() => formatMMSS(seconds), [seconds])

  return {
    seconds,
    mmss,
    reset: () => setSeconds(0),
  }
}

