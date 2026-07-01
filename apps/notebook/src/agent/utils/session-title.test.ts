import { describe, expect, it } from 'vitest'
import { deriveSessionTitleFromMessage, isDefaultAgentSessionTitle } from './session-title'

describe('deriveSessionTitleFromMessage', () => {
  it('trims and collapses whitespace', () => {
    expect(deriveSessionTitleFromMessage('  分析一下   SH600519  ')).toBe('分析一下 SH600519')
  })

  it('truncates long text with ellipsis', () => {
    const long = '这是一段很长的问题'.repeat(10)
    const title = deriveSessionTitleFromMessage(long, 20)
    expect(title.endsWith('…')).toBe(true)
    expect(title.length).toBeLessThanOrEqual(20)
  })

  it('returns empty for blank input', () => {
    expect(deriveSessionTitleFromMessage('   ')).toBe('')
  })
})

describe('isDefaultAgentSessionTitle', () => {
  it('detects localized default titles', () => {
    expect(isDefaultAgentSessionTitle('新对话', 'zh')).toBe(true)
    expect(isDefaultAgentSessionTitle('New Conversation', 'en')).toBe(true)
    expect(isDefaultAgentSessionTitle('分析一下 SH600519', 'zh')).toBe(false)
  })
})
