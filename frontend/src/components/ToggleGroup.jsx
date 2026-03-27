import { cn } from '../lib/cn'
import { OptionPill } from './OptionPill'

export function ToggleGroup({
  label,
  value,
  onChange,
  options,
  className,
  wrap = true,
}) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[15px] font-semibold text-[#E5E5E5]">{label}</div>
      </div>
      <div className={cn('mt-3 flex gap-2', wrap ? 'flex-wrap' : 'flex-nowrap')}>
        {options.map((opt) => {
          const key = typeof opt === 'string' ? opt : opt.value
          const v = typeof opt === 'string' ? opt : opt.value
          const content = typeof opt === 'string' ? opt : opt.label
          const rightSlot = typeof opt === 'string' ? null : opt.rightSlot

          return (
            <div key={key} className="flex items-center gap-2">
              <OptionPill selected={value === v} onClick={() => onChange(v)}>
                <span className="inline-flex items-center gap-2">
                  {content}
                  {rightSlot}
                </span>
              </OptionPill>
            </div>
          )
        })}
      </div>
    </div>
  )
}

