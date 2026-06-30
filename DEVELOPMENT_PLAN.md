# Trading Notebook 开发计划

## 一、目标与边界

**产品形态**：纯浏览器、类 Jupyter 的 cell notebook，针对单只/多只标的做技术分析与实验。

**核心约束**：
- 100% 前端，零后端
- 计算双后端：JS/TS（默认）+ Python（Pyodide，power user 模式）
- 离线可用（IndexedDB 持久化）
- 交互偏简单，重分析能力

**不做（MVP 范围外）**：实时 streaming、多用户协作、云端同步、订单执行。

---

## 二、架构总览

```
┌─────────────────────────────────────────────────────┐
│                  React UI Layer                      │
│  (shadcn/ui, CodeMirror, Lightweight Charts)        │
├─────────────────────────────────────────────────────┤
│            Notebook Runtime (核心)                   │
│  ┌───────────┐  ┌────────────┐  ┌──────────────┐   │
│  │ Cell Mgr  │  │ Kernel Abstr│  │ Output Render│   │
│  └───────────┘  └────────────┘  └──────────────┘   │
├─────────────────────────────────────────────────────┤
│            Kernel Adapter Layer (双后端)             │
│  ┌──────────────────┐  ┌────────────────────────┐  │
│  │ JS/TS Kernel     │  │ Pyodide Kernel         │  │
│  │ + Wickra WASM    │  │ (+ ferro-ta 尝试加载)  │  │
│  └──────────────────┘  └────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│              Data Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ 内置样本 │  │ CSV上传  │  │ IndexedDB持久化  │ │
│  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**关键抽象：Kernel Adapter**

```ts
interface Kernel {
  lang: 'js' | 'py'
  ready: Promise<void>
  eval(code: string, ctx: KernelContext): Promise<KernelResult>
  setVar(name: string, value: unknown): Promise<void>
  getVar(name: string): Promise<unknown>
}
```

无论用户切到 JS 还是 Python，上层 UI 和 cell runtime 不变。`df` 在两个 kernel 里都是 OHLCV DataFrame（JS 端是 `{open,high,low,close,volume,...}[]`，Python 端是 pandas DataFrame）。

---

## 三、技术栈（确认版）

| 层 | 选型 | 备注 |
|---|---|---|
| 构建 | Vite + React 18 + TS | |
| 路由 | TanStack Router | notebook 列表 / 编辑 |
| 数据 | TanStack Query | 缓存内置数据集、后续接 API |
| 表格 | TanStack Table | OHLCV、回测明细 |
| UI | shadcn/ui + Tailwind | |
| 状态 | Zustand | cells / kernel / 当前 notebook |
| 编辑器 | CodeMirror 6 | 比 Monaco 轻，Pyodide 友好 |
| 计算JS | Wickra WASM | 514 指标，streaming-ready |
| 计算Py | Pyodide | pandas/numpy，懒加载 |
| 图表 | Lightweight Charts | K线 + 指标叠加 |
| 持久化 | idb (IndexedDB) | notebook + dataset |
| 测试 | Vitest + Playwright | 关键路径 |

---

## 四、迭代计划（共 7 个阶段）

### **Phase 0 — 骨架与脚手架**（预计 0.5 天）

**目标**：能 `npm run dev` 跑起来一个空壳。

- [ ] Vite + React + TS + Tailwind 初始化
- [ ] shadcn/ui 初始化（Button, Card, Tabs, Dialog, Select）
- [ ] TanStack Router 路由：`/` (notebook 列表) / `/nb/:id` (编辑)
- [ ] Zustand store 骨架（notebooks, currentNotebook, cells）
- [ ] 基础布局：左侧 notebook 列表 + 顶栏 + 主编辑区

**交付**：空 UI 框架，路由可跳转。

---

### **Phase 1 — 数据层（先内置）**（预计 1 天）

**目标**：notebook 能拿到一个 OHLCV `df`。

- [ ] 内置样本数据集（3-5 只标的，日线/分钟线各一份，打包成 JSON 或 Parquet）
  - 来源建议：用 `yfinance` 或 Binance 历史 K 线导出，存仓库 `public/datasets/`
- [ ] DatasetRegistry：列出可用数据集，按 symbol + timeframe 索引
- [ ] CSV 上传：拖拽解析 OHLCV（支持常见列名 open/high/low/close/volume/timestamp）
- [ ] TanStack Query 包装：`useDataset(symbol, timeframe)` → 缓存 + IndexedDB 落地
- [ ] **数据契约定义**：
  ```ts
  interface Bar { t: number; o: number; h: number; l: number; c: number; v: number }
  type Dataset = { symbol: string; timeframe: string; bars: Bar[]; meta: {...} }
  ```
- [ ] Notebook 绑定 symbol + timeframe（顶栏 Select）

**交付**：每个 notebook 顶部选数据源，下方 cell 能拿到 `df`。

---

### **Phase 2 — JS Kernel + Cell Runtime**（预计 2 天，核心阶段）

**目标**：能写 JS cell，跑 Wickra，画图。

- [ ] **Cell 数据模型**：
  ```ts
  interface Cell {
    id: string
    type: 'code' | 'markdown' | 'chart'
    lang: 'js' | 'py'
    source: string
    output?: CellOutput
    status: 'idle' | 'running' | 'error' | 'done'
  }
  ```
- [ ] Cell 列表 UI：增删、上下移动、折叠、运行单 cell、运行全部、运行到此处
- [ ] CodeMirror 6 集成（JS 高亮 + 行号 + 快捷键 Ctrl+Enter 运行）
- [ ] **JS Kernel 实现**（用 `Function` 构造 + AsyncFunction，注意沙箱）：
  - 全局注入：`df`, `wickra`, `chart`, `table`, `log`
  - 变量在 notebook 内跨 cell 持久（一个 module-scope 对象）
  - 错误捕获 + 堆栈渲染
- [ ] **Wickra WASM 集成**：lazy load，`importValue` 加载 `.wasm`，封装成 `wickra.*` API
- [ ] Output 渲染器：
  - 文本（stdout / log）
  - 错误（红色 + 行号）
  - 表格（TanStack Table）
  - 图表（Lightweight Charts，支持 K 线 + 多指标叠加 + 副图）
- [ ] Chart cell：独立 cell 类型，配置式声明 `df + 指标列表`，自动渲染

**交付**：能写出 `const rsi = wickra.rsi(df.c, 14); chart.line(rsi)` 并看到图。

**沙箱安全提示**：纯前端用户自己的代码，但 `Function` 沙箱仍有逃逸风险（如访问 window）。MVP 接受这个风险（用户自己跑自己的代码），文档里标注。后续可上 Web Worker 隔离 + iframe sandbox。

---

### **Phase 3 — Pyodide Kernel**（预计 1.5 天）

**目标**：同一份 notebook 能切到 Python，pandas 可用。

- [ ] Pyodide lazy load（首次切到 py 时下载，IndexedDB 缓存 wasm）
- [ ] 启动 loading UI：进度条 + 「首次加载约 10MB」提示
- [ ] **Pyodide Kernel 实现**：
  - 注入 `df` 为 pandas DataFrame（从 JS Bar[] 转）
  - 预装：`numpy, pandas`（`micropip` 按需）
  - 尝试 `micropip.install('ferro-ta')`——预期失败（无 wasm32 wheel），失败则 fallback 到 `pandas-ta` 或纯 numpy 实现，UI 给提示
  - 变量在 Python 全局命名空间持久
- [ ] Kernel 切换器：notebook 顶栏切 `JS / Python`，切换时**清空变量上下文**（两套命名空间不互通，避免混淆）
- [ ] Python 输出捕获：stdout / stderr / matplotlib figure / repr
- [ ] matplotlib 渲染支持（Pyodide 自带，figure → canvas → img）

**交付**：notebook 切到 Python，写 `df['rsi'] = df['close'].rolling(14)...` 能跑能画。

**风险**：ferro-ta 大概率装不上，需要明确 fallback 策略——MVP 阶段 Python 端就用 `pandas-ta`（纯 Python，性能差但能跑），并在 README 标注「Python kernel 暂用 pandas-ta，TA 性能请优先用 JS kernel + Wickra」。

---

### **Phase 4 — 指标库与代码片段**（预计 1 天）

**目标**：降低使用门槛，点一下就能加指标。

- [ ] 指标侧栏：按分类列出 Wickra 常用指标（趋势/震荡/波动/成交量/形态）
- [ ] 每个指标卡片：名称 + 简介 + 参数表 + 「插入 cell」按钮
- [ ] 点击插入：自动生成带默认参数的代码模板（JS/Python 双版本），插入到当前 cell 下方
- [ ] 常用模板：叠加均线、画 RSI 副图、布林带、MACD 柱
- [ ] 模板可编辑、可保存为「我的片段」（IndexedDB）

**交付**：左侧点 RSI，右侧自动出现可运行的 RSI cell。

---

### **Phase 5 — 回测器**（预计 1.5 天）

**目标**：信号 → 净值 + 关键指标。

- [ ] **Backtest cell**：独立 cell 类型，输入：
  - 信号数组（与 df 等长，`{1: 多, -1: 空, 0: 空}`）
  - 手续费率、滑点、初始资金
- [ ] 计算引擎（TS 实现，先 batch）：
  - 持仓轨迹、净值曲线、收益率
  - 夏普、最大回撤、胜率、盈亏比、交易次数
- [ ] 输出：净值曲线图（Lightweight Charts）+ 指标卡片网格 + 交易明细表
- [ ] 内置 benchmark 对比（买入持有）

**交付**：写完策略 cell，接一个 backtest cell，看到净值和绩效。

---

### **Phase 6 — 持久化与多 Notebook**（预计 1 天）

**目标**：刷新不丢，能管理多个 notebook。

- [ ] IndexedDB schema：`notebooks`, `datasets_cache`, `snippets`
- [ ] 自动保存（debounce 500ms）+ 手动保存按钮 + 最后保存时间显示
- [ ] Notebook 列表页：新建/重命名/复制/删除/导出 JSON
- [ ] 导入 notebook JSON
- [ ] 导出为静态 HTML（含输出，可分享）——可选，放 P1

**交付**：建立多个 notebook，关闭浏览器再开还在。

---

### **Phase 7 — 打磨与扩展接口**（预计 1 天）

**目标**：为后续接行情 API 和 streaming 预留扩展点。

- [ ] **DataSource 抽象**：
  ```ts
  interface DataSource {
    listSymbols(): Promise<SymbolInfo[]>
    fetchBars(symbol, timeframe, range): Promise<Bar[]>
  }
  ```
  内置 `BuiltinDataSource` 和 `CsvDataSource`，预留 `HttpDataSource`（后续填 API key）
- [ ] **Streaming 接口预留**：Wickra 已支持 streaming，定义 `StreamingKernel` 接口但 MVP 不实现
- [ ] 错误边界、loading 态、空态、键盘快捷键汇总
- [ ] 性能：CodeMirror 大 cell 优化、图表数据虚拟化、Pyodide worker 化（迁移到 Web Worker 避免 UI 卡顿）
- [ ] README + 使用示例 notebook

---

## 五、里程碑与时间盒

| 阶段 | 工作量 | 累计 | 可演示能力 |
|---|---|---|---|
| P0 骨架 | 0.5d | 0.5d | 空 UI |
| P1 数据层 | 1d | 1.5d | 选数据源 |
| P2 JS Kernel | 2d | 3.5d | **跑 JS + Wickra + 画图**（第一个可玩版本） |
| P3 Pyodide | 1.5d | 5d | 双语言切换 |
| P4 指标库 | 1d | 6d | 点选加指标 |
| P5 回测 | 1.5d | 7.5d | 信号→净值 |
| P6 持久化 | 1d | 8.5d | 多 notebook 管理 |
| P7 打磨 | 1d | 9.5d | 扩展就绪 |

**第一个"可玩"里程碑 = P2 结束（约 3.5 天）**，这时已经能写 JS、调 Wickra、画 K 线。

---

## 六、关键风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| Wickra WASM 包体积/加载 | 首屏慢 | lazy load + IndexedDB 缓存 wasm |
| ferro-ta 装不上 Pyodide | Python TA 性能差 | fallback 到 pandas-ta，文档标注，TA 任务引导用户用 JS |
| Pyodide 在主线程卡 UI | 体验差 | P7 迁 Web Worker |
| `Function` 沙箱逃逸 | 用户代码访问全局 | MVP 接受（自跑自代码），P7 上 Worker/iframe |
| 内置样本数据合规 | 法律风险 | 用公开历史数据（Binance/yfinance），不打包实时行情 |
| Lightweight Charts 多指标叠加复杂 | UI 难做 | 限制 MVP 只支持主图叠加 + 一个副图 |

---

## 七、待确认事项（启动 P0 前需要拍板）

1. **指标库范围**：MVP 先支持 Wickra 哪些指标？建议先 20-30 个常用（MA/EMA/MACD/RSI/KDJ/Boll/ATR/OBV/ADX...）。
2. **Python kernel 节奏**：放进 MVP 还是延后？延后可在 3.5 天出第一个可玩版本。
3. **内置数据来源**：自备样本数据，还是从 Binance/yfinance 拉取？市场偏好（A股/美股/加密）？
4. **回测粒度**：MVP 回测要不要支持做空？还是先只做多？
