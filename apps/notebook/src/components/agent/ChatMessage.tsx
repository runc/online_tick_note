import { memo } from 'react'
import type { AgentArtifact, AgentMessage } from '@/agent/types'
import { MarkdownContent } from '@/components/agent/MarkdownContent'
import { ToolCallCard } from '@/components/agent/ToolCallCard'
import { OutputRenderer } from '@/components/output/OutputRenderer'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: AgentMessage
  isAnimating?: boolean
}

export const ChatMessage = memo(function ChatMessage({ message, isAnimating = false }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex w-full min-w-0', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'min-w-0 space-y-2 rounded-lg text-sm',
        isUser
          ? 'max-w-[min(85%,36rem)] bg-primary px-4 py-3 text-primary-foreground'
          : 'w-full bg-muted px-4 py-3',
      )}>
        {message.content && (
          isUser
            ? <div className="whitespace-pre-wrap">{message.content}</div>
            : <MarkdownContent content={message.content} isAnimating={isAnimating} />
        )}
        {!isUser && message.toolCalls?.map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}
      </div>
    </div>
  )
})

interface ArtifactPanelProps {
  artifacts: AgentArtifact[]
  emptyLabel: string
}

export function ArtifactPanel({ artifacts, emptyLabel }: ArtifactPanelProps) {
  if (artifacts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {artifacts.map((artifact) => (
        <div key={artifact.id} className="rounded-lg border border-border bg-card">
          <OutputRenderer items={[artifact.output]} bars={artifact.bars} />
        </div>
      ))}
    </div>
  )
}
