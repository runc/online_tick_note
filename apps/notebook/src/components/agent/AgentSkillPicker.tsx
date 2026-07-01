import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Select } from '@/components/ui/select'
import {
  BUILTIN_SKILLS,
  listCustomSkills,
} from '@/agent/skills/registry'
import { useTranslation } from '@/i18n'

interface AgentSkillPickerProps {
  value: string | undefined
  onChange: (skillId: string) => void
  disabled?: boolean
}

export function AgentSkillPicker({ value, onChange, disabled }: AgentSkillPickerProps) {
  const { t, locale } = useTranslation()
  const [options, setOptions] = useState<{ id: string; label: string }[]>([])

  useEffect(() => {
    void (async () => {
      const custom = await listCustomSkills()
      setOptions([
        ...BUILTIN_SKILLS.map((s) => ({ id: s.id, label: t(s.nameKey) })),
        ...custom.map((s) => ({ id: s.id, label: s.name })),
      ])
    })()
  }, [locale])

  return (
    <div className="flex items-center gap-2">
      <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
      <Select
        value={value ?? 'technical-overview'}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-8 max-w-[200px] text-xs"
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </Select>
    </div>
  )
}
