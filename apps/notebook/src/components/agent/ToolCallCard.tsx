import { ChevronDown, ChevronRight, Wrench } from 'lucide-react'
import { useState } from 'react'
import type { AgentToolCall } from '@/agent/types'
import { cn } from '@/lib/utils'

interface ToolCallCardProps {
  toolCall: AgentToolCall
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-md border border-border bg-muted/30 text-xs">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Wrench className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono">{toolCall.toolName}</span>
        <span className={cn(
          'ml-auto rounded px-1.5 py-0.5',
          toolCall.status === 'running' && 'bg-amber-500/15 text-amber-600',
          toolCall.status === 'done' && 'bg-emerald-500/15 text-emerald-600',
          toolCall.status === 'error' && 'bg-destructive/15 text-destructive',
        )}>
          {toolCall.status}
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
          <div>
            <div className="mb-1 text-foreground/70">input</div>
            <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(toolCall.input, null, 2)}</pre>
          </div>
          {toolCall.output !== undefined && (
            <div>
              <div className="mb-1 text-foreground/70">output</div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap">{JSON.stringify(toolCall.output, null, 2)}</pre>
            </div>
          )}
          {toolCall.error && (
            <div className="text-destructive">{toolCall.error}</div>
          )}
        </div>
      )}
    </div>
  )
}
