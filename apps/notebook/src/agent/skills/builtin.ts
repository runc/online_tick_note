import type { BuiltinSkillTemplate } from './types'

export const technicalOverviewSkill: BuiltinSkillTemplate = {
  id: 'technical-overview',
  source: 'builtin',
  nameKey: 'agent.skills.technical.name',
  descriptionKey: 'agent.skills.technical.description',
  instructions: `Focus on technical analysis workflow:
1. fetch_klines for the symbol
2. compute_indicators with MACD, RSI, KDJ, BOLL (or user-requested)
3. render_chart with candlestick + key indicators
4. Summarize trend, momentum, and support/resistance.`,
  activeTools: ['fetch_klines', 'compute_indicators', 'get_quote', 'render_chart', 'render_table'],
  starterPromptKeys: [
    'agent.skills.technical.prompt1',
    'agent.skills.technical.prompt2',
  ],
}

export const fundamentalSnapshotSkill: BuiltinSkillTemplate = {
  id: 'fundamental-snapshot',
  source: 'builtin',
  nameKey: 'agent.skills.fundamental.name',
  descriptionKey: 'agent.skills.fundamental.description',
  instructions: `Focus on fundamental analysis:
1. get_finance for the symbol
2. get_quote for current valuation context
3. Summarize PE/PB/ROE and key financial metrics
4. Use render_table if comparing multiple data points.`,
  activeTools: ['get_finance', 'get_quote', 'render_table', 'fetch_klines'],
  starterPromptKeys: [
    'agent.skills.fundamental.prompt1',
    'agent.skills.fundamental.prompt2',
  ],
}

export const sectorRotationSkill: BuiltinSkillTemplate = {
  id: 'sector-rotation',
  source: 'builtin',
  nameKey: 'agent.skills.sector.name',
  descriptionKey: 'agent.skills.sector.description',
  instructions: `Focus on sector / board rotation analysis:
1. board_ranking to find top gaining sectors (HY industry or GN concept)
2. Summarize leading sectors and momentum
3. Optionally fetch quotes for representative symbols if user asks.`,
  activeTools: ['board_ranking', 'get_quote', 'render_table'],
  starterPromptKeys: [
    'agent.skills.sector.prompt1',
    'agent.skills.sector.prompt2',
  ],
}

export const comparePeersSkill: BuiltinSkillTemplate = {
  id: 'compare-peers',
  source: 'builtin',
  nameKey: 'agent.skills.compare.name',
  descriptionKey: 'agent.skills.compare.description',
  instructions: `Compare multiple A-share symbols side by side:
1. Use compare_symbols with all symbols mentioned by the user (2-5 symbols)
2. Optionally compute_indicators for each if technical comparison is needed
3. Present a clear comparison table and conclusion.`,
  activeTools: ['compare_symbols', 'get_finance', 'get_quote', 'compute_indicators', 'render_table'],
  starterPromptKeys: [
    'agent.skills.compare.prompt1',
    'agent.skills.compare.prompt2',
  ],
}

export const chanlunSkill: BuiltinSkillTemplate = {
  id: 'chanlun-analysis',
  source: 'builtin',
  nameKey: 'agent.skills.chanlun.name',
  descriptionKey: 'agent.skills.chanlun.description',
  instructions: `Chanlun (缠论) analysis workflow:
1. chanlun_analyze for the symbol
2. Summarize pens, pivots, buy/sell points, and divergence signals
3. Combine with fetch_klines chart if user wants visual context.`,
  activeTools: ['chanlun_analyze', 'fetch_klines', 'render_chart'],
  starterPromptKeys: [
    'agent.skills.chanlun.prompt1',
    'agent.skills.chanlun.prompt2',
  ],
}

export const BUILTIN_SKILLS: BuiltinSkillTemplate[] = [
  technicalOverviewSkill,
  fundamentalSnapshotSkill,
  sectorRotationSkill,
  comparePeersSkill,
  chanlunSkill,
]

export const DEFAULT_SKILL_ID = technicalOverviewSkill.id
