import { Moon, Sun, Monitor, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useSettingsStore, type Theme } from '@/stores/settings-store'
import { useTranslation } from '@/i18n'
import { cn } from '@/lib/utils'

const THEME_OPTIONS: { value: Theme; icon: typeof Sun; labelKey: 'settings.themeDark' | 'settings.themeLight' | 'settings.themeSystem' }[] = [
  { value: 'dark', icon: Moon, labelKey: 'settings.themeDark' },
  { value: 'light', icon: Sun, labelKey: 'settings.themeLight' },
  { value: 'system', icon: Monitor, labelKey: 'settings.themeSystem' },
]

export function AppSettings() {
  const { theme, locale, setTheme, setLocale } = useSettingsStore()
  const { t } = useTranslation()

  return (
    <div className="border-t border-border p-3 space-y-3">
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sun className="h-3 w-3" />
          {t('settings.theme')}
        </label>
        <div className="flex gap-1">
          {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
            <Button
              key={value}
              variant={theme === value ? 'default' : 'outline'}
              size="sm"
              className={cn('h-7 flex-1 text-xs px-1 gap-1')}
              onClick={() => setTheme(value)}
              title={t(labelKey)}
            >
              <Icon className="h-3 w-3" />
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Languages className="h-3 w-3" />
          {t('settings.language')}
        </label>
        <Select
          value={locale}
          onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
          className="h-8 text-xs"
        >
          <option value="en">English</option>
          <option value="zh">中文</option>
        </Select>
      </div>
    </div>
  )
}
