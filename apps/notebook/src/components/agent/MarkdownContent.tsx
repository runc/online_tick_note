import { Streamdown } from 'streamdown'
import { code } from '@streamdown/code'
import { cjk } from '@streamdown/cjk'
import { cn } from '@/lib/utils'

const markdownPlugins = { code, cjk }

interface MarkdownContentProps {
  content: string
  isAnimating?: boolean
  className?: string
}

export function MarkdownContent({ content, isAnimating = false, className }: MarkdownContentProps) {
  if (!content.trim()) return null

  return (
    <Streamdown
      className={cn('agent-markdown w-full min-w-0 text-sm leading-relaxed', className)}
      plugins={markdownPlugins}
      isAnimating={isAnimating}
      parseIncompleteMarkdown
    >
      {content}
    </Streamdown>
  )
}
