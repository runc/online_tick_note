import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, BookOpen, Copy, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotebookStore } from '@/stores/notebook-store'
import { useTranslation } from '@/i18n'
import { APP_HEADER_BAR } from '@/lib/utils'
import type { Notebook } from '@/types'

export function NotebookListPage() {
  const { notebooks, loadNotebooks, createNotebook, deleteNotebook, duplicateNotebook, importNotebook } = useNotebookStore()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const { t, locale } = useTranslation()

  useEffect(() => {
    loadNotebooks()
  }, [loadNotebooks])

  const handleNew = () => {
    const nb = createNotebook()
    navigate({ to: '/nb/$id', params: { id: nb.id } })
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Notebook
        importNotebook(data)
      } catch {
        alert(t('list.invalidJson'))
      }
    }
    reader.readAsText(file)
  }

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')

  return (
    <div className="flex h-full flex-col">
      <div className={APP_HEADER_BAR}>
        <h1 className="text-sm font-semibold">{t('app.title')}</h1>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">{t('app.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> {t('list.import')}
          </Button>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" /> {t('nav.newNotebook')}
          </Button>
        </div>
      </div>

      {notebooks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
          <BookOpen className="h-16 w-16 opacity-30" />
          <p>{t('list.empty')}</p>
          <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" /> {t('list.createNotebook')}</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notebooks.map((nb) => (
            <Card key={nb.id} className="group cursor-pointer transition-colors hover:border-primary/50" onClick={() => navigate({ to: '/nb/$id', params: { id: nb.id } })}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {nb.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 text-xs text-muted-foreground">
                  {nb.symbol} · {nb.timeframe} · {nb.cells.length} {t('list.cells')} · {nb.kernelLang.toUpperCase()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('list.updated')} {formatDate(nb.updatedAt)}
                </div>
                <div className="mt-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-7" onClick={() => { const copy = duplicateNotebook(nb.id); if (copy) navigate({ to: '/nb/$id', params: { id: copy.id } }) }}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => deleteNotebook(nb.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
