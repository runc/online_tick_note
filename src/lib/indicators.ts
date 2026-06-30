export interface IndicatorDef {
  id: string
  name: string
  category: 'trend' | 'oscillator' | 'volatility' | 'volume' | 'pattern'
  description: string
  params: { name: string; default: number; description: string }[]
  jsTemplate: (params: Record<string, number>) => string
  pyTemplate: (params: Record<string, number>) => string
}

export const INDICATORS: IndicatorDef[] = [
  {
    id: 'rsi', name: 'RSI', category: 'oscillator',
    description: 'Relative Strength Index - measures momentum on a 0-100 scale',
    params: [{ name: 'period', default: 14, description: 'Lookback period' }],
    jsTemplate: (p) => `const rsi = wickra.rsi(df.c, ${p.period});
chart.line('RSI', df.t.map((t, i) => ({ time: t, value: rsi[i] })), { pane: 'sub', color: '#f59e0b' });
chart.candlestick(true);
chart.render();`,
    pyTemplate: (p) => `delta = df['close'].diff()
gain = delta.where(delta > 0, 0).rolling(${p.period}).mean()
loss = (-delta.where(delta < 0, 0)).rolling(${p.period}).mean()
df['rsi'] = 100 - (100 / (1 + gain / loss))
print(df['rsi'].tail())`,
  },
  {
    id: 'ema', name: 'EMA', category: 'trend',
    description: 'Exponential Moving Average - weighted moving average',
    params: [{ name: 'period', default: 20, description: 'Lookback period' }],
    jsTemplate: (p) => `const ema = wickra.ema(df.c, ${p.period});
chart.candlestick(true);
chart.line('EMA(${p.period})', df.t.map((t, i) => ({ time: t, value: ema[i] })), { color: '#3b82f6' });
chart.render();`,
    pyTemplate: (p) => `df['ema_${p.period}'] = df['close'].ewm(span=${p.period}).mean()
print(df['ema_${p.period}'].tail())`,
  },
  {
    id: 'sma', name: 'SMA', category: 'trend',
    description: 'Simple Moving Average',
    params: [{ name: 'period', default: 20, description: 'Lookback period' }],
    jsTemplate: (p) => `const sma = wickra.sma(df.c, ${p.period});
chart.candlestick(true);
chart.line('SMA(${p.period})', df.t.map((t, i) => ({ time: t, value: sma[i] })), { color: '#8b5cf6' });
chart.render();`,
    pyTemplate: (p) => `df['sma_${p.period}'] = df['close'].rolling(${p.period}).mean()
print(df['sma_${p.period}'].tail())`,
  },
  {
    id: 'macd', name: 'MACD', category: 'trend',
    description: 'Moving Average Convergence Divergence',
    params: [
      { name: 'fast', default: 12, description: 'Fast period' },
      { name: 'slow', default: 26, description: 'Slow period' },
      { name: 'signal', default: 9, description: 'Signal period' },
    ],
    jsTemplate: (p) => `const { macd, signal, histogram } = wickra.macd(df.c, ${p.fast}, ${p.slow}, ${p.signal});
chart.candlestick(true);
chart.render();
chart.line('MACD', df.t.map((t, i) => ({ time: t, value: macd[i] })), { pane: 'sub', color: '#3b82f6' });
chart.line('Signal', df.t.map((t, i) => ({ time: t, value: signal[i] })), { pane: 'sub', color: '#f59e0b' });
chart.histogram('Histogram', histogram, { pane: 'sub' });
chart.render();`,
    pyTemplate: (p) => `ema_fast = df['close'].ewm(span=${p.fast}).mean()
ema_slow = df['close'].ewm(span=${p.slow}).mean()
df['macd'] = ema_fast - ema_slow
df['macd_signal'] = df['macd'].ewm(span=${p.signal}).mean()
df['macd_hist'] = df['macd'] - df['macd_signal']
print(df[['macd','macd_signal','macd_hist']].tail())`,
  },
  {
    id: 'bollinger', name: 'Bollinger Bands', category: 'volatility',
    description: 'Volatility bands around a moving average',
    params: [
      { name: 'period', default: 20, description: 'Lookback period' },
      { name: 'stddev', default: 2, description: 'Standard deviations' },
    ],
    jsTemplate: (p) => `const { upper, middle, lower } = wickra.bollinger(df.c, ${p.period}, ${p.stddev});
chart.candlestick(true);
chart.line('BB Upper', df.t.map((t, i) => ({ time: t, value: upper[i] })), { color: '#ef4444' });
chart.line('BB Middle', df.t.map((t, i) => ({ time: t, value: middle[i] })), { color: '#6b7280' });
chart.line('BB Lower', df.t.map((t, i) => ({ time: t, value: lower[i] })), { color: '#22c55e' });
chart.render();`,
    pyTemplate: (p) => `df['bb_mid'] = df['close'].rolling(${p.period}).mean()
df['bb_std'] = df['close'].rolling(${p.period}).std()
df['bb_upper'] = df['bb_mid'] + ${p.stddev} * df['bb_std']
df['bb_lower'] = df['bb_mid'] - ${p.stddev} * df['bb_std']
print(df[['bb_upper','bb_mid','bb_lower']].tail())`,
  },
  {
    id: 'atr', name: 'ATR', category: 'volatility',
    description: 'Average True Range - measures market volatility',
    params: [{ name: 'period', default: 14, description: 'Lookback period' }],
    jsTemplate: (p) => `const atr = wickra.atr(df.h, df.l, df.c, ${p.period});
chart.line('ATR', df.t.map((t, i) => ({ time: t, value: atr[i] })), { pane: 'sub', color: '#8b5cf6' });
chart.render();`,
    pyTemplate: (p) => `tr = pd.concat([df['high']-df['low'], (df['high']-df['close'].shift()).abs(), (df['low']-df['close'].shift()).abs()], axis=1).max(axis=1)
df['atr'] = tr.rolling(${p.period}).mean()
print(df['atr'].tail())`,
  },
  {
    id: 'ma_cross', name: 'MA Cross Strategy', category: 'pattern',
    description: 'Simple moving average crossover strategy template',
    params: [
      { name: 'fast', default: 10, description: 'Fast MA period' },
      { name: 'slow', default: 30, description: 'Slow MA period' },
    ],
    jsTemplate: (p) => `const fastMA = wickra.ema(df.c, ${p.fast});
const slowMA = wickra.ema(df.c, ${p.slow});
const signal = fastMA.map((f, i) => f > slowMA[i] ? 1 : f < slowMA[i] ? -1 : 0);
// Store signal for backtest cell
signal_col = signal;
chart.candlestick(true);
chart.line('Fast EMA', df.t.map((t, i) => ({ time: t, value: fastMA[i] })), { color: '#22c55e' });
chart.line('Slow EMA', df.t.map((t, i) => ({ time: t, value: slowMA[i] })), { color: '#ef4444' });
chart.render();
log('Signal array ready. Add a backtest cell with signalColumn: "signal"');`,
    pyTemplate: (p) => `df['fast_ema'] = df['close'].ewm(span=${p.fast}).mean()
df['slow_ema'] = df['close'].ewm(span=${p.slow}).mean()
df['signal'] = 0
df.loc[df['fast_ema'] > df['slow_ema'], 'signal'] = 1
df.loc[df['fast_ema'] < df['slow_ema'], 'signal'] = -1
print(df[['close','fast_ema','slow_ema','signal']].tail())`,
  },
]

export const INDICATOR_CATEGORIES = [
  { id: 'trend', label: 'Trend' },
  { id: 'oscillator', label: 'Oscillator' },
  { id: 'volatility', label: 'Volatility' },
  { id: 'volume', label: 'Volume' },
  { id: 'pattern', label: 'Pattern' },
] as const
