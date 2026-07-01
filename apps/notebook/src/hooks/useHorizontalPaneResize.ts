import { useCallback, useEffect, useRef, useState } from 'react'

interface UseHorizontalPaneResizeOptions {
  storageKey: string
  defaultRatio: number
  minTrailingPx: number
  minLeadingPx: number
  maxTrailingRatio: number
  enabled: boolean
}

function readStoredRatio(storageKey: string, defaultRatio: number): number {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return defaultRatio
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 && value < 1 ? value : defaultRatio
  } catch {
    return defaultRatio
  }
}

function clampRatio(
  ratio: number,
  containerWidth: number,
  minTrailingPx: number,
  minLeadingPx: number,
  maxTrailingRatio: number,
) {
  const minRatio = minTrailingPx / containerWidth
  const maxRatio = Math.min(maxTrailingRatio, (containerWidth - minLeadingPx) / containerWidth)
  return Math.min(Math.max(ratio, minRatio), maxRatio)
}

export function useHorizontalPaneResize({
  storageKey,
  defaultRatio,
  minTrailingPx,
  minLeadingPx,
  maxTrailingRatio,
  enabled,
}: UseHorizontalPaneResizeOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trailingRatioRef = useRef(readStoredRatio(storageKey, defaultRatio))
  const [trailingRatio, setTrailingRatio] = useState(() => trailingRatioRef.current)
  const [isDragging, setIsDragging] = useState(false)

  const updateTrailingRatio = useCallback((ratio: number) => {
    trailingRatioRef.current = ratio
    setTrailingRatio(ratio)
  }, [])

  const persistRatio = useCallback((ratio: number) => {
    try {
      localStorage.setItem(storageKey, String(ratio))
    } catch {
      // ignore storage errors
    }
  }, [storageKey])

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return
    event.preventDefault()
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [enabled])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !enabled) return
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const nextRatio = (rect.right - event.clientX) / rect.width
    updateTrailingRatio(clampRatio(nextRatio, rect.width, minTrailingPx, minLeadingPx, maxTrailingRatio))
  }, [enabled, isDragging, minLeadingPx, minTrailingPx, maxTrailingRatio, updateTrailingRatio])

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    persistRatio(trailingRatioRef.current)
    window.dispatchEvent(new Event('resize'))
  }, [isDragging, persistRatio])

  useEffect(() => {
    if (!isDragging) return
    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [isDragging])

  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      const width = container.clientWidth
      if (width <= 0) return
      setTrailingRatio((current) => clampRatio(current, width, minTrailingPx, minLeadingPx, maxTrailingRatio))
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [enabled, minLeadingPx, minTrailingPx, maxTrailingRatio])

  return {
    containerRef,
    trailingRatio,
    isDragging,
    trailingStyle: { width: `${trailingRatio * 100}%` } as const,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: () => setIsDragging(false),
    },
  }
}
