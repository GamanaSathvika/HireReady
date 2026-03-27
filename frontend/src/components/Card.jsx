import { cn } from '../lib/cn'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-[#111111] shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_28px_90px_rgba(0,0,0,0.72)] ring-1 ring-white/10 backdrop-blur-xl',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

