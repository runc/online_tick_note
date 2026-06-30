export const en = {
  app: {
    name: 'Tick Note',
    title: 'Trading Notebook',
    subtitle: 'Browser-based technical analysis notebook',
  },
  nav: {
    newNotebook: 'New Notebook',
    notebooks: 'Notebooks',
    noNotebooks: 'No notebooks yet',
  },
  list: {
    import: 'Import',
    createNotebook: 'Create Notebook',
    empty: 'No notebooks yet. Create one to get started.',
    cells: 'cells',
    updated: 'Updated',
    invalidJson: 'Invalid notebook JSON',
    copySuffix: '(copy)',
  },
  editor: {
    loading: 'Loading...',
    loadingData: 'Loading data...',
    bars: 'bars',
    csv: 'CSV',
    saved: 'Saved',
    runAll: 'Run All',
    code: 'Code',
    markdown: 'Markdown',
    chart: 'Chart',
    backtest: 'Backtest',
    hideIndicators: 'Hide Indicators',
    showIndicators: 'Show Indicators',
    loadingPyodide: 'Loading Pyodide (~10MB)...',
    csvParseError: 'CSV parse error',
    untitled: 'Untitled Notebook',
  },
  cell: {
    insertBelow: 'Insert below',
    moveUp: 'Move up',
    moveDown: 'Move down',
    delete: 'Delete',
    types: {
      code: 'code',
      markdown: 'markdown',
      chart: 'chart',
      backtest: 'backtest',
    },
  },
  indicators: {
    title: 'Indicators',
    insertCell: 'Insert cell',
    categories: {
      trend: 'Trend',
      oscillator: 'Oscillator',
      volatility: 'Volatility',
      volume: 'Volume',
      pattern: 'Pattern',
    },
    rsi: {
      name: 'RSI',
      description: 'Relative Strength Index — measures momentum on a 0–100 scale',
    },
    ema: {
      name: 'EMA',
      description: 'Exponential Moving Average — weighted moving average',
    },
    sma: {
      name: 'SMA',
      description: 'Simple Moving Average',
    },
    macd: {
      name: 'MACD',
      description: 'Moving Average Convergence Divergence',
    },
    bollinger: {
      name: 'Bollinger Bands',
      description: 'Volatility bands around a moving average',
    },
    atr: {
      name: 'ATR',
      description: 'Average True Range — measures market volatility',
    },
    ma_cross: {
      name: 'MA Cross Strategy',
      description: 'Simple moving average crossover strategy template',
    },
  },
  settings: {
    theme: 'Theme',
    language: 'Language',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeSystem: 'System',
  },
  error: {
    title: 'Something went wrong',
    tryAgain: 'Try again',
  },
  metrics: {
    totalReturn: 'Total Return',
    benchmarkReturn: 'Benchmark Return',
    sharpeRatio: 'Sharpe Ratio',
    maxDrawdown: 'Max Drawdown',
    winRate: 'Win Rate',
    profitFactor: 'Profit Factor',
    totalTrades: 'Total Trades',
    finalValue: 'Final Value',
    entry: 'Entry',
    exit: 'Exit',
    side: 'Side',
    pnl: 'PnL',
    pnlPct: 'PnL%',
    long: 'long',
    short: 'short',
  },
  defaultCell: {
    js: '// df is available as OHLCV DataFrame\n// wickra, chart, table, log are injected\nlog("Ready! df has", df.length, "bars")',
    py: '# df is a pandas DataFrame\nprint(f"Ready! df has {len(df)} bars")',
    markdown: '# Markdown',
  },
} as const

type DeepString<T> = T extends object ? { [K in keyof T]: DeepString<T[K]> } : string

export type TranslationKey = DeepString<typeof en>
