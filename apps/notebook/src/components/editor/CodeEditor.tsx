import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useSettingsStore } from '@/stores/settings-store'
import type { CellLang } from '@/types'

function createEditorTheme(colors: ReturnType<typeof useThemeColors>['editor']) {
  return EditorView.theme({
    '&': { backgroundColor: colors.background, fontSize: '13px' },
    '.cm-content': { fontFamily: 'ui-monospace, monospace', caretColor: colors.foreground },
    '.cm-gutters': { backgroundColor: colors.gutter, color: colors.foreground + '80', border: 'none' },
    '.cm-activeLine': { backgroundColor: colors.activeLine },
    '.cm-activeLineGutter': { backgroundColor: colors.activeLine },
    '&.cm-focused .cm-cursor': { borderLeftColor: colors.caret },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: colors.caret + '20' },
  })
}

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  lang: CellLang | 'markdown'
  onRun?: () => void
  readOnly?: boolean
}

export function CodeEditor({ value, onChange, lang, onRun, readOnly }: CodeEditorProps) {
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme)
  const { editor: editorColors } = useThemeColors()

  const extensions = useMemo(() => {
    const exts = [
      createEditorTheme(editorColors),
      EditorView.lineWrapping,
      lang === 'js' ? javascript() : lang === 'py' ? python() : markdown(),
    ]
    if (onRun) {
      exts.push(
        EditorView.domEventHandlers({
          keydown: (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault()
              onRun()
              return true
            }
            return false
          },
        }),
      )
    }
    return exts
  }, [editorColors, lang, onRun, resolvedTheme])

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      readOnly={readOnly}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
      className="text-sm"
    />
  )
}
