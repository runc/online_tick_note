import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { createTranslator } from '@/i18n'
import { useSettingsStore } from '@/stores/settings-store'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      const locale = useSettingsStore.getState().locale
      const t = createTranslator(locale)
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <h2 className="text-lg font-semibold text-destructive">{t('error.title')}</h2>
          <pre className="max-w-lg overflow-auto rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {this.state.error?.message}
          </pre>
          <Button onClick={() => this.setState({ hasError: false, error: undefined })}>
            {t('error.tryAgain')}
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
