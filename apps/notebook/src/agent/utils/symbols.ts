export function extractSymbols(text: string): string[] {
  const matches = text.match(/\b(SH|SZ|BJ)\d{6}\b/gi)
  if (!matches) return []
  return [...new Set(matches.map((s) => s.toUpperCase()))]
}

export function extractPrimarySymbol(text: string): string | undefined {
  return extractSymbols(text)[0]
}
