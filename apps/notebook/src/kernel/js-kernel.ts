import type { CellOutputItem, DataFrame, Kernel, KernelContext, KernelResult } from '@/types'
import { loadWickra, createWickraAPI, createChartAPI, createTableAPI } from '@/lib/wickra-loader'

const moduleScope: Record<string, unknown> = {}

export class JsKernel implements Kernel {
  lang = 'js' as const
  ready: Promise<void>
  private wickra: ReturnType<typeof createWickraAPI> | null = null
  private df: DataFrame | null = null

  constructor() {
    this.ready = loadWickra().then((mod) => {
      this.wickra = createWickraAPI(mod)
    })
  }

  async setDataFrame(df: DataFrame): Promise<void> {
    this.df = df
    moduleScope.df = df
  }

  async setVar(name: string, value: unknown): Promise<void> {
    moduleScope[name] = value
  }

  async getVar(name: string): Promise<unknown> {
    return moduleScope[name]
  }

  reset(): void {
    for (const key of Object.keys(moduleScope)) {
      delete moduleScope[key]
    }
    if (this.df) moduleScope.df = this.df
  }

  async eval(code: string, _ctx: KernelContext): Promise<KernelResult> {
    await this.ready
    const outputs: CellOutputItem[] = []
    const logs: string[] = []

    const log = (...args: unknown[]) => {
      const msg = args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')
      logs.push(msg)
    }

    const chart = createChartAPI(outputs)
    const table = createTableAPI(outputs)
    const df = this.df ?? _ctx.df
    moduleScope.df = df

    const sandbox: Record<string, unknown> = {
      df,
      wickra: this.wickra,
      chart,
      table,
      log,
      console: { log },
      Math, Array, Object, JSON, Number, String, Boolean, Date,
      Map, Set, Promise, Float64Array, Int32Array,
      NaN, Infinity, undefined,
      ...moduleScope,
    }

    try {
      const isAsync = /\bawait\b/.test(code)
      const wrappedCode = isAsync
        ? `"use strict";\nreturn (async () => {\n${code}\n})();`
        : `"use strict";\n${code}`

      const fn = isAsync
        ? new (Object.getPrototypeOf(async function () {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>)(...Object.keys(sandbox), wrappedCode)
        : new Function(...Object.keys(sandbox), wrappedCode)

      const result = await fn(...Object.values(sandbox))

      if (logs.length > 0) outputs.unshift({ type: 'text', content: logs.join('\n') })

      if (result !== undefined && result !== null) {
        outputs.push({ type: 'text', content: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result) })
      }

      const chartSeries = chart._getSeries()
      if (chartSeries.length > 0) {
        outputs.push({ type: 'chart', candlestick: chart._getCandlestick(), series: chartSeries })
      }

      for (const [key, val] of Object.entries(sandbox)) {
        if (!['df', 'wickra', 'chart', 'table', 'log', 'console', 'Math', 'Array', 'Object', 'JSON',
          'Number', 'String', 'Boolean', 'Date', 'Map', 'Set', 'Promise', 'Float64Array',
          'Int32Array', 'NaN', 'Infinity', 'undefined'].includes(key) && typeof val !== 'function') {
          moduleScope[key] = val
        }
      }

      return { outputs }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined
      return {
        outputs: [
          ...(logs.length > 0 ? [{ type: 'text' as const, content: logs.join('\n') }] : []),
          { type: 'error', content: stack ?? message },
        ],
        error: message,
      }
    }
  }
}

let jsKernelInstance: JsKernel | null = null

export function getJsKernel(): JsKernel {
  if (!jsKernelInstance) jsKernelInstance = new JsKernel()
  return jsKernelInstance
}
