# Trading Notebook Monorepo

Browser-based trading notebook with **easy-tdx** as a live A-share market data source.

## Structure

```
.
├── apps/notebook/       # React + Vite trading notebook (frontend)
├── packages/easy-tdx/   # Python TDX market data library + Web API
├── DEVELOPMENT_PLAN.md  # Notebook mode plan
├── AGENT_PLAN.md        # Agent mode plan
└── package.json         # npm workspaces root
```

## Quick Start

### 1. Install frontend dependencies

```bash
npm install
npm run generate-data
```

### 2. Start easy-tdx API (A-share data)

```bash
npm run dev:api
```

This syncs dependencies with [uv](https://docs.astral.sh/uv/) and serves REST API at `http://127.0.0.1:8000`.

Requires [uv](https://docs.astral.sh/uv/getting-started/installation/) installed.

API docs: http://127.0.0.1:8000/docs

### 3. Start notebook

```bash
npm run dev
```

Open http://localhost:5173

- **Notebook 模式**：`/` — 代码驱动的技术分析实验
- **Agent 模式**：`/agent` — 对话式分析（需 Settings 配置 LLM API Key）

In development, Vite proxies `/api/v1` → `http://127.0.0.1:8000`, so the notebook can use easy-tdx without CORS setup.

## Data Sources

| Source | Symbols | Notes |
|--------|---------|-------|
| **easy-tdx API** | `SH600519`, `SZ000001`, … | A-share K-lines via local `easy-tdx serve` |
| **Built-in** | `BTCUSDT`, `ETHUSDT`, `AAPL` | Static JSON in `public/datasets/` |
| **CSV upload** | User-defined | Parsed in browser |

Enable or configure easy-tdx in the sidebar **Settings** panel.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Notebook dev server |
| `npm run dev:api` | easy-tdx REST API on port 8000 (uv) |
| `npm run sync:api` | Sync easy-tdx Python deps (uv) |
| `npm run test:api` | Run easy-tdx pytest suite (uv) |
| `npm run build` | Production build |
| `npm run test` | Vitest unit tests |
| `npm run generate-data` | Regenerate sample OHLCV JSON |

## easy-tdx Package

See [packages/easy-tdx/README.md](packages/easy-tdx/README.md) for full CLI, Python API, and feature documentation.

```bash
cd packages/easy-tdx
uv sync --extra dev --extra web
uv run pytest
```

## License

MIT
