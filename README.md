# Trading Notebook

A browser-based, Jupyter-like notebook for technical analysis and trading experiments. 100% frontend, zero backend.

## Features

- **Dual Kernel**: JavaScript/TypeScript (default, with Wickra WASM) + Python (Pyodide)
- **514 Technical Indicators** via Wickra WASM (RSI, EMA, MACD, Bollinger Bands, ATR, etc.)
- **Interactive Charts** with Lightweight Charts (candlestick + indicator overlays)
- **Backtester** with equity curve, Sharpe ratio, max drawdown, trade log
- **Built-in Sample Data** (BTC, ETH, AAPL — daily and hourly)
- **CSV Upload** for custom OHLCV data
- **Indicator Library** — click to insert pre-built code cells
- **Offline-first** with IndexedDB persistence
- **Multi-notebook** management with import/export

## Quick Start

```bash
npm install
npm run generate-data   # Generate sample OHLCV datasets
npm run dev
```

Open http://localhost:5173

## Example (JS Kernel)

```javascript
const rsi = wickra.rsi(df.c, 14);
chart.candlestick(true);
chart.line('RSI', df.t.map((t, i) => ({ time: t, value: rsi[i] })), { pane: 'sub' });
chart.render();
```

## Architecture

- **React 18** + Vite + TypeScript + Tailwind CSS
- **TanStack Router** for routing, **TanStack Query** for data caching
- **Zustand** for notebook/cell state
- **CodeMirror 6** for code editing
- **wickra-wasm** for technical indicators
- **Pyodide** for Python kernel (pandas, numpy, matplotlib)
- **Lightweight Charts** for visualization
- **idb** for IndexedDB persistence

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl/Cmd + Enter | Run current cell |

## Security Note

The JS kernel uses `Function` constructor sandboxing. User code runs in their own browser — MVP accepts this risk. For production, migrate to Web Worker isolation.

## Python Kernel Note

Python TA uses pandas rolling calculations. For best TA performance, use the JS kernel with Wickra WASM.

## License

MIT
