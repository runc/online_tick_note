import type { CellOutputItem, DataFrame, Kernel, KernelContext, KernelResult } from '@/types'

type PyodideInstance = Awaited<ReturnType<typeof import('pyodide')['loadPyodide']>>

let pyodideInstance: PyodideInstance | null = null
let pyodideReady: Promise<PyodideInstance> | null = null

export async function loadPyodide(onProgress?: (pct: number) => void): Promise<PyodideInstance> {
  if (pyodideInstance) return pyodideInstance
  if (!pyodideReady) {
    pyodideReady = (async () => {
      const { loadPyodide: load } = await import('pyodide')
      onProgress?.(10)
      pyodideInstance = await load({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.6/full/' })
      onProgress?.(60)
      await pyodideInstance.loadPackage(['numpy', 'pandas', 'matplotlib'])
      onProgress?.(90)
      try {
        await pyodideInstance.runPythonAsync(`import micropip\nawait micropip.install('pandas-ta')`)
      } catch { /* optional */ }
      onProgress?.(100)
      return pyodideInstance
    })()
  }
  return pyodideReady
}

export class PyKernel implements Kernel {
  lang = 'py' as const
  ready: Promise<void>
  private pyodide: PyodideInstance | null = null

  constructor(onProgress?: (pct: number) => void) {
    this.ready = loadPyodide(onProgress).then((py) => { this.pyodide = py })
  }

  async setDataFrame(df: DataFrame): Promise<void> {
    await this.ready
    const py = this.pyodide!
    py.globals.set('_df_records', df.bars.map((b) => ({
      timestamp: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v,
    })))
    await py.runPythonAsync(`
import pandas as pd
df = pd.DataFrame(_df_records)
df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
df = df.set_index('timestamp')
`)
  }

  async setVar(name: string, value: unknown): Promise<void> {
    await this.ready
    this.pyodide!.globals.set(`_js_${name}`, value)
    await this.pyodide!.runPythonAsync(`${name} = _js_${name}`)
  }

  async getVar(name: string): Promise<unknown> {
    await this.ready
    return this.pyodide!.globals.get(name)
  }

  reset(): void {
    if (!this.pyodide) return
    this.pyodide.runPython(`for k in list(globals().keys()):\n    if not k.startswith('_') and k not in ('pd','np','plt'): del globals()[k]`)
  }

  async eval(code: string, ctx: KernelContext): Promise<KernelResult> {
    await this.ready
    const py = this.pyodide!
    const outputs: CellOutputItem[] = []
    await this.setDataFrame(ctx.df)
    py.globals.set('_user_code', code)

    try {
      await py.runPythonAsync(`
import sys, io
_stdout = io.StringIO()
_stderr = io.StringIO()
_old_stdout, _old_stderr = sys.stdout, sys.stderr
sys.stdout, sys.stderr = _stdout, _stderr
_error = None
try:
    exec(_user_code, globals())
except Exception as e:
    _error = str(e)
finally:
    sys.stdout, sys.stderr = _old_stdout, _old_stderr
`)
      const stdout = py.globals.get('_stdout').callMethod('getvalue') as string
      const stderr = py.globals.get('_stderr').callMethod('getvalue') as string
      const error = py.globals.get('_error') as string | null
      if (stdout) outputs.push({ type: 'text', content: stdout })
      if (stderr) outputs.push({ type: 'error', content: stderr })
      if (error) {
        outputs.push({ type: 'error', content: error })
        return { outputs, error }
      }

      try {
        const hasFig = await py.runPythonAsync(`import matplotlib.pyplot as plt\nlen(plt.get_fignums()) > 0`)
        if (hasFig) {
          const imgData = await py.runPythonAsync(`
import matplotlib.pyplot as plt, io, base64
buf = io.BytesIO()
plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
buf.seek(0)
b64 = base64.b64encode(buf.read()).decode('utf-8')
plt.close('all')
b64
`)
          outputs.push({ type: 'image', src: `data:image/png;base64,${imgData}` })
        }
      } catch { /* no figure */ }

      return { outputs }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { outputs: [{ type: 'error', content: message }], error: message }
    }
  }
}

let pyKernelInstance: PyKernel | null = null

export function getPyKernel(onProgress?: (pct: number) => void): PyKernel {
  if (!pyKernelInstance) pyKernelInstance = new PyKernel(onProgress)
  return pyKernelInstance
}

export function resetPyKernel(): void {
  pyKernelInstance = null
}
