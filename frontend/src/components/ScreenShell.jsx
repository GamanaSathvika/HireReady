import { cn } from '../lib/cn'

export function ScreenShell({ className, children }) {
  return (
    <div className={cn('min-h-[100svh] w-full px-5 py-10', className)}>
      <div className="mx-auto w-full max-w-5xl">
        {children}
      </div>
    </div>
  )
}

