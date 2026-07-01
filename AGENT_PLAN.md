# Agent 模式开发计划

> 与 [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md) 并列。Notebook 与 Agent 是两种独立产品模式。

## 一、目标与边界

**产品形态**：纯浏览器 Agent 对话，通过自然语言对 A 股等标的做技术面/基本面分析。

**核心约束**：
- 100% 前端 Agent loop（Vercel AI SDK 7.0 `ToolLoopAgent`）
- LLM 由用户在 Settings 配置 Provider + Model + API Key（仅存 localStorage）
- 数据与计算复用 easy-tdx REST API + 现有图表/表格渲染器
- 会话持久化 IndexedDB

**与 Notebook 关系**：
- **独立入口**：`/agent` 会话列表，`/agent/:id` 对话页
- 共享：Settings、easy-tdx 数据源、OutputRenderer（chart/table/metrics）
- Phase B 可选：Agent → Notebook 导出

**不做（MVP）**：多 Agent 协作、自定义 Skill 文件、Kernel 代码执行、云端同步。

---

## 二、架构

```
┌─────────────────────────────────────────────────────┐
│  React UI — AgentListPage / AgentChatPage           │
├─────────────────────────────────────────────────────┤
│  useAgentChat → ToolLoopAgent.stream()              │
├─────────────────────────────────────────────────────┤
│  Tool Registry (browser execute)                    │
│  fetch_klines · get_quote · compute_indicators      │
│  get_finance · render_chart · render_table          │
├─────────────────────────────────────────────────────┤
│  easy-tdx API (local)  │  Lightweight Charts        │
└─────────────────────────────────────────────────────┘
         ↑                          ↑
    User LLM API Key (browser → provider)
```

---

## 三、路由与导航

| 路径 | 页面 | 模式 |
|------|------|------|
| `/` | Notebook 列表 | Notebook |
| `/nb/:id` | Notebook 编辑器 | Notebook |
| `/agent` | Agent 会话列表 | Agent |
| `/agent/:id` | Agent 对话 | Agent |

侧边栏顶部 **Agent / Notebook** 模式切换；列表区随模式变化。

---

## 四、Settings — title

| 字段 | 说明 |
|------|------|
| `agent.provider` | openai / anthropic / deepseek / google / openrouter / custom |
| `agent.model` | 模型 ID |
| `agent.apiKey` | API Key（localStorage） |
| `agent.baseURL` | 可选，OpenAI 兼容端点 |

新建会话标题固定 **「新对话」**，不自动摘要；用户可 inline 重命名。

---

## 五、数据模型

```ts
interface AgentSession {
  id: string
  title: string              // 默认「新对话」
  symbol?: string
  skillId?: string
  messages: AgentMessage[]
  artifacts: AgentArtifact[]
  createdAt: number
  updatedAt: number
}

interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: { id: string; toolName: string; input: unknown }[]
  toolResults?: { toolCallId: string; toolName: string; output: unknown }[]
}

interface AgentArtifact {
  id: string
  messageId: string
  output: CellOutputItem     // 复用 Notebook 输出类型
}
```

IndexedDB：`agent_sessions`（DB version 2）。

---

## 六、Tool 清单

### Phase A（MVP）

| Tool | 说明 |
|------|------|
| `fetch_klines` | 拉 K 线，返回摘要 + chart artifact |
| `get_quote` | 实时报价 |
| `compute_indicators` | easy-tdx 指标计算 |
| `get_finance` | 财务数据 |
| `render_chart` | 渲染 K 线/指标图 |
| `render_table` | 渲染表格 |

### Phase B

| Tool | 说明 |
|------|------|
| `board_ranking` | 板块排行 |
| `chanlun_analyze` | 缠论分析 |
| `run_backtest` | 回测 |

---

## 七、Skill（Phase A）

| Skill | activeTools |
|-------|-------------|
| `technical-overview` | fetch_klines, compute_indicators, render_chart |

Starter prompts：
- 帮我看看 {symbol} 最近的技术面
- 分析一下 MACD 和 RSI 状态

---

## 八、迭代计划

### Phase A — MVP（当前实施）

- [x] AGENT_PLAN.md
- [x] 依赖：`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `zod`
- [x] Settings：Provider + Model + API Key + 测试连接
- [x] 路由 `/agent`, `/agent/:id`
- [x] 侧边栏模式切换
- [x] ToolLoopAgent + 6 core tools
- [x] useAgentChat + 流式 UI
- [x] Artifact 渲染（复用 OutputRenderer）
- [x] IndexedDB 会话持久化
- [x] 固定「新对话」标题

### Phase B — 增强（当前实施）

- [x] 更多 Skill（基本面、板块、对比、缠论）
- [x] Skill 市场（Settings → Skills Tab：内置 + 上传/导出/删除）
- [x] 对话页 Skill 选择器 + 默认 Skill 配置
- [x] 多标的对话（symbols 解析 + compare_symbols tool）
- [x] Phase B tools：`board_ranking`, `chanlun_analyze`, `compare_symbols`
- [ ] 导出为 Notebook（暂缓）
- [x] Tool call 折叠/展开（Phase A 已有 ToolCallCard）

### Phase C — 高级

- [x] 自定义 Skill（Phase B：JSON 上传/导出，见 Settings → Skills）
- [ ] run_kernel_code + 审批
- [ ] 长对话 summarization

---

## 九、依赖

```json
{
  "ai": "^7.0.0",
  "@ai-sdk/openai": "^2.0.0",
  "@ai-sdk/anthropic": "^2.0.0",
  "@ai-sdk/google": "^2.0.0",
  "zod": "^3.24.0"
}
```

DeepSeek / OpenRouter / Custom 通过 `@ai-sdk/openai` + `baseURL` 接入。

---

## 十、关键文件

```
apps/notebook/src/
├── agent/
│   ├── create-agent.ts
│   ├── resolve-model.ts
│   ├── system-prompt.ts
│   ├── agent-api.ts
│   ├── tools/
│   ├── skills/
│   └── types.ts
├── hooks/useAgentChat.ts
├── stores/agent-store.ts
├── pages/AgentListPage.tsx
├── pages/AgentChatPage.tsx
└── components/agent/
```
