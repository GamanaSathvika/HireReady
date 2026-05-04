import { useEffect, useMemo, useState } from 'react'

function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function useTimer({ running }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;

    let startTime = performance.now() - seconds * 1000;
    let animationFrameId;

    const tick = (currentTime) => {
      const elapsed = Math.floor((currentTime - startTime) / 1000);
      setSeconds(elapsed);
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, [running]);

  const mmss = useMemo(() => formatMMSS(seconds), [seconds]);

  return {
    seconds,
    mmss,
    reset: () => setSeconds(0),
  };
}

