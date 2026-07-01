import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  compact?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, compact, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'rounded-md border border-input bg-background shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        compact
          ? 'h-7 min-w-0 max-w-full truncate px-2 py-0 text-xs'
          : 'flex h-9 w-full px-3 py-1 text-sm',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'
