import { cn } from '../lib/cn'

export function Waveform({ active = false, className }) {
  const bars = new Array(18).fill(0)
  return (
    <div
      className={cn(
        'flex items-end justify-center gap-[5px] h-10 select-none',
        active ? 'opacity-100' : 'opacity-0',
        'transition-opacity duration-200',
        className,
      )}
      aria-hidden="true"
    >
      {bars.map((_, i) => {
        const d = (i % 6) * 0.08
        const h = 10 + ((i * 13) % 18)
        return (
          <div
            key={i}
            className={cn(
              'w-[5px] rounded-full bg-white/20 origin-bottom',
              active && 'bg-red-400/70 animate-bars',
            )}
            style={{
              height: `${h}px`,
              animationDelay: `${d}s`,
            }}
          />
        )
      })}
    </div>
  )
}

