import { cn } from '../lib/cn'

export function Spinner({ className }) {
  return (
    <div
      className={cn(
        'h-10 w-10 rounded-full border-2 border-white/15 border-t-white/75 animate-spin',
        className,
      )}
      aria-label="Loading"
      role="status"
    />
  )
}

