import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn('flex flex-col', className)} data-value={value} data-onchange={onValueChange.name}>
      {children}
    </div>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn('inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1', className)}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  activeValue: string
  onClick: (value: string) => void
  children: ReactNode
  className?: string
}

export function TabsTrigger({ value, activeValue, onClick, children, className }: TabsTriggerProps) {
  const isActive = value === activeValue
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all cursor-pointer',
        isActive ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}
