import { cn } from '@/lib/utils'

interface ResizeHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  orientation?: 'vertical' | 'horizontal'
}

export function ResizeHandle({
  active = false,
  orientation = 'vertical',
  className,
  ...props
}: ResizeHandleProps) {
  const isVertical = orientation === 'vertical'

  return (
    <div
      role="separator"
      aria-orientation={isVertical ? 'vertical' : 'horizontal'}
      className={cn(
        'group relative z-10 shrink-0 touch-none',
        isVertical ? 'w-px cursor-col-resize' : 'h-px cursor-row-resize',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'absolute bg-border transition-colors',
          isVertical
            ? 'inset-y-0 -left-1 w-[9px] group-hover:bg-primary/30 group-active:bg-primary/40'
            : 'inset-x-0 -top-1 h-[9px] group-hover:bg-primary/30 group-active:bg-primary/40',
          active && (isVertical ? 'bg-primary/40' : 'bg-primary/40'),
        )}
      />
    </div>
  )
}
