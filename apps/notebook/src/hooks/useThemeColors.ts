import { useSettingsStore } from '@/stores/settings-store'

export function useThemeColors() {
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme)
  const isDark = resolvedTheme === 'dark'

  const getCssVar = (name: string, fallback: string) => {
    if (typeof document === 'undefined') return fallback
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
  }

  return {
    isDark,
    chart: {
      background: getCssVar('--color-chart-bg', isDark ? '#18181f' : '#ffffff'),
      text: getCssVar('--color-chart-text', isDark ? '#a1a1aa' : '#71717a'),
      grid: getCssVar('--color-chart-grid', isDark ? '#2e2e38' : '#e4e4e7'),
    },
    editor: {
      background: getCssVar('--color-editor-bg', isDark ? '#0f0f14' : '#ffffff'),
      gutter: getCssVar('--color-editor-gutter', isDark ? '#18181f' : '#f4f4f5'),
      activeLine: getCssVar('--color-editor-active', isDark ? '#1a1a24' : '#f0fdf4'),
      foreground: getCssVar('--color-foreground', isDark ? '#e4e4e7' : '#18181f'),
      caret: getCssVar('--color-primary', '#22c55e'),
    },
  }
}
