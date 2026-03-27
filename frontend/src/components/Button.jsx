import { cn } from '../lib/cn'

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:ring-offset-0 disabled:opacity-40 disabled:pointer-events-none'

  const variants = {
    primary:
      'bg-white text-black hover:bg-white/95 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_22px_70px_rgba(0,0,0,0.6)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.24),0_28px_85px_rgba(0,0,0,0.65)] active:scale-[0.99]',
    accent:
      'bg-yellow-400 text-black hover:bg-yellow-300 shadow-[0_0_0_1px_rgba(250,204,21,0.25),0_26px_85px_rgba(0,0,0,0.7)] hover:shadow-[0_0_0_1px_rgba(250,204,21,0.55),0_32px_105px_rgba(0,0,0,0.72)] active:scale-[0.99]',
    ghost:
      'bg-white/0 text-white hover:bg-white/6 shadow-[0_0_0_1px_rgba(255,255,255,0.10)]',
    danger:
      'bg-red-500 text-white hover:bg-red-500/95 shadow-[0_0_0_1px_rgba(239,68,68,0.38),0_22px_70px_rgba(0,0,0,0.6)]',
  }

  const sizes = {
    md: 'h-12 px-5 text-[15px]',
    lg: 'h-14 px-7 text-[16px]',
  }

  return (
    <button
      className={cn(
        base,
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

