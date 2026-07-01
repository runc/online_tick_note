import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Download, Sparkles, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BUILTIN_SKILLS,
  exportCustomSkillJson,
  importCustomSkillFromFile,
  listCustomSkills,
  removeCustomSkill,
  resolveBuiltinSkill,
  resolveCustomSkill,
} from '@/agent/skills/registry'
import type { CustomSkill } from '@/agent/skills/types'
import { useTranslation } from '@/i18n'
import { useSettingsStore } from '@/stores/settings-store'

function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="text-sm font-medium text-foreground">{children}</div>
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>
}

export function SkillsMarketTab() {
  const { t } = useTranslation()
  const { defaultAgentSkillId, setDefaultAgentSkillId } = useSettingsStore()
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setCustomSkills(await listCustomSkills())
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    try {
      const text = await file.text()
      const raw = JSON.parse(text) as unknown
      await importCustomSkillFromFile(raw)
      await reload()
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err))
    }
    e.target.value = ''
  }

  const handleDelete = async (id: string) => {
    await removeCustomSkill(id)
    if (defaultAgentSkillId === id) {
      setDefaultAgentSkillId('technical-overview')
    }
    await reload()
  }

  const handleExport = (skill: CustomSkill) => {
    const blob = new Blob([exportCustomSkillJson(skill)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${skill.id}.skill.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const skillOptions = [
    ...BUILTIN_SKILLS.map((s) => ({ id: s.id, label: t(s.nameKey) })),
    ...customSkills.map((s) => ({ id: s.id, label: s.name })),
  ]

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <FieldLabel>{t('settings.defaultAgentSkill')}</FieldLabel>
        <select
          value={defaultAgentSkillId}
          onChange={(e) => setDefaultAgentSkillId(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          {skillOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <FieldHint>{t('settings.defaultAgentSkillHint')}</FieldHint>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <FieldLabel>{t('settings.skillMarketBuiltin')}</FieldLabel>
        </div>
        <div className="space-y-2">
          {BUILTIN_SKILLS.map((skill) => {
            const resolved = resolveBuiltinSkill(skill, t)
            return (
              <div key={skill.id} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{resolved.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{resolved.description}</div>
                  </div>
                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                    {t('settings.skillBuiltin')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <FieldLabel>{t('settings.skillMarketCustom')}</FieldLabel>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => void handleUpload(e)}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {t('settings.skillUpload')}
            </Button>
          </div>
        </div>
        <FieldHint>{t('settings.skillUploadHint')}</FieldHint>
        {importError && (
          <p className="text-xs text-destructive">{importError}</p>
        )}
        {customSkills.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            {t('settings.skillMarketEmpty')}
          </p>
        ) : (
          <div className="space-y-2">
            {customSkills.map((skill) => {
              const resolved = resolveCustomSkill(skill)
              return (
                <div key={skill.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{resolved.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{resolved.description}</div>
                      <div className="mt-1 font-mono text-[10px] text-muted-foreground">{skill.id}</div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleExport(skill)}
                        title={t('settings.skillExport')}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => void handleDelete(skill.id)}
                        title={t('settings.skillDelete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
