import { cn } from '../lib/cn'

export function MicButton({ state = 'idle', onClick, disabled }) {
  const recording = state === 'recording'
  const base =
    'relative grid place-items-center h-24 w-24 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 active:scale-[0.99]'

  const styles = recording
    ? 'bg-red-500/15 ring-1 ring-red-500/35 shadow-glowRed'
    : 'bg-white/5 ring-1 ring-white/12 shadow-glow hover:bg-white/7'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(base, styles, disabled && 'opacity-40 cursor-not-allowed')}
      aria-label={recording ? 'Stop recording' : 'Start recording'}
    >
      {recording && (
        <span
          className="absolute inset-0 rounded-full ring-1 ring-red-500/35 animate-pulseRing"
          aria-hidden="true"
        />
      )}
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        className={cn('transition-colors', recording ? 'text-red-400' : 'text-white')}
        aria-hidden="true"
      >
        <path
          d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M19 11a7 7 0 0 1-14 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M12 18v3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )
}

